"""Eager Member-linking integration tests (real Postgres).

Exercises :meth:`AuthService._link_member_if_unlinked` through the actual
``login()`` flow against the running local Postgres (``task infra``/``task dev``).
Each test seeds its own isolated rows (unique emails) and removes them after.

Covered (S4 completion criteria):
  * login with an email that matches an unlinked Member → Member.user_id is set.
  * login with no matching Member → login still succeeds, no linking happens
    (open-provisioning / JIT behaviour is not regressed).

Run::

    cd api && PYTHONPATH=src uv run --python 3.12 \\
        pytest -m integration tests/members/test_member_linking.py
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import fakeredis.aioredis
import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from core.config import settings
from domains.auth.models import User
from domains.auth.repository import AuthRepository
from domains.auth.security import hash_password
from domains.auth.service import AuthService
from domains.members.models import Member
from domains.members.repository import MemberRepository

pytestmark = pytest.mark.integration


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(settings.async_database_url, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.fixture
async def cleanup(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[list[str]]:
    """Track seeded emails and remove their Member + User rows afterwards."""
    emails: list[str] = []
    yield emails
    async with session_factory() as session:
        for email in emails:
            await session.execute(delete(Member).where(Member.email == email))
            await session.execute(delete(User).where(User.email == email))
        await session.commit()


async def _seed_user(
    session: AsyncSession, email: str, password: str
) -> uuid.UUID:
    user = User(
        email=email,
        display_name="Link Test User",
        hashed_password=hash_password(password),
        is_verified=True,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    user_id = user.id
    await session.commit()
    return user_id


async def test_login_with_matching_unlinked_member_sets_member_user_id(
    session_factory: async_sessionmaker[AsyncSession],
    cleanup: list[str],
) -> None:
    email = f"link-match-{uuid.uuid4().hex[:10]}@example.com"
    password = "correct horse battery staple"
    cleanup.append(email)

    # Seed: verified User with a password + an unlinked Member with the same email.
    async with session_factory() as session:
        user_id = await _seed_user(session, email, password)
        member = Member(
            employee_no=f"EMP-{uuid.uuid4().hex[:6]}",
            name="Link Target",
            department="Engineering",
            rank="Staff",
            grade="중급",
            phone="010-0000-0000",
            email=email,
        )
        session.add(member)
        await session.commit()
        member_id = member.id
        assert member.user_id is None

    # Act: login through the real AuthService (which calls the linking helper).
    redis = fakeredis.aioredis.FakeRedis()
    async with session_factory() as session:
        service = AuthService(AuthRepository(session), redis)
        tokens = await service.login(email, password)
        await session.commit()

    assert tokens["access_token"]

    # Assert: the Member is now linked to the User.
    async with session_factory() as session:
        linked = (
            await session.get(Member, member_id)
        )
        assert linked is not None
        assert linked.user_id == user_id


async def test_login_with_no_matching_member_succeeds_without_linking(
    session_factory: async_sessionmaker[AsyncSession],
    cleanup: list[str],
) -> None:
    email = f"link-nomatch-{uuid.uuid4().hex[:10]}@example.com"
    password = "correct horse battery staple"
    cleanup.append(email)

    # Seed: only a verified User, no Member with this email.
    async with session_factory() as session:
        user_id = await _seed_user(session, email, password)

    redis = fakeredis.aioredis.FakeRedis()
    async with session_factory() as session:
        service = AuthService(AuthRepository(session), redis)
        tokens = await service.login(email, password)
        await session.commit()

    # Login still succeeds (open provisioning preserved).
    assert tokens["access_token"]

    # No Member was created or linked for this user.
    async with session_factory() as session:
        member = await MemberRepository(session).get_by_user_id(user_id)
        assert member is None
