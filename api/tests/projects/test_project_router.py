"""Project router integration tests (real Postgres + ASGI)."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import NullPool

from core.config import settings
from core.database import get_async_session
from core.exceptions import register_exception_handlers
from domains.auth.models import Role, User, user_roles
from domains.auth.security import get_current_user
from domains.projects.models import Project
from domains.projects.router import router

pytestmark = pytest.mark.integration


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(settings.async_database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


def _build_app(
    session_factory: async_sessionmaker[AsyncSession], current_user: User | None
) -> FastAPI:
    application = FastAPI()
    register_exception_handlers(application)
    application.include_router(router, prefix="/api/v1")

    async def _override_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    application.dependency_overrides[get_async_session] = _override_session
    if current_user is not None:
        application.dependency_overrides[get_current_user] = lambda: current_user
    return application


def _client(app: FastAPI) -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")


@pytest.fixture
async def created_user_ids(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[str]]:
    ids: list[str] = []
    yield ids
    async with session_factory() as session:
        for uid in ids:
            await session.execute(delete(user_roles).where(user_roles.c.user_id == uid))
            await session.execute(delete(User).where(User.id == uid))
        await session.commit()


@pytest.fixture
async def created_project_ids(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[str]]:
    ids: list[str] = []
    yield ids
    async with session_factory() as session:
        for pid in ids:
            await session.execute(delete(Project).where(Project.id == pid))
        await session.commit()


async def _make_user(session_factory: async_sessionmaker[AsyncSession], *, admin: bool) -> User:
    async with session_factory() as session:
        user = User(
            email=f"proj-route-{uuid.uuid4().hex[:10]}@example.com",
            display_name="Project Route User",
            is_verified=True,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        if admin:
            role = (await session.execute(select(Role).where(Role.name == "admin"))).scalar_one()
            await session.execute(user_roles.insert().values(user_id=user.id, role_id=role.id))
        await session.commit()
        user_id = user.id

    async with session_factory() as session:
        return (
            await session.execute(
                select(User)
                .where(User.id == user_id)
                .options(selectinload(User.roles).selectinload(Role.permissions))
            )
        ).scalar_one()


_SAMPLE_BODY = {
    "name": "통합테스트 프로젝트",
    "client": "테스트고객",
    "status": "진행중",
    "progress": 30,
    "pm": "윤서준",
    "startDate": "2024-03-01",
    "endDate": "2024-08-31",
    "budget": 100000000,
    "spent": 20000000,
    "desc": "라운드트립 검증용",
    "members": [{"id": "EMP-001", "name": "김지훈", "role": "백엔드", "grade": "고급"}],
    "tasks": [{"name": "설계", "start": "2024-03-01", "end": "2024-03-31", "done": 50, "dept": "개발"}],
    "contracts": [],
    "issues": [],
    "costs": [{"category": "인건비", "budgeted": 50000000, "actual": 10000000}],
}


async def test_list_projects_without_auth_returns_401(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app = _build_app(session_factory, current_user=None)
    async with _client(app) as client:
        response = await client.get("/api/v1/projects")
    assert response.status_code == 401


async def test_create_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
) -> None:
    user = await _make_user(session_factory, admin=False)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        response = await client.post("/api/v1/projects", json=_SAMPLE_BODY)
    assert response.status_code == 403


async def test_project_crud_round_trips(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
    created_project_ids: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    assert user.has_permission("org:write")
    app = _build_app(session_factory, current_user=user)

    async with _client(app) as client:
        # create
        created = await client.post("/api/v1/projects", json=_SAMPLE_BODY)
        assert created.status_code == 201, created.text
        body = created.json()
        pid = body["id"]
        created_project_ids.append(pid)
        assert pid.startswith("prj_")
        assert body["startDate"] == "2024-03-01"  # camelCase alias round-trips
        assert body["members"][0]["id"] == "EMP-001"

        # get one
        got = await client.get(f"/api/v1/projects/{pid}")
        assert got.status_code == 200
        assert got.json()["name"] == "통합테스트 프로젝트"

        # list contains it
        listed = await client.get("/api/v1/projects")
        assert listed.status_code == 200
        assert any(p["id"] == pid for p in listed.json())

        # update (replace whole aggregate)
        put = await client.put(
            f"/api/v1/projects/{pid}",
            json={**_SAMPLE_BODY, "name": "이름변경", "progress": 100, "tasks": []},
        )
        assert put.status_code == 200, put.text
        assert put.json()["name"] == "이름변경"
        assert put.json()["progress"] == 100
        assert put.json()["tasks"] == []

        again = await client.get(f"/api/v1/projects/{pid}")
        assert again.json()["name"] == "이름변경"

        # delete
        deleted = await client.delete(f"/api/v1/projects/{pid}")
        assert deleted.status_code == 204
        missing = await client.get(f"/api/v1/projects/{pid}")
        assert missing.status_code == 404


async def test_get_unknown_project_returns_404(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        response = await client.get("/api/v1/projects/prj_does_not_exist")
    assert response.status_code == 404


async def test_schedule_save_history_and_load_round_trips(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
    created_project_ids: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)

    async with _client(app) as client:
        created = await client.post("/api/v1/projects", json={**_SAMPLE_BODY, "tasks": []})
        pid = created.json()["id"]
        created_project_ids.append(pid)

        # save v1 — snapshot + sets current tasks
        v1 = await client.post(
            f"/api/v1/projects/{pid}/schedule/versions",
            json={
                "note": "1차",
                "tasks": [
                    {"id": "t1", "name": "설계", "start": "2024-03-01", "end": "2024-03-31"}
                ],
            },
        )
        assert v1.status_code == 201, v1.text
        assert v1.json()["note"] == "1차"
        assert v1.json()["tasks"][0]["id"] == "t1"

        # the project's current schedule reflects the save
        got = await client.get(f"/api/v1/projects/{pid}")
        assert len(got.json()["tasks"]) == 1

        # save v2
        v2 = await client.post(
            f"/api/v1/projects/{pid}/schedule/versions",
            json={
                "note": "2차",
                "tasks": [
                    {"id": "t1", "name": "설계", "start": "2024-03-01", "end": "2024-04-15"},
                    {"id": "t2", "name": "개발", "start": "2024-04-16", "end": "2024-07-31"},
                ],
            },
        )
        v2_id = v2.json()["id"]

        # history lists newest first with task counts
        history = await client.get(f"/api/v1/projects/{pid}/schedule/versions")
        assert history.status_code == 200
        items = history.json()
        assert len(items) == 2
        assert items[0]["note"] == "2차"
        assert items[0]["task_count"] == 2
        assert items[1]["task_count"] == 1

        # load a specific past version
        loaded = await client.get(f"/api/v1/projects/{pid}/schedule/versions/{v2_id}")
        assert loaded.status_code == 200
        assert len(loaded.json()["tasks"]) == 2
        assert loaded.json()["tasks"][1]["name"] == "개발"


async def test_schedule_save_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
    created_project_ids: list[str],
) -> None:
    admin = await _make_user(session_factory, admin=True)
    created_user_ids.append(admin.id)
    async with _client(_build_app(session_factory, current_user=admin)) as client:
        created = await client.post("/api/v1/projects", json={**_SAMPLE_BODY, "tasks": []})
        created_project_ids.append(created.json()["id"])
        pid = created.json()["id"]

    viewer = await _make_user(session_factory, admin=False)
    created_user_ids.append(viewer.id)
    async with _client(_build_app(session_factory, current_user=viewer)) as client:
        resp = await client.post(
            f"/api/v1/projects/{pid}/schedule/versions", json={"note": "x", "tasks": []}
        )
    assert resp.status_code == 403


async def test_schedule_version_unknown_returns_404(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[str],
    created_project_ids: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        created = await client.post("/api/v1/projects", json={**_SAMPLE_BODY, "tasks": []})
        pid = created.json()["id"]
        created_project_ids.append(pid)
        resp = await client.get(f"/api/v1/projects/{pid}/schedule/versions/psv_nope")
    assert resp.status_code == 404
