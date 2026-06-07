"""EmploymentType service unit tests (in-memory fake repository).

Covers: create appends sort_order; duplicate name → ConflictError; delete
removes the type and a missing id → NotFoundError.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

import pytest

from core.exceptions import ConflictError, NotFoundError
from domains.org.service import EmploymentTypeService

pytestmark = pytest.mark.unit


@dataclass
class FakeEmploymentType:
    id: uuid.UUID
    name: str
    sort_order: int


@dataclass
class FakeEmploymentTypeRepository:
    types: list[FakeEmploymentType] = field(default_factory=list)

    async def list(self) -> Sequence[FakeEmploymentType]:
        return sorted(self.types, key=lambda t: t.sort_order)

    async def get_by_id(self, type_id: uuid.UUID) -> FakeEmploymentType | None:
        return next((t for t in self.types if t.id == type_id), None)

    async def get_by_name(self, name: str) -> FakeEmploymentType | None:
        return next((t for t in self.types if t.name == name), None)

    async def create(self, name: str) -> FakeEmploymentType:
        max_order = max((t.sort_order for t in self.types), default=0)
        emp = FakeEmploymentType(id=uuid.uuid4(), name=name, sort_order=max_order + 1)
        self.types.append(emp)
        return emp

    async def delete(self, emp_type: FakeEmploymentType) -> None:
        self.types = [t for t in self.types if t.id != emp_type.id]


@pytest.fixture
def service() -> EmploymentTypeService:
    return EmploymentTypeService(FakeEmploymentTypeRepository())  # type: ignore[arg-type]


async def test_create_appends_incrementing_sort_order(service: EmploymentTypeService) -> None:
    a = await service.create("정규직")
    b = await service.create("계약직")
    assert (a.sort_order, b.sort_order) == (1, 2)


async def test_create_duplicate_name_raises_conflict_error(service: EmploymentTypeService) -> None:
    await service.create("정규직")
    with pytest.raises(ConflictError):
        await service.create("정규직")


async def test_delete_removes_and_missing_raises_not_found(
    service: EmploymentTypeService,
) -> None:
    a = await service.create("인턴")
    await service.delete(a.id)
    assert await service.list() == []
    with pytest.raises(NotFoundError):
        await service.delete(a.id)
