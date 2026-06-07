"""Org config singletons HTTP router.

Routes
------
GET /org/work-settings   ·  PUT /org/work-settings    — 근무 기본값
GET /org/leave-settings  ·  PUT /org/leave-settings   — 연차 설정
GET /org/company         ·  PUT /org/company          — 회사 정보

GET requires an authenticated user; PUT requires the ``org:write`` permission.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from domains.auth.security import get_current_user, require_permission
from domains.org.repository import (
    CompanyInfoRepository,
    LeaveSettingsRepository,
    WorkSettingsRepository,
)
from domains.org.schemas import CompanyInfoData, LeaveSettingsData, WorkSettingsData
from domains.org.service import CompanyInfoService, LeaveSettingsService, WorkSettingsService

router = APIRouter(prefix="/org", tags=["org"])


@router.get(
    "/work-settings", response_model=WorkSettingsData, dependencies=[Depends(get_current_user)]
)
async def get_work_settings(
    session: AsyncSession = Depends(get_async_session),
) -> WorkSettingsData:
    row = await WorkSettingsService(WorkSettingsRepository(session)).get()
    return WorkSettingsData.model_validate(row)


@router.put(
    "/work-settings",
    response_model=WorkSettingsData,
    dependencies=[Depends(require_permission("org:write"))],
)
async def put_work_settings(
    payload: WorkSettingsData,
    session: AsyncSession = Depends(get_async_session),
) -> WorkSettingsData:
    row = await WorkSettingsService(WorkSettingsRepository(session)).put(payload)
    return WorkSettingsData.model_validate(row)


@router.get(
    "/leave-settings", response_model=LeaveSettingsData, dependencies=[Depends(get_current_user)]
)
async def get_leave_settings(
    session: AsyncSession = Depends(get_async_session),
) -> LeaveSettingsData:
    row = await LeaveSettingsService(LeaveSettingsRepository(session)).get()
    return LeaveSettingsData.model_validate(row)


@router.put(
    "/leave-settings",
    response_model=LeaveSettingsData,
    dependencies=[Depends(require_permission("org:write"))],
)
async def put_leave_settings(
    payload: LeaveSettingsData,
    session: AsyncSession = Depends(get_async_session),
) -> LeaveSettingsData:
    row = await LeaveSettingsService(LeaveSettingsRepository(session)).put(payload)
    return LeaveSettingsData.model_validate(row)


@router.get("/company", response_model=CompanyInfoData, dependencies=[Depends(get_current_user)])
async def get_company(session: AsyncSession = Depends(get_async_session)) -> CompanyInfoData:
    row = await CompanyInfoService(CompanyInfoRepository(session)).get()
    return CompanyInfoData.model_validate(row)


@router.put(
    "/company",
    response_model=CompanyInfoData,
    dependencies=[Depends(require_permission("org:write"))],
)
async def put_company(
    payload: CompanyInfoData,
    session: AsyncSession = Depends(get_async_session),
) -> CompanyInfoData:
    row = await CompanyInfoService(CompanyInfoRepository(session)).put(payload)
    return CompanyInfoData.model_validate(row)
