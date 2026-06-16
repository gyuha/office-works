"""User-directory service unit tests.

Wire :class:`UserDirectoryService` to an in-memory fake repository (no DB /
Redis), mirroring the auth-domain fake-repo pattern. Covers the slice DoD:

* employee_no auto-generation format (``EMP-NNN``).
* duplicate email on create → :class:`ConflictError`.
* soft-deleted users are excluded from the default list.
* stats grade_distribution sums to the active total.

The directory's ``name`` field maps to the ORM ``display_name`` column — the
fake row carries ``display_name`` and the service/schema expose it as ``name``.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime

import pytest

from core.exceptions import AppError, ConflictError, NotFoundError
from core.ids import generate_id
from domains.users.schemas import UserCreate, UserUpdate
from domains.users.service import UserDirectoryService

pytestmark = pytest.mark.unit

_EMP_NO_RE = re.compile(r"^EMP-(\d+)$")


@dataclass
class _FakeUser:
    """Stand-in for the ORM ``User`` row (attribute-compatible).

    ``display_name`` is the person's name; the directory exposes it as ``name``.
    """

    employee_no: str
    display_name: str
    department: str
    rank: str
    grade: str
    employment_type: str
    phone: str
    email: str
    memo: str | None = None
    id: str = field(default_factory=lambda: generate_id("usr"))
    is_active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class FakeUserDirectoryRepository:
    """In-memory stub matching :class:`UserDirectoryRepository`'s contract."""

    def __init__(self) -> None:
        self.users: list[_FakeUser] = []
        # Grades considered valid by grade_exists() — mirrors the seeded grades table.
        self.valid_grades: set[str] = {"특급", "고급", "중급", "초급"}
        # Ranks considered valid by position_exists() — mirrors the seeded positions table.
        self.valid_ranks: set[str] = {"사원", "주임", "대리", "과장", "차장", "부장", "팀장"}

    async def grade_exists(self, name: str) -> bool:
        return name in self.valid_grades

    async def position_exists(self, name: str) -> bool:
        return name in self.valid_ranks

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
    ) -> tuple[list[_FakeUser], int]:
        rows = list(self.users)
        if not include_inactive:
            rows = [u for u in rows if u.is_active]
        if department:
            rows = [u for u in rows if u.department == department]
        if grade:
            rows = [u for u in rows if u.grade == grade]
        if q:
            needle = q.lower()
            rows = [
                u
                for u in rows
                if needle
                in f"{u.display_name}{u.employee_no}{u.department}{u.rank}{u.email}{u.phone}".lower()
            ]
        rows.sort(key=lambda u: u.employee_no, reverse=(order == "desc"))
        total = len(rows)
        start = (page - 1) * page_size
        return rows[start : start + page_size], total

    async def get_by_id(self, user_id: str) -> _FakeUser | None:
        return next((u for u in self.users if u.id == user_id), None)

    async def get_by_email(self, email: str) -> _FakeUser | None:
        normalized = email.strip().lower()
        return next((u for u in self.users if u.email == normalized), None)

    async def create(
        self,
        *,
        employee_no: str,
        name: str,
        department: str,
        rank: str,
        grade: str,
        employment_type: str,
        phone: str,
        email: str,
        memo: str | None = None,
    ) -> _FakeUser:
        user = _FakeUser(
            employee_no=employee_no,
            display_name=name,
            department=department,
            rank=rank,
            grade=grade,
            employment_type=employment_type,
            phone=phone,
            email=email.strip().lower(),
            memo=memo,
        )
        self.users.append(user)
        return user

    async def update(self, user: _FakeUser, changes: dict[str, object]) -> _FakeUser:
        for key, value in changes.items():
            if key == "name":
                user.display_name = value  # type: ignore[assignment]
            elif key == "email" and isinstance(value, str):
                user.email = value.strip().lower()
            else:
                setattr(user, key, value)
        return user

    async def soft_delete(self, user: _FakeUser) -> None:
        user.is_active = False

    async def next_employee_no(self) -> str:
        max_seq = 0
        for u in self.users:
            match = _EMP_NO_RE.match(u.employee_no)
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f"EMP-{max_seq + 1:03d}"

    async def stats(self) -> tuple[int, int, int, dict[str, int], Sequence[str]]:
        active = [u for u in self.users if u.is_active]
        total = len(active)
        departments = sorted({u.department for u in active})
        department_count = len(departments)
        now = datetime.now(UTC)
        new_this_month = sum(
            1 for u in active if u.created_at.year == now.year and u.created_at.month == now.month
        )
        grade_distribution: dict[str, int] = {}
        for u in active:
            grade_distribution[u.grade] = grade_distribution.get(u.grade, 0) + 1
        return total, department_count, new_this_month, grade_distribution, departments


@pytest.fixture
def repo() -> FakeUserDirectoryRepository:
    return FakeUserDirectoryRepository()


@pytest.fixture
def service(repo: FakeUserDirectoryRepository) -> UserDirectoryService:
    return UserDirectoryService(repo)  # type: ignore[arg-type]


def _payload(
    email: str = "alice@example.com",
    grade: str = "중급",
    department: str = "개발팀",
    memo: str | None = None,
) -> UserCreate:
    return UserCreate(
        name="홍길동",
        department=department,
        rank="사원",
        grade=grade,  # type: ignore[arg-type]
        employment_type="정규직",
        phone="010-1234-5678",
        email=email,  # type: ignore[arg-type]
        memo=memo,
    )


# ── memo (rich-text) round-trip ──────────────────────────────────────────────


async def test_create_withMemo_persistsAndEchoesInResponse(
    service: UserDirectoryService,
) -> None:
    created = await service.create(_payload(memo="<p><strong>중요</strong> 메모</p>"))
    assert created.memo == "<p><strong>중요</strong> 메모</p>"


async def test_create_withoutMemo_defaultsToNone(service: UserDirectoryService) -> None:
    created = await service.create(_payload())
    assert created.memo is None


# ── employee_no auto-generation ──────────────────────────────────────────────


async def test_create_first_user_assigns_emp001(service: UserDirectoryService) -> None:
    created = await service.create(_payload())
    assert created.employee_no == "EMP-001"
    assert created.name == "홍길동"  # display_name surfaces as name


async def test_create_sequential_users_increments_zero_padded_employee_no(
    service: UserDirectoryService,
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


async def test_create_duplicate_email_raises_conflict_error(service: UserDirectoryService) -> None:
    await service.create(_payload(email="dup@example.com"))
    with pytest.raises(ConflictError):
        await service.create(_payload(email="dup@example.com"))


async def test_create_with_unknown_grade_raises_app_error(service: UserDirectoryService) -> None:
    with pytest.raises(AppError):
        await service.create(_payload(email="badgrade@example.com", grade="없는등급"))


async def test_create_with_unknown_rank_raises_app_error(service: UserDirectoryService) -> None:
    payload = UserCreate(
        name="홍길동",
        department="개발팀",
        rank="없는직급",
        grade="중급",  # type: ignore[arg-type]
        phone="010-1234-5678",
        email="badrank@example.com",  # type: ignore[arg-type]
    )
    with pytest.raises(AppError):
        await service.create(payload)


async def test_create_with_provided_employee_no_uses_it(service: UserDirectoryService) -> None:
    payload = UserCreate(
        name="김사번",
        department="개발팀",
        rank="사원",
        grade="중급",  # type: ignore[arg-type]
        phone="010-0000-0000",
        email="emp@example.com",  # type: ignore[arg-type]
        employee_no="EMP-777",
    )
    created = await service.create(payload)
    assert created.employee_no == "EMP-777"


async def test_update_email_collides_with_other_user_raises_conflict_error(
    service: UserDirectoryService,
) -> None:
    a = await service.create(_payload(email="a@example.com"))
    await service.create(_payload(email="b@example.com"))
    with pytest.raises(ConflictError):
        await service.update(a.id, UserUpdate(email="b@example.com"))  # type: ignore[arg-type]


# ── soft delete excluded from default list ───────────────────────────────────


async def test_delete_soft_deletes_and_excludes_from_default_list(
    service: UserDirectoryService,
) -> None:
    keep = await service.create(_payload(email="keep@example.com"))
    drop = await service.create(_payload(email="drop@example.com"))

    await service.delete(drop.id)

    listing = await service.list()
    ids = {item.id for item in listing.items}
    assert keep.id in ids
    assert drop.id not in ids
    assert listing.total == 1


async def test_delete_unknown_user_raises_not_found_error(service: UserDirectoryService) -> None:
    with pytest.raises(NotFoundError):
        await service.delete("usr_missing")


# ── stats grade distribution sums to active total ────────────────────────────


async def test_stats_grade_distribution_sums_to_active_total(
    service: UserDirectoryService,
) -> None:
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


async def test_stats_departments_lists_distinct_active_sorted(
    service: UserDirectoryService,
) -> None:
    await service.create(_payload(email="a@example.com", department="개발팀"))
    await service.create(_payload(email="b@example.com", department="기획팀"))
    await service.create(_payload(email="c@example.com", department="개발팀"))
    deleted = await service.create(_payload(email="d@example.com", department="영업팀"))
    await service.delete(deleted.id)

    stats = await service.stats()

    assert stats.departments == ["개발팀", "기획팀"]  # distinct, sorted, soft-deleted excluded
    assert stats.department_count == 2
