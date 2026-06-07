"""Grade service unit tests (in-memory fake repository).

Covers: create dup → ConflictError; rename cascades to members & dup-checks;
delete blocked while referenced (ConflictError); reorder reassigns sort_order.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field

import pytest

from core.exceptions import ConflictError, NotFoundError
from domains.org.schemas import GradeUpdate
from domains.org.service import GradeService

pytestmark = pytest.mark.unit


@dataclass
class FakeGrade:
    id: uuid.UUID
    name: str
    color: str
    bg: str
    border: str
    description: str
    sort_order: int


@dataclass
class FakeGradeRepository:
    grades: list[FakeGrade] = field(default_factory=list)
    # member grade-name → count, to exercise cascade-rename and delete-block
    member_grades: dict[str, int] = field(default_factory=dict)

    async def list(self) -> Sequence[FakeGrade]:
        return sorted(self.grades, key=lambda g: g.sort_order)

    async def get_by_id(self, grade_id: uuid.UUID) -> FakeGrade | None:
        return next((g for g in self.grades if g.id == grade_id), None)

    async def get_by_name(self, name: str) -> FakeGrade | None:
        return next((g for g in self.grades if g.name == name), None)

    async def create(
        self, *, name: str, color: str, bg: str, border: str, description: str
    ) -> FakeGrade:
        max_order = max((g.sort_order for g in self.grades), default=0)
        grade = FakeGrade(uuid.uuid4(), name, color, bg, border, description, max_order + 1)
        self.grades.append(grade)
        return grade

    async def update_fields(self, grade: FakeGrade, **fields: object) -> FakeGrade:
        for key, value in fields.items():
            if value is not None:
                setattr(grade, key, value)
        return grade

    async def delete(self, grade: FakeGrade) -> None:
        self.grades = [g for g in self.grades if g.id != grade.id]

    async def reorder(self, ordered_ids: Sequence[uuid.UUID]) -> Sequence[FakeGrade]:
        by_id = {g.id: g for g in self.grades}
        for order, gid in enumerate(ordered_ids, start=1):
            if gid in by_id:
                by_id[gid].sort_order = order
        return await self.list()

    async def count_members_with_grade(self, name: str) -> int:
        return self.member_grades.get(name, 0)

    async def cascade_rename_members(self, old_name: str, new_name: str) -> None:
        if old_name in self.member_grades:
            self.member_grades[new_name] = self.member_grades.pop(old_name)


def _svc(repo: FakeGradeRepository | None = None) -> tuple[GradeService, FakeGradeRepository]:
    repo = repo or FakeGradeRepository()
    return GradeService(repo), repo  # type: ignore[arg-type]


async def _mk(svc: GradeService, name: str) -> FakeGrade:
    return await svc.create(  # type: ignore[return-value]
        name=name, color="#000000", bg="#FFFFFF", border="#CCCCCC", description=""
    )


async def test_create_duplicate_name_raises_conflict() -> None:
    svc, _ = _svc()
    await _mk(svc, "초급")
    with pytest.raises(ConflictError):
        await _mk(svc, "초급")


async def test_rename_cascades_to_members_and_dup_checks() -> None:
    svc, repo = _svc()
    g = await _mk(svc, "초급")
    repo.member_grades["초급"] = 3  # 3 members reference it
    await svc.update(g.id, GradeUpdate(name="주니어"))
    assert repo.member_grades == {"주니어": 3}  # cascaded
    assert (await repo.get_by_name("주니어")) is not None

    other = await _mk(svc, "중급")
    with pytest.raises(ConflictError):  # rename onto an existing name
        await svc.update(other.id, GradeUpdate(name="주니어"))


async def test_delete_blocked_while_referenced() -> None:
    svc, repo = _svc()
    g = await _mk(svc, "고급")
    repo.member_grades["고급"] = 1
    with pytest.raises(ConflictError):
        await svc.delete(g.id)
    repo.member_grades["고급"] = 0
    await svc.delete(g.id)
    assert await repo.get_by_name("고급") is None


async def test_delete_missing_raises_not_found() -> None:
    svc, _ = _svc()
    with pytest.raises(NotFoundError):
        await svc.delete(uuid.uuid4())


async def test_reorder_reassigns_sort_order() -> None:
    svc, _ = _svc()
    a = await _mk(svc, "초급")
    b = await _mk(svc, "중급")
    reordered = await svc.reorder([b.id, a.id])
    order = {g.name: g.sort_order for g in reordered}
    assert order == {"중급": 1, "초급": 2}
