"""Position service unit tests (in-memory fake repository, no DB).

Covers the slice DoD:
* create appends sort_order (max + 1).
* duplicate name on create → ConflictError.
* reorder reassigns sort_order following the given id order.
* delete removes the position; deleting a missing id → NotFoundError.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

import pytest

from core.exceptions import ConflictError, NotFoundError
from domains.org.service import PositionService

pytestmark = pytest.mark.unit


@dataclass
class FakePosition:
    id: uuid.UUID
    name: str
    sort_order: int


@dataclass
class FakePositionRepository:
    positions: list[FakePosition] = field(default_factory=list)

    async def list(self) -> Sequence[FakePosition]:
        return sorted(self.positions, key=lambda p: p.sort_order)

    async def get_by_id(self, position_id: uuid.UUID) -> FakePosition | None:
        return next((p for p in self.positions if p.id == position_id), None)

    async def get_by_name(self, name: str) -> FakePosition | None:
        return next((p for p in self.positions if p.name == name), None)

    async def create(self, name: str) -> FakePosition:
        max_order = max((p.sort_order for p in self.positions), default=0)
        position = FakePosition(id=uuid.uuid4(), name=name, sort_order=max_order + 1)
        self.positions.append(position)
        return position

    async def update_name(self, position: FakePosition, name: str) -> FakePosition:
        position.name = name
        return position

    async def delete(self, position: FakePosition) -> None:
        self.positions = [p for p in self.positions if p.id != position.id]

    async def reorder(self, ordered_ids: Sequence[uuid.UUID]) -> Sequence[FakePosition]:
        by_id = {p.id: p for p in self.positions}
        for order, pid in enumerate(ordered_ids, start=1):
            if pid in by_id:
                by_id[pid].sort_order = order
        return await self.list()


@pytest.fixture
def service() -> PositionService:
    return PositionService(FakePositionRepository())  # type: ignore[arg-type]


async def test_create_appends_incrementing_sort_order(service: PositionService) -> None:
    a = await service.create("사원")
    b = await service.create("선임")
    c = await service.create("책임")

    assert (a.sort_order, b.sort_order, c.sort_order) == (1, 2, 3)


async def test_create_duplicate_name_raises_conflict_error(service: PositionService) -> None:
    await service.create("사원")
    with pytest.raises(ConflictError):
        await service.create("사원")


async def test_rename_to_existing_name_raises_conflict_error(service: PositionService) -> None:
    a = await service.create("사원")
    await service.create("선임")
    with pytest.raises(ConflictError):
        await service.rename(a.id, "선임")


async def test_rename_missing_position_raises_not_found(service: PositionService) -> None:
    with pytest.raises(NotFoundError):
        await service.rename(uuid.uuid4(), "사원")


async def test_reorder_reassigns_sort_order(service: PositionService) -> None:
    a = await service.create("사원")
    b = await service.create("선임")
    c = await service.create("책임")

    reordered = await service.reorder([c.id, a.id, b.id])

    order_by_name = {p.name: p.sort_order for p in reordered}
    assert order_by_name == {"책임": 1, "사원": 2, "선임": 3}


async def test_delete_removes_position_and_missing_raises(service: PositionService) -> None:
    a = await service.create("사원")
    await service.delete(a.id)

    assert await service.list() == []
    with pytest.raises(NotFoundError):
        await service.delete(a.id)
