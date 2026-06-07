"""Org-settings 등급(Grade) HTTP router.

Routes
------
GET    /grades          List grades (low→high)        — read gate
POST   /grades          Create a grade                — org:write
PATCH  /grades/order    Reorder grades                — org:write
PATCH  /grades/{id}     Update (rename + meta)        — org:write
DELETE /grades/{id}     Delete (blocked if referenced)— org:write

Rename cascades to members; deletion is rejected (409) while members reference
the grade. ``/order`` is declared before ``/{grade_id}``.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.security import get_current_user, require_permission
from domains.org.repository import GradeRepository
from domains.org.schemas import GradeCreate, GradeReorder, GradeResponse, GradeUpdate
from domains.org.service import GradeService

router = APIRouter(prefix="/grades", tags=["org"])


async def _get_service(session: AsyncSession = Depends(get_async_session)) -> GradeService:
    return GradeService(GradeRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get(
    "",
    response_model=list[GradeResponse],
    dependencies=[Depends(get_current_user)],
    summary="List grades (low→high)",
)
async def list_grades(service: GradeService = Depends(_get_service)) -> list[GradeResponse]:
    grades = await service.list()
    return [GradeResponse.model_validate(g) for g in grades]


@router.post(
    "",
    response_model=GradeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Create a grade",
)
async def create_grade(
    payload: GradeCreate,
    service: GradeService = Depends(_get_service),
) -> GradeResponse:
    try:
        grade = await service.create(
            name=payload.name,
            color=payload.color,
            bg=payload.bg,
            border=payload.border,
            description=payload.description,
        )
        return GradeResponse.model_validate(grade)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.patch(
    "/order",
    response_model=list[GradeResponse],
    dependencies=[Depends(require_permission("org:write"))],
    summary="Reorder grades",
)
async def reorder_grades(
    payload: GradeReorder,
    service: GradeService = Depends(_get_service),
) -> list[GradeResponse]:
    grades = await service.reorder(payload.ordered_ids)
    return [GradeResponse.model_validate(g) for g in grades]


@router.patch(
    "/{grade_id}",
    response_model=GradeResponse,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Update a grade (rename + meta)",
)
async def update_grade(
    grade_id: uuid.UUID,
    payload: GradeUpdate,
    service: GradeService = Depends(_get_service),
) -> GradeResponse:
    try:
        return GradeResponse.model_validate(await service.update(grade_id, payload))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{grade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Delete a grade (rejected if referenced)",
)
async def delete_grade(
    grade_id: uuid.UUID,
    service: GradeService = Depends(_get_service),
) -> None:
    try:
        await service.delete(grade_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
