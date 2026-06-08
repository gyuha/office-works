"""Org-settings 고용 형태(EmploymentType) HTTP router.

Routes
------
GET    /employment-types          List employment types   — read gate
POST   /employment-types          Create one (appended)    — org:write
DELETE /employment-types/{id}     Delete one               — org:write
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.security import get_current_user, require_permission
from domains.org.repository import EmploymentTypeRepository
from domains.org.schemas import EmploymentTypeCreate, EmploymentTypeResponse
from domains.org.service import EmploymentTypeService

router = APIRouter(prefix="/employment-types", tags=["org"])


async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> EmploymentTypeService:
    return EmploymentTypeService(EmploymentTypeRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get(
    "",
    response_model=list[EmploymentTypeResponse],
    dependencies=[Depends(get_current_user)],
    summary="List employment types",
)
async def list_employment_types(
    service: EmploymentTypeService = Depends(_get_service),
) -> list[EmploymentTypeResponse]:
    types = await service.list()
    return [EmploymentTypeResponse.model_validate(t) for t in types]


@router.post(
    "",
    response_model=EmploymentTypeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Create an employment type",
)
async def create_employment_type(
    payload: EmploymentTypeCreate,
    service: EmploymentTypeService = Depends(_get_service),
) -> EmploymentTypeResponse:
    try:
        return EmploymentTypeResponse.model_validate(await service.create(payload.name))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Delete an employment type",
)
async def delete_employment_type(
    type_id: str,
    service: EmploymentTypeService = Depends(_get_service),
) -> None:
    try:
        await service.delete(type_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
