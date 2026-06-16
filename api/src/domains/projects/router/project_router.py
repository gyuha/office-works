"""Projects HTTP router.

Routes
------
GET    /projects          List projects (newest start date first)  — read gate
POST   /projects          Create a project                          — org:write
GET    /projects/{id}     Get one project (full aggregate)          — read gate
PUT    /projects/{id}     Replace a project's editable fields        — org:write
DELETE /projects/{id}     Delete a project                          — org:write

Reads require an authenticated user; writes require the ``org:write`` permission
(reused from org-settings — admins already hold it).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.exceptions import AppError
from domains.auth.security import get_current_user, require_permission
from domains.projects.repository import ProjectRepository
from domains.projects.schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ScheduleVersionCreate,
    ScheduleVersionListItem,
    ScheduleVersionResponse,
)
from domains.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_service(
    session: AsyncSession = Depends(get_async_session),
) -> ProjectService:
    return ProjectService(ProjectRepository(session))


def _app_error_to_http(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get(
    "",
    response_model=list[ProjectResponse],
    dependencies=[Depends(get_current_user)],
    summary="List projects",
)
async def list_projects(
    service: ProjectService = Depends(_get_service),
) -> list[ProjectResponse]:
    projects = await service.list()
    return [ProjectResponse.model_validate(p) for p in projects]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Create a project",
)
async def create_project(
    payload: ProjectCreate,
    service: ProjectService = Depends(_get_service),
) -> ProjectResponse:
    return ProjectResponse.model_validate(await service.create(payload))


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(get_current_user)],
    summary="Get a project",
)
async def get_project(
    project_id: str,
    service: ProjectService = Depends(_get_service),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(await service.get(project_id))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Replace a project",
)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    service: ProjectService = Depends(_get_service),
) -> ProjectResponse:
    try:
        return ProjectResponse.model_validate(await service.update(project_id, payload))
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Delete a project",
)
async def delete_project(
    project_id: str,
    service: ProjectService = Depends(_get_service),
) -> None:
    try:
        await service.delete(project_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc


# ── Schedule history ────────────────────────────────────────────────────────


@router.post(
    "/{project_id}/schedule/versions",
    response_model=ScheduleVersionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("org:write"))],
    summary="Save the schedule (snapshot + set current)",
)
async def save_schedule(
    project_id: str,
    payload: ScheduleVersionCreate,
    service: ProjectService = Depends(_get_service),
) -> ScheduleVersionResponse:
    try:
        version = await service.save_schedule(project_id, payload)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
    return ScheduleVersionResponse.model_validate(version)


@router.get(
    "/{project_id}/schedule/versions",
    response_model=list[ScheduleVersionListItem],
    dependencies=[Depends(get_current_user)],
    summary="List schedule history (newest first)",
)
async def list_schedule_versions(
    project_id: str,
    service: ProjectService = Depends(_get_service),
) -> list[ScheduleVersionListItem]:
    try:
        versions = await service.list_schedule_versions(project_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
    return [
        ScheduleVersionListItem(
            id=v.id,
            project_id=v.project_id,
            note=v.note,
            task_count=len(v.tasks),
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get(
    "/{project_id}/schedule/versions/{version_id}",
    response_model=ScheduleVersionResponse,
    dependencies=[Depends(get_current_user)],
    summary="Load one schedule version",
)
async def get_schedule_version(
    project_id: str,
    version_id: str,
    service: ProjectService = Depends(_get_service),
) -> ScheduleVersionResponse:
    try:
        version = await service.get_schedule_version(project_id, version_id)
    except AppError as exc:
        raise _app_error_to_http(exc) from exc
    return ScheduleVersionResponse.model_validate(version)
