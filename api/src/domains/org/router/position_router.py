"""Org-settings 직급(Position) HTTP router.

Routes
------
GET    /positions          List positions (ordered low→high)   — read gate
POST   /positions          Create a position (appended)         — org:write
PATCH  /positions/order    Reorder all positions                — org:write
PATCH  /positions/{id}     Rename a position                    — org:write
DELETE /positions/{id}     Delete a position                    — org:write

Read requires an authenticated user; writes require the ``org:write`` permission.
The static ``/order`` path is declared before ``/{position_id}`` so it is not
shadowed by the path param.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.security import get_current_user, require_permission
from domains.org.repository import PositionRepository
from domains.org.schemas import (
    PositionCreate,
    PositionReorder,
    PositionResponse,
    PositionUpdate,
)
from domains.org.service import PositionService

router = APIRouter(prefix="/positions", tags=["org"])


async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> PositionService:
    return PositionService(PositionRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get(
    "",
    response_model=list[PositionResponse],
    dependencies=[Depends(get_current_user)],
    summary="List positions (low→high)",
)
async def list_positions(
    service: PositionService = Depends(_get_service),
) -> list[PositionResponse]:
    positions = await service.list()
    return [PositionResponse.model_validate(p) for p in positions]


@router.post(
    "",
    response_model=PositionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Create a position",
)
async def create_position(
    payload: PositionCreate,
    service: PositionService = Depends(_get_service),
) -> PositionResponse:
    try:
        return PositionResponse.model_validate(await service.create(payload.name))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.patch(
    "/order",
    response_model=list[PositionResponse],
    dependencies=[Depends(require_permission("org:write"))],
    summary="Reorder positions",
)
async def reorder_positions(
    payload: PositionReorder,
    service: PositionService = Depends(_get_service),
) -> list[PositionResponse]:
    positions = await service.reorder(payload.ordered_ids)
    return [PositionResponse.model_validate(p) for p in positions]


@router.patch(
    "/{position_id}",
    response_model=PositionResponse,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Rename a position",
)
async def rename_position(
    position_id: uuid.UUID,
    payload: PositionUpdate,
    service: PositionService = Depends(_get_service),
) -> PositionResponse:
    try:
        return PositionResponse.model_validate(await service.rename(position_id, payload.name))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{position_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Delete a position",
)
async def delete_position(
    position_id: uuid.UUID,
    service: PositionService = Depends(_get_service),
) -> None:
    try:
        await service.delete(position_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
