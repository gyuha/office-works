"""Dev-only: grant the ``admin`` role to an existing user by email.

Unlike ``scripts/create_dev_admin.py`` this does **not** touch the password — use it
for OAuth/SSO users who have no local password. The ``admin`` role holds
``org:write``/``users:write`` (required to create/edit projects and org settings).
Idempotent: re-running is a no-op if the role is already granted. Run against a
local DB only::

    PYTHONPATH=src uv run python scripts/grant_admin.py user@example.com
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from core.config import get_settings
from domains.auth.models import Role, User, user_roles


async def main(email: str) -> None:
    engine = create_async_engine(get_settings().database_url)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessionmaker() as session, session.begin():
            user = await session.scalar(select(User).where(User.email == email))
            if user is None:
                raise SystemExit(f"user not found: {email}")
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
    print(f"✅ granted 'admin' role to {email}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/grant_admin.py <email>")
    asyncio.run(main(sys.argv[1]))
