"""Member service unit tests.

Wire :class:`MemberService` to an in-memory fake repository (no DB / Redis),
mirroring the auth-domain fake-repo pattern. Covers the slice DoD:

* employee_no auto-generation format (``EMP-NNN``).
* duplicate email on create → :class:`ConflictError`.
* soft-deleted members are excluded from the default list.
* stats grade_distribution sums to the active total.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime

import pytest

from core.exceptions import ConflictError, NotFoundError
from domains.members.schemas import MemberCreate, MemberUpdate
from domains.members.service import MemberService

pytestmark = pytest.mark.unit

_EMP_NO_RE = re.compile(r"^EMP-(\d+)$")


@dataclass
class _FakeMember:
    """Stand-in for the ORM ``Member`` row (attribute-compatible)."""

    employee_no: str
    name: str
    department: str
    rank: str
    grade: str
    phone: str
    email: str
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    user_id: uuid.UUID | None = None
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class FakeMemberRepository:
    """In-memory stub matching :class:`MemberRepository`'s contract."""

    def __init__(self) -> None:
        self.members: list[_FakeMember] = []

    async def list(
        self,
        q: str | None = None,
        department: str | None = None,
        grade: str | None = None,
        sort_key: str = "no",
        order: str = "asc",
        page: int = 1,
        page_size: int = 10,
        include_inactive: bool = False,
    ) -> tuple[list[_FakeMember], int]:
        rows = list(self.members)
        if not include_inactive:
            rows = [m for m in rows if m.is_active]
        if department:
            rows = [m for m in rows if m.department == department]
        if grade:
            rows = [m for m in rows if m.grade == grade]
        if q:
            needle = q.lower()
            rows = [
                m
                for m in rows
                if needle
                in f"{m.name}{m.employee_no}{m.department}{m.rank}{m.email}{m.phone}".lower()
            ]
        rows.sort(key=lambda m: m.employee_no, reverse=(order == "desc"))
        total = len(rows)
        start = (page - 1) * page_size
        return rows[start : start + page_size], total

    async def get_by_id(self, member_id: uuid.UUID) -> _FakeMember | None:
        return next((m for m in self.members if m.id == member_id), None)

    async def get_by_email(self, email: str) -> _FakeMember | None:
        normalized = email.strip().lower()
        return next((m for m in self.members if m.email == normalized), None)

    async def get_by_user_id(self, user_id: uuid.UUID) -> _FakeMember | None:
        return next((m for m in self.members if m.user_id == user_id), None)

    async def create(
        self,
        *,
        employee_no: str,
        name: str,
        department: str,
        rank: str,
        grade: str,
        phone: str,
        email: str,
    ) -> _FakeMember:
        member = _FakeMember(
            employee_no=employee_no,
            name=name,
            department=department,
            rank=rank,
            grade=grade,
            phone=phone,
            email=email.strip().lower(),
        )
        self.members.append(member)
        return member

    async def update(self, member: _FakeMember, changes: dict[str, object]) -> _FakeMember:
        for key, value in changes.items():
            if key == "email" and isinstance(value, str):
                value = value.strip().lower()
            setattr(member, key, value)
        return member

    async def soft_delete(self, member: _FakeMember) -> None:
        member.is_active = False

    async def next_employee_no(self) -> str:
        max_seq = 0
        for m in self.members:
            match = _EMP_NO_RE.match(m.employee_no)
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f"EMP-{max_seq + 1:03d}"

    async def stats(self) -> tuple[int, int, int, dict[str, int], Sequence[str]]:
        active = [m for m in self.members if m.is_active]
        total = len(active)
        departments = sorted({m.department for m in active})
        department_count = len(departments)
        now = datetime.now(UTC)
        new_this_month = sum(
            1 for m in active if m.created_at.year == now.year and m.created_at.month == now.month
        )
        grade_distribution: dict[str, int] = {}
        for m in active:
            grade_distribution[m.grade] = grade_distribution.get(m.grade, 0) + 1
        return total, department_count, new_this_month, grade_distribution, departments


@pytest.fixture
def repo() -> FakeMemberRepository:
    return FakeMemberRepository()


@pytest.fixture
def service(repo: FakeMemberRepository) -> MemberService:
    return MemberService(repo)  # type: ignore[arg-type]


def _payload(
    email: str = "alice@example.com", grade: str = "중급", department: str = "개발팀"
) -> MemberCreate:
    return MemberCreate(
        name="홍길동",
        department=department,
        rank="사원",
        grade=grade,  # type: ignore[arg-type]
        phone="010-1234-5678",
        email=email,  # type: ignore[arg-type]
    )


# ── employee_no auto-generation ──────────────────────────────────────────────


async def test_create_first_member_assigns_emp001(service: MemberService) -> None:
    created = await service.create(_payload())
    assert created.employee_no == "EMP-001"


async def test_create_sequential_members_increments_zero_padded_employee_no(
    service: MemberService,
) -> None:
    first = await service.create(_payload(email="a@example.com"))
    second = await service.create(_payload(email="b@example.com"))
    third = await service.create(_payload(email="c@example.com"))
    assert (first.employee_no, second.employee_no, third.employee_no) == (
        "EMP-001",
        "EMP-002",
        "EMP-003",
    )
    assert _EMP_NO_RE.match(third.employee_no)


# ── duplicate email → ConflictError ──────────────────────────────────────────


async def test_create_duplicate_email_raises_conflict_error(service: MemberService) -> None:
    await service.create(_payload(email="dup@example.com"))
    with pytest.raises(ConflictError):
        await service.create(_payload(email="dup@example.com"))


async def test_update_email_collides_with_other_member_raises_conflict_error(
    service: MemberService,
) -> None:
    a = await service.create(_payload(email="a@example.com"))
    await service.create(_payload(email="b@example.com"))
    with pytest.raises(ConflictError):
        await service.update(a.id, MemberUpdate(email="b@example.com"))  # type: ignore[arg-type]


# ── soft delete excluded from default list ───────────────────────────────────


async def test_delete_soft_deletes_and_excludes_from_default_list(service: MemberService) -> None:
    keep = await service.create(_payload(email="keep@example.com"))
    drop = await service.create(_payload(email="drop@example.com"))

    await service.delete(drop.id)

    listing = await service.list()
    ids = {item.id for item in listing.items}
    assert keep.id in ids
    assert drop.id not in ids
    assert listing.total == 1


async def test_delete_unknown_member_raises_not_found_error(service: MemberService) -> None:
    with pytest.raises(NotFoundError):
        await service.delete(uuid.uuid4())


# ── stats grade distribution sums to active total ────────────────────────────


async def test_stats_grade_distribution_sums_to_active_total(service: MemberService) -> None:
    await service.create(_payload(email="a@example.com", grade="특급"))
    await service.create(_payload(email="b@example.com", grade="특급"))
    await service.create(_payload(email="c@example.com", grade="고급"))
    deleted = await service.create(_payload(email="d@example.com", grade="초급"))
    await service.delete(deleted.id)

    stats = await service.stats()

    assert stats.total == 3
    assert sum(stats.grade_distribution.values()) == stats.total
    assert "초급" not in stats.grade_distribution  # soft-deleted excluded


# ── stats departments lists distinct active departments, sorted ──────────────


async def test_stats_departments_lists_distinct_active_sorted(service: MemberService) -> None:
    await service.create(_payload(email="a@example.com", department="개발팀"))
    await service.create(_payload(email="b@example.com", department="기획팀"))
    await service.create(_payload(email="c@example.com", department="개발팀"))
    deleted = await service.create(_payload(email="d@example.com", department="영업팀"))
    await service.delete(deleted.id)

    stats = await service.stats()

    assert stats.departments == ["개발팀", "기획팀"]  # distinct, sorted, soft-deleted excluded
    assert stats.department_count == 2
