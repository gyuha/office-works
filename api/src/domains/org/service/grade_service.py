"""Service layer for the 등급(Grade) entity.

Rename cascades to members (members.grade stores the name string); deletion is
blocked while any member still references the grade.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from core.exceptions import ConflictError, NotFoundError
from domains.org.models import Grade
from domains.org.repository import GradeRepository
from domains.org.schemas import GradeUpdate


class GradeService:
    """Business logic for 등급 체계 (grades)."""

    def __init__(self, repo: GradeRepository) -> None:
        self._repo = repo

    async def list(self) -> Sequence[Grade]:
        return await self._repo.list()

    async def create(
        self, *, name: str, color: str, bg: str, border: str, description: str
    ) -> Grade:
        if await self._repo.get_by_name(name) is not None:
            raise ConflictError(f"A grade named '{name}' already exists.")
        try:
            return await self._repo.create(
                name=name, color=color, bg=bg, border=border, description=description
            )
        except IntegrityError as exc:
            raise ConflictError(f"A grade named '{name}' already exists.") from exc

    async def update(self, grade_id: str, payload: GradeUpdate) -> Grade:
        grade = await self._repo.get_by_id(grade_id)
        if grade is None:
            raise NotFoundError("Grade")

        # Rename: dup-check + cascade to members so their grade strings stay valid.
        if payload.name is not None and payload.name != grade.name:
            existing = await self._repo.get_by_name(payload.name)
            if existing is not None and existing.id != grade_id:
                raise ConflictError(f"A grade named '{payload.name}' already exists.")
            old_name = grade.name
            await self._repo.cascade_rename_members(old_name, payload.name)

        return await self._repo.update_fields(
            grade,
            name=payload.name,
            color=payload.color,
            bg=payload.bg,
            border=payload.border,
            description=payload.description,
        )

    async def delete(self, grade_id: str) -> None:
        grade = await self._repo.get_by_id(grade_id)
        if grade is None:
            raise NotFoundError("Grade")
        referencing = await self._repo.count_members_with_grade(grade.name)
        if referencing > 0:
            raise ConflictError(
                f"Cannot delete grade '{grade.name}': {referencing} member(s) still use it."
            )
        await self._repo.delete(grade)

    async def reorder(self, ordered_ids: Sequence[str]) -> Sequence[Grade]:
        return await self._repo.reorder(ordered_ids)


__all__ = ["GradeService"]
