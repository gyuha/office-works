"""Services for the org config singletons (get / put-replace)."""

from __future__ import annotations

from domains.org.models import CompanyInfo, LeaveSettings, WorkSettings
from domains.org.repository import (
    CompanyInfoRepository,
    LeaveSettingsRepository,
    WorkSettingsRepository,
)
from domains.org.schemas import CompanyInfoData, LeaveSettingsData, WorkSettingsData


class WorkSettingsService:
    def __init__(self, repo: WorkSettingsRepository) -> None:
        self._repo = repo

    async def get(self) -> WorkSettings:
        return await self._repo.get()

    async def put(self, payload: WorkSettingsData) -> WorkSettings:
        return await self._repo.update(payload.model_dump())


class LeaveSettingsService:
    def __init__(self, repo: LeaveSettingsRepository) -> None:
        self._repo = repo

    async def get(self) -> LeaveSettings:
        return await self._repo.get()

    async def put(self, payload: LeaveSettingsData) -> LeaveSettings:
        return await self._repo.update(payload.model_dump())


class CompanyInfoService:
    def __init__(self, repo: CompanyInfoRepository) -> None:
        self._repo = repo

    async def get(self) -> CompanyInfo:
        return await self._repo.get()

    async def put(self, payload: CompanyInfoData) -> CompanyInfo:
        return await self._repo.update(payload.model_dump())


__all__ = ["CompanyInfoService", "LeaveSettingsService", "WorkSettingsService"]
