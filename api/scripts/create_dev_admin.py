"""Dev-only: create (or reset) a verified admin user for local use.

Intentionally separate from ``scripts/seed.py`` — users are environment-specific
and never part of the canonical seed. Run against a local DB only::

    PYTHONPATH=src uv run python scripts/create_dev_admin.py

Creates ``admin@officemate.co.kr`` / ``admin1234!`` with the ``admin`` role
(holds ``org:write`` — required to create/edit projects and org settings).
Idempotent: re-running resets the password and re-grants the role.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import get_settings
from domains.auth.models import Role, User, user_roles
from domains.auth.security import hash_password

EMAIL = "admin@officemate.co.kr"
PASSWORD = "admin1234!"  # noqa: S105 — local dev credential


async def main() -> None:
    engine = create_async_engine(get_settings().database_url)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessionmaker() as session, session.begin():
            user = await session.scalar(select(User).where(User.email == EMAIL))
            if user is None:
                user = User(email=EMAIL, display_name="관리자")
                session.add(user)
            user.hashed_password = hash_password(PASSWORD)
            user.is_verified = True
            user.is_active = True
            await session.flush()

            admin = await session.scalar(select(Role).where(Role.name == "admin"))
            if admin is None:
                raise SystemExit("admin role not found — run `task seed` first.")
            await session.execute(
                pg_insert(user_roles)
                .values(user_id=user.id, role_id=admin.id)
                .on_conflict_do_nothing()
            )
    finally:
        await engine.dispose()
    print(f"✅ dev admin ready: {EMAIL} / {PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
