"""Repositories for the org config singletons (one row per table).

Each table is seeded with a single row by migration 0006; ``get`` returns it
and ``update`` mutates it in place.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from domains.org.models import CompanyInfo, LeaveSettings, WorkSettings


class SingletonRepository[T: (WorkSettings, LeaveSettings, CompanyInfo)]:
    """Data access for a single-row config table."""

    def __init__(self, session: AsyncSession, model: type[T]) -> None:
        self._session = session
        self._model: type[T] = model

    async def get(self) -> T:
        row = (await self._session.execute(select(self._model).limit(1))).scalar_one_or_none()
        if row is None:
            raise NotFoundError(self._model.__name__)
        return row

    async def update(self, fields: dict[str, object]) -> T:
        row = await self.get()
        for key, value in fields.items():
            setattr(row, key, value)
        await self._session.flush()
        return row


class WorkSettingsRepository(SingletonRepository[WorkSettings]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkSettings)


class LeaveSettingsRepository(SingletonRepository[LeaveSettings]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, LeaveSettings)


class CompanyInfoRepository(SingletonRepository[CompanyInfo]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, CompanyInfo)
