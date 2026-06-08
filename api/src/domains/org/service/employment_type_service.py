"""Service layer for the 고용 형태(EmploymentType) entity."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from core.exceptions import ConflictError, NotFoundError
from domains.org.models import EmploymentType
from domains.org.repository import EmploymentTypeRepository


class EmploymentTypeService:
    """Business logic for 고용 형태 (employment types)."""

    def __init__(self, repo: EmploymentTypeRepository) -> None:
        self._repo = repo

    async def list(self) -> Sequence[EmploymentType]:
        return await self._repo.list()

    async def create(self, name: str) -> EmploymentType:
        if await self._repo.get_by_name(name) is not None:
            raise ConflictError(f"An employment type named '{name}' already exists.")
        try:
            return await self._repo.create(name)
        except IntegrityError as exc:
            raise ConflictError(f"An employment type named '{name}' already exists.") from exc

    async def delete(self, type_id: str) -> None:
        emp_type = await self._repo.get_by_id(type_id)
        if emp_type is None:
            raise NotFoundError("EmploymentType")
        await self._repo.delete(emp_type)


__all__ = ["EmploymentTypeService"]
