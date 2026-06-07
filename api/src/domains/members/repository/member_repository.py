"""Members domain repository — all database I/O lives here.

All methods are ``async`` and accept an :class:`~sqlalchemy.ext.asyncio.AsyncSession`.

Usage::

    from domains.members.repository import MemberRepository

    repo = MemberRepository(session)
    member = await repo.get_by_id(member_id)
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.members.models import Member

# Module-level alias so the in-class ``list`` method name does not shadow the
# builtin ``list`` when these annotations are evaluated in class scope.
_Conditions = list[ColumnElement[bool]]

# Whitelist of sortable keys → ORM column. Anything else falls back to employee_no.
_SORT_COLUMNS = {
    "no": Member.employee_no,
    "name": Member.name,
    "dept": Member.department,
    "rank": Member.rank,
    "grade": Member.grade,
}

_EMP_NO_RE = re.compile(r"^EMP-(\d+)$")


class MemberRepository:
    """Thin data-access layer for the members domain."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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
    ) -> tuple[Sequence[Member], int]:
        """Return (rows, total) for the given filters/sort/page."""
        conditions = self._filter_conditions(q, department, grade, include_inactive)

        count_stmt = select(func.count()).select_from(Member)
        for cond in conditions:
            count_stmt = count_stmt.where(cond)
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt: Select[tuple[Member]] = select(Member)
        for cond in conditions:
            stmt = stmt.where(cond)

        sort_col = _SORT_COLUMNS.get(sort_key, Member.employee_no)
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
        conditions: _Conditions = []
        if not include_inactive:
            conditions.append(Member.is_active.is_(True))
        if department:
            conditions.append(Member.department == department)
        if grade:
            conditions.append(Member.grade == grade)
        if q:
            like = f"%{q}%"
            conditions.append(
                or_(
                    Member.name.ilike(like),
                    Member.employee_no.ilike(like),
                    Member.department.ilike(like),
                    Member.rank.ilike(like),
                    Member.email.ilike(like),
                    Member.phone.ilike(like),
                )
            )
        return conditions

    async def get_by_id(self, member_id: uuid.UUID) -> Member | None:
        result = await self._session.execute(select(Member).where(Member.id == member_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Member | None:
        result = await self._session.execute(
            select(Member).where(Member.email == email.strip().lower())
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: uuid.UUID) -> Member | None:
        result = await self._session.execute(select(Member).where(Member.user_id == user_id))
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
    ) -> Member:
        member = Member(
            employee_no=employee_no,
            name=name,
            department=department,
            rank=rank,
            grade=grade,
            phone=phone,
            email=email.strip().lower(),
        )
        self._session.add(member)
        await self._session.flush()
        return member

    async def update(self, member: Member, changes: dict[str, object]) -> Member:
        for key, value in changes.items():
            if key == "email" and isinstance(value, str):
                value = value.strip().lower()
            setattr(member, key, value)
        await self._session.flush()
        return member

    async def soft_delete(self, member: Member) -> None:
        member.is_active = False
        await self._session.flush()

    async def next_employee_no(self) -> str:
        """Return the next ``EMP-NNN`` sequence (max existing + 1, zero-padded)."""
        result = await self._session.execute(select(Member.employee_no))
        max_seq = 0
        for (emp_no,) in result.all():
            match = _EMP_NO_RE.match(emp_no)
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f"EMP-{max_seq + 1:03d}"

    async def link_to_user(self, email: str, user_id: uuid.UUID) -> Member | None:
        """Link an unlinked Member with a matching email to *user_id*.

        Returns the linked Member, or ``None`` if no unlinked match exists.
        """
        result = await self._session.execute(
            select(Member).where(
                Member.email == email.strip().lower(),
                Member.user_id.is_(None),
            )
        )
        member = result.scalar_one_or_none()
        if member is None:
            return None
        member.user_id = user_id
        await self._session.flush()
        return member

    # ── Stats ────────────────────────────────────────────────────────────────

    async def stats(self) -> tuple[int, int, int, dict[str, int], Sequence[str]]:
        """Return (active total, distinct dept count, this-month, grade counts, dept names)."""
        active = Member.is_active.is_(True)

        total = (
            await self._session.execute(select(func.count()).select_from(Member).where(active))
        ).scalar_one()

        department_rows = await self._session.execute(
            select(func.distinct(Member.department)).where(active).order_by(Member.department)
        )
        departments = list(department_rows.scalars().all())
        department_count = len(departments)

        now = datetime.now(UTC)
        month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
        new_this_month = (
            await self._session.execute(
                select(func.count())
                .select_from(Member)
                .where(active, Member.created_at >= month_start)
            )
        ).scalar_one()

        grade_rows = await self._session.execute(
            select(Member.grade, func.count()).where(active).group_by(Member.grade)
        )
        grade_distribution: dict[str, int] = {grade: count for grade, count in grade_rows.all()}  # noqa: C416

        return total, department_count, new_this_month, grade_distribution, departments
