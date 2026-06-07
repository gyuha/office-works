"""Members domain service — business logic for member management.

Wires the :class:`MemberRepository` data-access layer to the request/response
DTOs and translates conflicts/absence into :mod:`core.exceptions` ``AppError``
subclasses (converted to HTTP responses by the router/handlers).

Usage::

    from domains.members.service import MemberService

    service = MemberService(MemberRepository(session))
    member = await service.create(payload)
"""

from __future__ import annotations

import math
import uuid

from sqlalchemy.exc import IntegrityError

from core.exceptions import ConflictError, NotFoundError
from domains.members.repository import MemberRepository
from domains.members.schemas import (
    MemberCreate,
    MemberListResponse,
    MemberResponse,
    MemberStatsResponse,
    MemberUpdate,
)


class MemberService:
    """Member-management business logic."""

    def __init__(self, repo: MemberRepository) -> None:
        self._repo = repo

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
    ) -> MemberListResponse:
        rows, total = await self._repo.list(
            q=q,
            department=department,
            grade=grade,
            sort_key=sort_key,
            order=order,
            page=page,
            page_size=page_size,
            include_inactive=include_inactive,
        )
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return MemberListResponse(
            items=[MemberResponse.model_validate(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get(self, member_id: uuid.UUID) -> MemberResponse:
        member = await self._repo.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member")
        return MemberResponse.model_validate(member)

    async def get_by_user_id(self, user_id: uuid.UUID) -> MemberResponse:
        member = await self._repo.get_by_user_id(user_id)
        if member is None:
            raise NotFoundError("Member")
        return MemberResponse.model_validate(member)

    async def create(self, payload: MemberCreate) -> MemberResponse:
        existing = await self._repo.get_by_email(payload.email)
        if existing is not None:
            raise ConflictError(f"A member with email '{payload.email}' already exists.")

        employee_no = await self._repo.next_employee_no()
        try:
            member = await self._repo.create(
                employee_no=employee_no,
                name=payload.name,
                department=payload.department,
                rank=payload.rank,
                grade=payload.grade,
                phone=payload.phone,
                email=payload.email,
            )
        except IntegrityError as exc:
            raise ConflictError(
                "A member with the same email or employee number already exists."
            ) from exc
        return MemberResponse.model_validate(member)

    async def update(self, member_id: uuid.UUID, payload: MemberUpdate) -> MemberResponse:
        member = await self._repo.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member")

        changes = payload.model_dump(exclude_unset=True)
        new_email = changes.get("email")
        if isinstance(new_email, str) and new_email != member.email:
            clash = await self._repo.get_by_email(new_email)
            if clash is not None and clash.id != member.id:
                raise ConflictError(f"A member with email '{new_email}' already exists.")

        try:
            updated = await self._repo.update(member, changes)
        except IntegrityError as exc:
            raise ConflictError("Update conflicts with an existing member.") from exc
        return MemberResponse.model_validate(updated)

    async def delete(self, member_id: uuid.UUID) -> None:
        member = await self._repo.get_by_id(member_id)
        if member is None:
            raise NotFoundError("Member")
        await self._repo.soft_delete(member)

    async def stats(self) -> MemberStatsResponse:
        total, department_count, new_this_month, grade_distribution = await self._repo.stats()
        return MemberStatsResponse(
            total=total,
            department_count=department_count,
            new_this_month=new_this_month,
            grade_distribution=grade_distribution,
        )


__all__ = ["MemberService"]
