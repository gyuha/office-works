"""Users domain service — employee-directory business logic.

Wires :class:`UserDirectoryRepository` to the request/response DTOs and
translates conflicts/absence into :mod:`core.exceptions` ``AppError`` subclasses
(converted to HTTP responses by the router/handlers).

Usage::

    from domains.users.service import UserDirectoryService

    service = UserDirectoryService(UserDirectoryRepository(session))
    user = await service.create(payload)
"""

from __future__ import annotations

import math

from sqlalchemy.exc import IntegrityError

from core.exceptions import AppError, ConflictError, NotFoundError
from domains.users.repository import UserDirectoryRepository
from domains.users.schemas import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserStatsResponse,
    UserUpdate,
)


class UserDirectoryService:
    """Employee-directory business logic over the merged ``users`` table."""

    def __init__(self, repo: UserDirectoryRepository) -> None:
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
    ) -> UserListResponse:
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
        return UserListResponse(
            items=[UserResponse.model_validate(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get(self, user_id: str) -> UserResponse:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User")
        return UserResponse.model_validate(user)

    async def _validate_grade(self, grade: str) -> None:
        """Grade must be a name present in the org `grades` table."""
        if not await self._repo.grade_exists(grade):
            raise AppError(f"Unknown grade '{grade}'.")

    async def _validate_rank(self, rank: str) -> None:
        """Rank must be a name present in the org `positions` table (grade와 동일 패턴)."""
        if not await self._repo.position_exists(rank):
            raise AppError(f"Unknown rank '{rank}'.")

    async def create(self, payload: UserCreate) -> UserResponse:
        existing = await self._repo.get_by_email(payload.email)
        if existing is not None:
            raise ConflictError(f"A user with email '{payload.email}' already exists.")
        await self._validate_grade(payload.grade)
        await self._validate_rank(payload.rank)

        # 사번 직접 입력 시 그 값 사용, 비면 서버 자동생성. 중복은 아래 IntegrityError로 409.
        employee_no = payload.employee_no or await self._repo.next_employee_no()
        try:
            user = await self._repo.create(
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
                "A user with the same email or employee number already exists."
            ) from exc
        return UserResponse.model_validate(user)

    async def update(self, user_id: str, payload: UserUpdate) -> UserResponse:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User")

        changes = payload.model_dump(exclude_unset=True)
        new_email = changes.get("email")
        if isinstance(new_email, str) and new_email != user.email:
            clash = await self._repo.get_by_email(new_email)
            if clash is not None and clash.id != user.id:
                raise ConflictError(f"A user with email '{new_email}' already exists.")

        new_grade = changes.get("grade")
        if isinstance(new_grade, str):
            await self._validate_grade(new_grade)

        new_rank = changes.get("rank")
        if isinstance(new_rank, str):
            await self._validate_rank(new_rank)

        try:
            updated = await self._repo.update(user, changes)
        except IntegrityError as exc:
            raise ConflictError("Update conflicts with an existing user.") from exc
        return UserResponse.model_validate(updated)

    async def delete(self, user_id: str) -> None:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User")
        await self._repo.soft_delete(user)

    async def stats(self) -> UserStatsResponse:
        (
            total,
            department_count,
            new_this_month,
            grade_distribution,
            departments,
        ) = await self._repo.stats()
        return UserStatsResponse(
            total=total,
            department_count=department_count,
            new_this_month=new_this_month,
            grade_distribution=grade_distribution,
            departments=list(departments),
        )


__all__ = ["UserDirectoryService"]
