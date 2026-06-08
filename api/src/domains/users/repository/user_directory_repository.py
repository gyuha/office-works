"""Users domain repository — employee-directory data I/O over the ``users`` table.

The directory is the set of ``users`` rows that carry an ``employee_no`` (= an
employee / 구성원). Auth-only and system rows (``employee_no`` NULL) are excluded
from listings and stats. The person's name lives in ``users.display_name``; the
``name`` API field maps to it (see ADR-0006).

All methods are ``async`` and accept an :class:`~sqlalchemy.ext.asyncio.AsyncSession`.

Usage::

    from domains.users.repository import UserDirectoryRepository

    repo = UserDirectoryRepository(session)
    user = await repo.get_by_id(user_id)
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import ColumnElement, Select, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from domains.auth.models import User

# Module-level alias so the in-class ``list`` method name does not shadow the
# builtin ``list`` when these annotations are evaluated in class scope.
_Conditions = list[ColumnElement[bool]]

# Whitelist of sortable keys → ORM column. Anything else falls back to employee_no.
_SORT_COLUMNS = {
    "no": User.employee_no,
    "name": User.display_name,
    "dept": User.department,
    "rank": User.rank,
    "grade": User.grade,
}

_EMP_NO_RE = re.compile(r"^EMP-(\d+)$")


class UserDirectoryRepository:
    """Thin data-access layer for the employee directory (users table)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def grade_exists(self, name: str) -> bool:
        """Whether *name* is a valid grade in the org ``grades`` table (raw SQL)."""
        result = await self._session.execute(
            text("SELECT 1 FROM grades WHERE name = :name LIMIT 1"), {"name": name}
        )
        return result.scalar_one_or_none() is not None

    # ── Queries ────────────────────────────────────────────────────────────

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
    ) -> tuple[Sequence[User], int]:
        """Return (rows, total) of employees for the given filters/sort/page."""
        conditions = self._filter_conditions(q, department, grade, include_inactive)

        count_stmt = select(func.count()).select_from(User)
        for cond in conditions:
            count_stmt = count_stmt.where(cond)
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt: Select[tuple[User]] = select(User)
        for cond in conditions:
            stmt = stmt.where(cond)

        sort_col = _SORT_COLUMNS.get(sort_key, User.employee_no)
        stmt = stmt.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        rows = list((await self._session.execute(stmt)).scalars().all())
        return rows, total

    def _filter_conditions(
        self,
        q: str | None,
        department: str | None,
        grade: str | None,
        include_inactive: bool,
    ) -> _Conditions:
        # Directory = users that are employees (employee_no present).
        conditions: _Conditions = [User.employee_no.is_not(None)]
        if not include_inactive:
            conditions.append(User.is_active.is_(True))
        if department:
            conditions.append(User.department == department)
        if grade:
            conditions.append(User.grade == grade)
        if q:
            like = f"%{q}%"
            conditions.append(
                or_(
                    User.display_name.ilike(like),
                    User.employee_no.ilike(like),
                    User.department.ilike(like),
                    User.rank.ilike(like),
                    User.email.ilike(like),
                    User.phone.ilike(like),
                )
            )
        return conditions

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self._session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(User).where(User.email == email.strip().lower())
        )
        return result.scalar_one_or_none()

    # ── Mutations ────────────────────────────────────────────────────────────

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
    ) -> User:
        """Create a credential-less employee user (pre-registered, no login yet)."""
        user = User(
            email=email.strip().lower(),
            display_name=name,
            hashed_password=None,
            is_verified=False,
            is_active=True,
            employee_no=employee_no,
            department=department,
            rank=rank,
            grade=grade,
            phone=phone,
        )
        self._session.add(user)
        await self._session.flush()
        return user

    async def update(self, user: User, changes: dict[str, object]) -> User:
        for key, value in changes.items():
            if key == "name":
                # API ``name`` maps to the ORM ``display_name`` column.
                user.display_name = value  # type: ignore[assignment]
            elif key == "email" and isinstance(value, str):
                user.email = value.strip().lower()
            else:
                setattr(user, key, value)
        await self._session.flush()
        return user

    async def soft_delete(self, user: User) -> None:
        user.is_active = False
        await self._session.flush()

    async def next_employee_no(self) -> str:
        """Return the next ``EMP-NNN`` sequence (max existing + 1, zero-padded)."""
        result = await self._session.execute(
            select(User.employee_no).where(User.employee_no.is_not(None))
        )
        max_seq = 0
        for (emp_no,) in result.all():
            match = _EMP_NO_RE.match(emp_no)
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f"EMP-{max_seq + 1:03d}"

    # ── Stats ────────────────────────────────────────────────────────────────

    async def stats(self) -> tuple[int, int, int, dict[str, int], Sequence[str]]:
        """Return (active total, distinct dept count, this-month, grade counts, dept names).

        Scoped to employees (``employee_no`` present) that are active.
        """
        active = (User.is_active.is_(True), User.employee_no.is_not(None))

        total = (
            await self._session.execute(select(func.count()).select_from(User).where(*active))
        ).scalar_one()

        department_rows = await self._session.execute(
            select(func.distinct(User.department)).where(*active).order_by(User.department)
        )
        departments = list(department_rows.scalars().all())
        department_count = len(departments)

        now = datetime.now(UTC)
        month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
        new_this_month = (
            await self._session.execute(
                select(func.count())
                .select_from(User)
                .where(*active, User.created_at >= month_start)
            )
        ).scalar_one()

        grade_rows = await self._session.execute(
            select(User.grade, func.count()).where(*active).group_by(User.grade)
        )
        grade_distribution: dict[str, int] = {grade: count for grade, count in grade_rows.all()}  # noqa: C416

        return total, department_count, new_this_month, grade_distribution, departments
