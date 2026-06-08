"""Repository for the 고용 형태(EmploymentType) entity."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.org.models import EmploymentType


class EmploymentTypeRepository:
    """Data access for employment types, ordered by ``sort_order``."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> Sequence[EmploymentType]:
        result = await self._session.execute(
            select(EmploymentType).order_by(EmploymentType.sort_order)
        )
        return result.scalars().all()

    async def get_by_id(self, type_id: str) -> EmploymentType | None:
        return await self._session.get(EmploymentType, type_id)

    async def get_by_name(self, name: str) -> EmploymentType | None:
        result = await self._session.execute(
            select(EmploymentType).where(EmploymentType.name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, name: str) -> EmploymentType:
        max_order = (
            await self._session.execute(
                select(func.coalesce(func.max(EmploymentType.sort_order), 0))
            )
        ).scalar_one()
        emp_type = EmploymentType(name=name, sort_order=int(max_order) + 1)
        self._session.add(emp_type)
        await self._session.flush()
        return emp_type

    async def delete(self, emp_type: EmploymentType) -> None:
        await self._session.delete(emp_type)
        await self._session.flush()
