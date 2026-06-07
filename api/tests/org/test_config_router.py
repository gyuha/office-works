"""Org config singleton router integration tests (real Postgres + ASGI)."""

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
async def created_user_ids(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[uuid.UUID]]:
    ids: list[uuid.UUID] = []
    yield ids
    async with session_factory() as session:
        for uid in ids:
            await session.execute(delete(user_roles).where(user_roles.c.user_id == uid))
            await session.execute(delete(User).where(User.id == uid))
        await session.commit()


async def _make_user(session_factory: async_sessionmaker[AsyncSession], *, admin: bool) -> User:
    async with session_factory() as session:
        user = User(
            email=f"config-route-{uuid.uuid4().hex[:10]}@example.com",
            display_name="Config Route User",
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


async def test_get_work_settings_without_auth_returns_401(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app = _build_app(session_factory, current_user=None)
    async with _client(app) as client:
        response = await client.get("/api/v1/org/work-settings")
    assert response.status_code == 401


async def test_put_work_settings_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(session_factory, admin=False)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        response = await client.put(
            "/api/v1/org/work-settings",
            json={
                "start_time": "08:00",
                "end_time": "17:00",
                "lunch_start": "12:00",
                "lunch_end": "13:00",
                "break_minutes": 5,
            },
        )
    assert response.status_code == 403


async def test_work_settings_get_put_round_trips(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    assert user.has_permission("org:write")
    app = _build_app(session_factory, current_user=user)

    async with _client(app) as client:
        got = await client.get("/api/v1/org/work-settings")
        assert got.status_code == 200
        assert "start_time" in got.json()

        put = await client.put(
            "/api/v1/org/work-settings",
            json={
                "start_time": "10:00",
                "end_time": "19:00",
                "lunch_start": "12:30",
                "lunch_end": "13:30",
                "break_minutes": 20,
            },
        )
        assert put.status_code == 200, put.text

        again = await client.get("/api/v1/org/work-settings")
        assert again.json()["start_time"] == "10:00"
        assert again.json()["break_minutes"] == 20

    # restore seed defaults so other tests/dev see the original values
    async with _client(_build_app(session_factory, current_user=user)) as client:
        await client.put(
            "/api/v1/org/work-settings",
            json={
                "start_time": "09:00",
                "end_time": "18:00",
                "lunch_start": "12:00",
                "lunch_end": "13:00",
                "break_minutes": 10,
            },
        )


async def test_company_put_round_trips_and_restores(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)

    seed = {
        "name": "오피스메이트 주식회사",
        "biz_no": "123-45-67890",
        "ceo": "홍길동",
        "founded": "2018-03-15",
        "tel": "02-1234-5678",
        "email": "contact@officemate.co.kr",
        "address": "서울특별시 강남구 테헤란로 123 오피스메이트빌딩 7층",
    }
    async with _client(app) as client:
        put = await client.put("/api/v1/org/company", json={**seed, "ceo": "임시대표"})
        assert put.status_code == 200, put.text
        assert (await client.get("/api/v1/org/company")).json()["ceo"] == "임시대표"
        await client.put("/api/v1/org/company", json=seed)  # restore
