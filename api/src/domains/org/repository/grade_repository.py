"""Repository for the 등급(Grade) entity.

Cross-domain touches (members table) use raw SQL to avoid an import cycle
between the org and members domains.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from domains.org.models import Grade


class GradeRepository:
    """Data access for grades, ordered low→high by ``sort_order``."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> Sequence[Grade]:
        result = await self._session.execute(select(Grade).order_by(Grade.sort_order))
        return result.scalars().all()

    async def get_by_id(self, grade_id: str) -> Grade | None:
        return await self._session.get(Grade, grade_id)

    async def get_by_name(self, name: str) -> Grade | None:
        result = await self._session.execute(select(Grade).where(Grade.name == name))
        return result.scalar_one_or_none()

    async def create(
        self, *, name: str, color: str, bg: str, border: str, description: str
    ) -> Grade:
        max_order = (
            await self._session.execute(select(func.coalesce(func.max(Grade.sort_order), 0)))
        ).scalar_one()
        grade = Grade(
            name=name,
            color=color,
            bg=bg,
            border=border,
            description=description,
            sort_order=int(max_order) + 1,
        )
        self._session.add(grade)
        await self._session.flush()
        return grade

    async def update_fields(self, grade: Grade, **fields: object) -> Grade:
        for key, value in fields.items():
            if value is not None:
                setattr(grade, key, value)
        await self._session.flush()
        return grade

    async def delete(self, grade: Grade) -> None:
        await self._session.delete(grade)
        await self._session.flush()

    async def reorder(self, ordered_ids: Sequence[str]) -> Sequence[Grade]:
        by_id = {g.id: g for g in await self.list()}
        for order, gid in enumerate(ordered_ids, start=1):
            grade = by_id.get(gid)
            if grade is not None:
                grade.sort_order = order
        await self._session.flush()
        return await self.list()

    async def count_members_with_grade(self, name: str) -> int:
        """How many user rows reference this grade name (raw SQL — users table)."""
        result = await self._session.execute(
            text("SELECT count(*) FROM users WHERE grade = :name"), {"name": name}
        )
        return int(result.scalar_one())

    async def cascade_rename_members(self, old_name: str, new_name: str) -> None:
        """Rename the grade on all user rows that reference it (raw SQL)."""
        await self._session.execute(
            text("UPDATE users SET grade = :new WHERE grade = :old"),
            {"new": new_name, "old": old_name},
        )
        await self._session.flush()
