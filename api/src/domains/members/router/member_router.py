"""Members domain HTTP router.

Routes
------
GET    /members            List members (search/filter/sort/paginate) — read gate
GET    /members/stats      Summary statistics for dashboard cards    — read gate
GET    /members/me         The current user's linked Member          — read gate
GET    /members/export     CSV export of the current filter          — read gate
GET    /members/{id}       Single member detail                      — read gate
POST   /members            Create a member (사번 server-generated)    — members:write
PATCH  /members/{id}       Partial update                            — members:write
DELETE /members/{id}       Soft delete (is_active=false)             — members:write

Read endpoints require an authenticated user (:func:`get_current_user`); write
endpoints additionally require the ``members:write`` permission
(:func:`require_permission`). Static paths (``/me``, ``/stats``, ``/export``)
are declared before ``/{member_id}`` so they are not shadowed by the path param.
"""

from __future__ import annotations

import csv
import io
import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.models import User
from domains.auth.security import get_current_user, require_permission
from domains.members.repository import MemberRepository
from domains.members.schemas import (
    MemberCreate,
    MemberListResponse,
    MemberResponse,
    MemberStatsResponse,
    MemberUpdate,
)
from domains.members.service import MemberService

router = APIRouter(prefix="/members", tags=["members"])


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------


async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> MemberService:
    """FastAPI dependency — build a :class:`MemberService` per request."""
    return MemberService(MemberRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


# ---------------------------------------------------------------------------
# Read endpoints (static paths first)
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=MemberListResponse,
    summary="List members",
)
async def list_members(
    q: Annotated[
        str | None,
        Query(description="검색어 — 이름/사번/소속/직급/이메일/연락처 부분일치"),
    ] = None,
    department: str | None = None,
    grade: str | None = None,
    sort: Literal["no", "name", "dept", "rank", "grade"] = "no",
    order: Literal["asc", "desc"] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    _current_user: User = Depends(get_current_user),
    service: MemberService = Depends(_get_service),
) -> MemberListResponse:
    """Return a paginated, filtered, sorted list of active members."""
    return await service.list(
        q=q,
        department=department,
        grade=grade,
        sort_key=sort,
        order=order,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/stats",
    response_model=MemberStatsResponse,
    summary="Member summary statistics",
)
async def member_stats(
    _current_user: User = Depends(get_current_user),
    service: MemberService = Depends(_get_service),
) -> MemberStatsResponse:
    """Return summary statistics over active members for the dashboard cards."""
    return await service.stats()


@router.get(
    "/me",
    response_model=MemberResponse,
    summary="Current user's linked Member",
)
async def my_member(
    current_user: User = Depends(get_current_user),
    service: MemberService = Depends(_get_service),
) -> MemberResponse:
    """Return the Member linked to the current user, or 404 if none is linked."""
    try:
        return await service.get_by_user_id(current_user.id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.get(
    "/export",
    summary="Export members as CSV",
)
async def export_members(
    q: str | None = None,
    department: str | None = None,
    grade: str | None = None,
    sort: Literal["no", "name", "dept", "rank", "grade"] = "no",
    order: Literal["asc", "desc"] = "asc",
    _current_user: User = Depends(get_current_user),
    service: MemberService = Depends(_get_service),
) -> StreamingResponse:
    """Stream the current filter's active members as a CSV file."""
    result = await service.list(
        q=q,
        department=department,
        grade=grade,
        sort_key=sort,
        order=order,
        page=1,
        page_size=10_000,
    )

    async def _rows() -> AsyncIterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["employee_no", "name", "department", "rank", "grade", "phone", "email"]
        )
        for item in result.items:
            writer.writerow(
                [
                    item.employee_no,
                    item.name,
                    item.department,
                    item.rank,
                    item.grade,
                    item.phone,
                    item.email,
                ]
            )
        yield buffer.getvalue()

    return StreamingResponse(
        _rows(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=members.csv"},
    )


@router.get(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Member detail",
)
async def get_member(
    member_id: uuid.UUID,
    _current_user: User = Depends(get_current_user),
    service: MemberService = Depends(_get_service),
) -> MemberResponse:
    """Return a single member by id, or 404 if not found."""
    try:
        return await service.get(member_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


# ---------------------------------------------------------------------------
# Write endpoints (members:write)
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("members:write"))],
    summary="Create a member",
)
async def create_member(
    payload: MemberCreate,
    service: MemberService = Depends(_get_service),
) -> MemberResponse:
    """Create a new member. The employee number (사번) is server-generated."""
    try:
        return await service.create(payload)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.patch(
    "/{member_id}",
    response_model=MemberResponse,
    dependencies=[Depends(require_permission("members:write"))],
    summary="Update a member",
)
async def update_member(
    member_id: uuid.UUID,
    payload: MemberUpdate,
    service: MemberService = Depends(_get_service),
) -> MemberResponse:
    """Partially update a member."""
    try:
        return await service.update(member_id, payload)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("members:write"))],
    summary="Soft-delete a member",
)
async def delete_member(
    member_id: uuid.UUID,
    service: MemberService = Depends(_get_service),
) -> None:
    """Soft-delete a member (sets ``is_active=false``)."""
    try:
        await service.delete(member_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
