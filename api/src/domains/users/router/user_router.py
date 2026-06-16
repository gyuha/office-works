"""Users domain HTTP router — the employee directory.

Routes
------
GET    /users            List employees (search/filter/sort/paginate) — read gate
GET    /users/stats      Summary statistics for dashboard cards       — read gate
GET    /users/me         The current user's own directory record      — read gate
GET    /users/export     CSV export of the current filter             — read gate
GET    /users/{id}       Single directory record                      — read gate
POST   /users            Create an employee (사번 server-generated)    — users:write
PATCH  /users/{id}       Partial update                               — users:write
DELETE /users/{id}       Soft delete (is_active=false)                — users:write

Read endpoints require an authenticated user (:func:`get_current_user`); write
endpoints additionally require the ``users:write`` permission
(:func:`require_permission`). Static paths (``/me``, ``/stats``, ``/export``) are
declared before ``/{user_id}`` so they are not shadowed by the path param.
"""

from __future__ import annotations

import csv
import io
from collections.abc import AsyncIterator
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.models import User
from domains.auth.security import get_current_user, require_permission
from domains.users.repository import UserDirectoryRepository
from domains.users.schemas import (
    UserCreate,
    UserImportResult,
    UserImportRowError,
    UserListResponse,
    UserResponse,
    UserStatsResponse,
    UserUpdate,
)
from domains.users.service import UserDirectoryService
from domains.users.service.user_import import build_import_template, parse_import_rows

_XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

router = APIRouter(prefix="/users", tags=["users"])


# ---------------------------------------------------------------------------
# Dependency helpers
# ---------------------------------------------------------------------------


async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> UserDirectoryService:
    """FastAPI dependency — build a :class:`UserDirectoryService` per request."""
    return UserDirectoryService(UserDirectoryRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


# ---------------------------------------------------------------------------
# Read endpoints (static paths first)
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=UserListResponse,
    summary="List employees",
)
async def list_users(
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
    service: UserDirectoryService = Depends(_get_service),
) -> UserListResponse:
    """Return a paginated, filtered, sorted list of active employees."""
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
    response_model=UserStatsResponse,
    summary="Employee summary statistics",
)
async def user_stats(
    _current_user: User = Depends(get_current_user),
    service: UserDirectoryService = Depends(_get_service),
) -> UserStatsResponse:
    """Return summary statistics over active employees for the dashboard cards."""
    return await service.stats()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current user's directory record",
)
async def my_record(
    current_user: User = Depends(get_current_user),
    service: UserDirectoryService = Depends(_get_service),
) -> UserResponse:
    """Return the current user's own directory record (their ``users`` row)."""
    try:
        return await service.get(current_user.id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.get(
    "/export",
    summary="Export employees as CSV",
)
async def export_users(
    q: str | None = None,
    department: str | None = None,
    grade: str | None = None,
    sort: Literal["no", "name", "dept", "rank", "grade"] = "no",
    order: Literal["asc", "desc"] = "asc",
    _current_user: User = Depends(get_current_user),
    service: UserDirectoryService = Depends(_get_service),
) -> StreamingResponse:
    """Stream the current filter's active employees as a CSV file."""
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
        writer.writerow(["employee_no", "name", "department", "rank", "grade", "phone", "email"])
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
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )


@router.get(
    "/import-template",
    summary="Download the .xlsx bulk-import template",
)
async def import_template(
    _current_user: User = Depends(get_current_user),
) -> Response:
    """Return a blank ``.xlsx`` with the canonical header row for bulk import."""
    return Response(
        content=build_import_template(),
        media_type=_XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": "attachment; filename=users_template.xlsx"},
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Directory record detail",
)
async def get_user(
    user_id: str,
    _current_user: User = Depends(get_current_user),
    service: UserDirectoryService = Depends(_get_service),
) -> UserResponse:
    """Return a single directory record by id, or 404 if not found."""
    try:
        return await service.get(user_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


# ---------------------------------------------------------------------------
# Write endpoints (users:write)
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("users:write"))],
    summary="Create an employee",
)
async def create_user(
    payload: UserCreate,
    service: UserDirectoryService = Depends(_get_service),
) -> UserResponse:
    """Create a new employee. The employee number (사번) is server-generated."""
    try:
        return await service.create(payload)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.post(
    "/import",
    response_model=UserImportResult,
    dependencies=[Depends(require_permission("users:write"))],
    summary="Bulk-create employees from an .xlsx upload (partial success)",
)
async def import_users(
    file: UploadFile = File(...),
    service: UserDirectoryService = Depends(_get_service),
) -> UserImportResult:
    """Parse the uploaded ``.xlsx`` and create each valid row.

    Partial success: invalid rows and duplicate emails are collected as failures
    (with their 1-based Excel row number) rather than aborting the whole upload.
    """
    raw = await file.read()
    try:
        valid_rows, errors = parse_import_rows(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    failed: list[UserImportRowError] = list(errors)
    created = 0
    for excel_row, user in valid_rows:
        try:
            await service.create(user)
            created += 1
        except AppError as exc:  # ConflictError(dup email) and any other domain error
            failed.append(UserImportRowError(row=excel_row, reason=f"{user.email}: {exc.message}"))

    failed.sort(key=lambda e: e.row)
    return UserImportResult(created=created, failed=failed)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("users:write"))],
    summary="Update an employee",
)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    service: UserDirectoryService = Depends(_get_service),
) -> UserResponse:
    """Partially update an employee directory record."""
    try:
        return await service.update(user_id, payload)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("users:write"))],
    summary="Soft-delete an employee",
)
async def delete_user(
    user_id: str,
    service: UserDirectoryService = Depends(_get_service),
) -> None:
    """Soft-delete an employee (sets ``is_active=false``)."""
    try:
        await service.delete(user_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
