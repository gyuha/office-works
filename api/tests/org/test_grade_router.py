"""Grade router integration tests (real Postgres + ASGI round-trip).

Covers auth gates + the risky behaviors: rename cascades to members, and
deletion is blocked (409) while a member references the grade.
"""

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
from domains.members.models import Member
from domains.org.models import Grade
from domains.org.router import router

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
async def cleanup(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[dict[str, list]]:
    bag: dict[str, list] = {"users": [], "grades": [], "emails": []}
    yield bag
    async with session_factory() as session:
        for uid in bag["users"]:
            await session.execute(delete(user_roles).where(user_roles.c.user_id == uid))
            await session.execute(delete(User).where(User.id == uid))
        for email in bag["emails"]:
            await session.execute(delete(Member).where(Member.email == email))
        for name in bag["grades"]:
            await session.execute(delete(Grade).where(Grade.name == name))
        await session.commit()


async def _make_user(session_factory: async_sessionmaker[AsyncSession], *, admin: bool) -> User:
    async with session_factory() as session:
        user = User(
            email=f"grade-route-{uuid.uuid4().hex[:10]}@example.com",
            display_name="Grade Route User",
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


async def test_list_without_auth_returns_401(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app = _build_app(session_factory, current_user=None)
    async with _client(app) as client:
        response = await client.get("/api/v1/grades")
    assert response.status_code == 401


async def test_create_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    cleanup: dict[str, list],
) -> None:
    user = await _make_user(session_factory, admin=False)
    cleanup["users"].append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        response = await client.post(
            "/api/v1/grades",
            json={"name": f"무권한-{uuid.uuid4().hex[:5]}", "color": "#111111",
                  "bg": "#222222", "border": "#333333", "description": ""},
        )
    assert response.status_code == 403


async def test_create_reorder_round_trips(
    session_factory: async_sessionmaker[AsyncSession],
    cleanup: dict[str, list],
) -> None:
    user = await _make_user(session_factory, admin=True)
    cleanup["users"].append(user.id)
    assert user.has_permission("org:write")
    app = _build_app(session_factory, current_user=user)

    s = uuid.uuid4().hex[:5]
    na, nb = f"등급A-{s}", f"등급B-{s}"
    cleanup["grades"].extend([na, nb])

    async with _client(app) as client:
        ra = await client.post(
            "/api/v1/grades",
            json={"name": na, "color": "#000000", "bg": "#FFFFFF", "border": "#CCCCCC",
                  "description": "first"},
        )
        assert ra.status_code == 201, ra.text
        rb = await client.post(
            "/api/v1/grades",
            json={"name": nb, "color": "#000000", "bg": "#FFFFFF", "border": "#CCCCCC",
                  "description": ""},
        )
        assert rb.status_code == 201
        ids = [g["id"] for g in (await client.get("/api/v1/grades")).json()]
        rev = list(reversed(ids))
        reorder = await client.patch("/api/v1/grades/order", json={"ordered_ids": rev})
        assert reorder.status_code == 200
        # B (created last) now precedes A after full reverse
        names = [g["name"] for g in reorder.json()]
        assert names.index(nb) < names.index(na)


async def test_rename_cascades_to_member_and_delete_blocked_while_referenced(
    session_factory: async_sessionmaker[AsyncSession],
    cleanup: dict[str, list],
) -> None:
    user = await _make_user(session_factory, admin=True)
    cleanup["users"].append(user.id)
    app = _build_app(session_factory, current_user=user)

    s = uuid.uuid4().hex[:5]
    grade_name = f"등급C-{s}"
    new_name = f"등급C2-{s}"
    cleanup["grades"].extend([grade_name, new_name])

    # create the grade, then a member referencing it by name
    async with _client(app) as client:
        created = await client.post(
            "/api/v1/grades",
            json={"name": grade_name, "color": "#000000", "bg": "#FFFFFF",
                  "border": "#CCCCCC", "description": ""},
        )
        assert created.status_code == 201
        grade_id = created.json()["id"]

    email = f"grade-member-{s}@example.com"
    cleanup["emails"].append(email)
    async with session_factory() as session:
        session.add(
            Member(
                employee_no=f"EMP-{uuid.uuid4().int % 100000:05d}",
                name="등급참조자",
                department="개발팀",
                rank="사원",
                grade=grade_name,
                phone="010-0000-0000",
                email=email,
            )
        )
        await session.commit()

    async with _client(app) as client:
        # delete blocked while referenced
        blocked = await client.delete(f"/api/v1/grades/{grade_id}")
        assert blocked.status_code == 409, blocked.text

        # rename cascades to the member
        renamed = await client.patch(f"/api/v1/grades/{grade_id}", json={"name": new_name})
        assert renamed.status_code == 200

    async with session_factory() as session:
        member = (
            await session.execute(select(Member).where(Member.email == email))
        ).scalar_one()
        assert member.grade == new_name  # cascaded
