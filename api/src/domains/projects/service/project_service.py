"""Project application service — list / get / create / update / delete."""

from __future__ import annotations

import builtins

from domains.projects.models import Project, ProjectScheduleVersion
from domains.projects.repository import ProjectRepository
from domains.projects.schemas import ProjectCreate, ProjectUpdate, ScheduleVersionCreate


class ProjectService:
    def __init__(self, repo: ProjectRepository) -> None:
        self._repo = repo

    async def list(self) -> list[Project]:
        return await self._repo.list()

    async def get(self, project_id: str) -> Project:
        return await self._repo.get(project_id)

    async def create(self, payload: ProjectCreate) -> Project:
        return await self._repo.create(payload.model_dump())

    async def update(self, project_id: str, payload: ProjectUpdate) -> Project:
        return await self._repo.update(project_id, payload.model_dump())

    async def delete(self, project_id: str) -> None:
        await self._repo.delete(project_id)

    # ── Schedule versions ───────────────────────────────────────────────────

    async def save_schedule(
        self, project_id: str, payload: ScheduleVersionCreate
    ) -> ProjectScheduleVersion:
        tasks = [t.model_dump() for t in payload.tasks]
        return await self._repo.add_schedule_version(project_id, tasks, payload.note)

    async def list_schedule_versions(
        self, project_id: str
    ) -> builtins.list[ProjectScheduleVersion]:
        return await self._repo.list_schedule_versions(project_id)

    async def get_schedule_version(
        self, project_id: str, version_id: str
    ) -> ProjectScheduleVersion:
        return await self._repo.get_schedule_version(project_id, version_id)


__all__ = ["ProjectService"]
