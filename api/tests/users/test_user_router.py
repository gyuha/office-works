"""Users (employee directory) router integration tests (real Postgres + ASGI).

These talk to the running local Postgres (started by ``task infra``/``task dev``)
through the application's async engine. Each test seeds its own isolated rows
(unique emails) and removes them afterwards.

Auth is exercised at the dependency level:
  * unauthenticated → no override, no bearer header → 401.
  * authenticated without ``users:write`` → user with no admin role → 403 on write.
  * authenticated with ``users:write`` → user granted the seeded ``admin`` role.

Run::

    cd api && PYTHONPATH=src uv run pytest -m integration tests/users/test_user_router.py
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from core.config import settings
from core.database import get_async_session
from core.exceptions import register_exception_handlers
from domains.auth.models import Role, User, user_roles
from domains.auth.security import get_current_user
from domains.users.router import router

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Per-test engine — NullPool so connections are never reused across the fresh
# event loop pytest-asyncio creates for each test (avoids "event loop closed").
# ---------------------------------------------------------------------------


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(settings.async_database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


def _build_app(
    session_factory: async_sessionmaker[AsyncSession],
    current_user: User | None,
) -> FastAPI:
    """Build an ASGI app with the users router.

    ``get_async_session`` is overridden to the per-test NullPool factory. When
    *current_user* is provided, :func:`get_current_user` is overridden to return
    it; otherwise the real dependency runs (and 401s without a token).
    """
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
    """Track user ids created by a test and clean them up."""
    ids: list[uuid.UUID] = []
    yield ids
    async with session_factory() as session:
        for uid in ids:
            await session.execute(delete(user_roles).where(user_roles.c.user_id == uid))
            await session.execute(delete(User).where(User.id == uid))
        await session.commit()


@pytest.fixture
async def created_emails(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[str]]:
    """Track employee emails created via the API and clean them up."""
    emails: list[str] = []
    yield emails
    async with session_factory() as session:
        for email in emails:
            await session.execute(delete(User).where(User.email == email))
        await session.commit()


async def _make_user(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    admin: bool,
    employee_no: str | None = None,
    name: str | None = None,
) -> User:
    """Create and persist an active User, optionally granting the admin role.

    Pass *employee_no*/*name* to make the user an employee (directory record).
    """
    from sqlalchemy.orm import selectinload

    async with session_factory() as session:
        user = User(
            email=f"user-route-{uuid.uuid4().hex[:10]}@example.com",
            display_name=name or "Route Test User",
            is_verified=True,
            is_active=True,
            employee_no=employee_no,
        )
        session.add(user)
        await session.flush()
        if admin:
            role = (
                await session.execute(select(Role).where(Role.name == "admin"))
            ).scalar_one()
            await session.execute(
                user_roles.insert().values(user_id=user.id, role_id=role.id)
            )
        await session.commit()
        user_id = user.id

    # Re-load with roles/permissions eagerly so has_permission() works detached.
    async with session_factory() as session:
        return (
            await session.execute(
                select(User)
                .where(User.id == user_id)
                .options(selectinload(User.roles).selectinload(Role.permissions))
            )
        ).scalar_one()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_list_users_without_auth_returns_401(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    app = _build_app(session_factory, current_user=None)
    async with _client(app) as client:
        response = await client.get("/api/v1/users")
    assert response.status_code == 401


async def test_create_user_without_write_permission_returns_403(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(session_factory, admin=False)
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)

    async with _client(app) as client:
        response = await client.post(
            "/api/v1/users",
            json={
                "name": "권한없음",
                "department": "영업팀",
                "rank": "사원",
                "grade": "초급",
                "phone": "010-0000-0000",
                "email": f"noperm-{uuid.uuid4().hex[:8]}@example.com",
            },
        )
    assert response.status_code == 403


async def test_create_then_get_with_write_permission_round_trips(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
    created_emails: list[str],
) -> None:
    user = await _make_user(session_factory, admin=True)
    created_user_ids.append(user.id)
    assert user.has_permission("users:write")
    app = _build_app(session_factory, current_user=user)

    email = f"roundtrip-{uuid.uuid4().hex[:8]}@example.com"
    created_emails.append(email)

    async with _client(app) as client:
        create = await client.post(
            "/api/v1/users",
            json={
                "name": "라운드트립",
                "department": "개발팀",
                "rank": "선임",
                "grade": "고급",
                "phone": "010-1234-5678",
                "email": email,
            },
        )
        assert create.status_code == 201, create.text
        body = create.json()
        new_id = body["id"]
        assert body["employee_no"].startswith("EMP-")
        assert body["email"] == email
        assert body["name"] == "라운드트립"

        # Detail reflects the created employee.
        detail = await client.get(f"/api/v1/users/{new_id}")
        assert detail.status_code == 200
        assert detail.json()["id"] == new_id

        # List includes the created employee (search by the unique email).
        listing = await client.get("/api/v1/users", params={"q": email})
        assert listing.status_code == 200
        items = listing.json()["items"]
        assert any(item["id"] == new_id for item in items)


async def test_me_returns_current_users_own_record(
    session_factory: async_sessionmaker[AsyncSession],
    created_user_ids: list[uuid.UUID],
) -> None:
    user = await _make_user(
        session_factory, admin=False, employee_no=f"EMP-{uuid.uuid4().int % 1000:03d}", name="본인"
    )
    created_user_ids.append(user.id)
    app = _build_app(session_factory, current_user=user)

    async with _client(app) as client:
        response = await client.get("/api/v1/users/me")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(user.id)
    assert body["email"] == user.email
    assert body["name"] == "본인"
