"""EmploymentType router integration tests (real Postgres + ASGI round-trip).

  * unauthenticated → 401 on read.
  * authenticated without org:write → 403 on write.
  * authenticated with org:write (seeded admin role) → create / list / delete.
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
from domains.org.models import EmploymentType
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


@pytest.fixture
async def created_type_names(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[str]]:
    names: list[str] = []
    yield names
    async with session_factory() as session:
        for name in names:
            await session.execute(delete(EmploymentType).where(EmploymentType.name == name))
        await session.commit()


async def _make_user(session_factory: async_sessionmaker[AsyncSession], *, admin: bool) -> User:
    async with session_factory() as session:
        user = User(
            email=f"emp-route-{uuid.uuid4().hex[:10]}@example.com",
            display_name="Emp Route User",
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
        response = await client.get("/api/v1/employment-types")
    assert response.status_code == 401


async def test_create_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(session_factory, admin=False)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)
    async with _client(app) as client:
        response = await client.post(
            "/api/v1/employment-types", json={"name": f"무권한-{uuid.uuid4().hex[:6]}"}
        )
    assert response.status_code == 403


async def test_create_list_delete_round_trips_with_write_permission(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
    created_type_names: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    assert user.has_permission("org:write")
    app = _build_app(session_factory, current_user=user)

    name = f"테스트고용-{uuid.uuid4().hex[:6]}"
    created_type_names.append(name)

    async with _client(app) as client:
        create = await client.post("/api/v1/employment-types", json={"name": name})
        assert create.status_code == 201, create.text
        type_id = create.json()["id"]

        listing = await client.get("/api/v1/employment-types")
        assert listing.status_code == 200
        assert any(t["id"] == type_id for t in listing.json())

        deleted = await client.delete(f"/api/v1/employment-types/{type_id}")
        assert deleted.status_code == 204

        after = await client.get("/api/v1/employment-types")
        assert all(t["id"] != type_id for t in after.json())
