"""Data access for the ``projects`` table."""

from __future__ import annotations

import builtins
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from domains.projects.models import Project, ProjectScheduleVersion


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Project]:
        result = await self._session.execute(
            select(Project).order_by(Project.start_date.desc(), Project.id)
        )
        return list(result.scalars().all())

    async def get(self, project_id: str) -> Project:
        row = await self._session.get(Project, project_id)
        if row is None:
            raise NotFoundError("Project")
        return row

    async def create(self, fields: dict[str, Any]) -> Project:
        row = Project(**fields)
        self._session.add(row)
        await self._session.flush()
        return row

    async def update(self, project_id: str, fields: dict[str, Any]) -> Project:
        row = await self.get(project_id)
        for key, value in fields.items():
            setattr(row, key, value)
        await self._session.flush()
        return row

    async def delete(self, project_id: str) -> None:
        row = await self.get(project_id)
        await self._session.delete(row)
        await self._session.flush()

    # ── Schedule versions ───────────────────────────────────────────────────

    async def add_schedule_version(
        self, project_id: str, tasks: builtins.list[dict[str, Any]], note: str
    ) -> ProjectScheduleVersion:
        """Set the project's current tasks and append an immutable snapshot."""
        project = await self.get(project_id)
        project.tasks = tasks
        version = ProjectScheduleVersion(project_id=project_id, tasks=tasks, note=note)
        self._session.add(version)
        await self._session.flush()
        return version

    async def list_schedule_versions(
        self, project_id: str
    ) -> builtins.list[ProjectScheduleVersion]:
        await self.get(project_id)  # 404 if the project is unknown
        result = await self._session.execute(
            select(ProjectScheduleVersion)
            .where(ProjectScheduleVersion.project_id == project_id)
            .order_by(ProjectScheduleVersion.created_at.desc(), ProjectScheduleVersion.id.desc())
        )
        return list(result.scalars().all())

    async def get_schedule_version(
        self, project_id: str, version_id: str
    ) -> ProjectScheduleVersion:
        version = await self._session.get(ProjectScheduleVersion, version_id)
        if version is None or version.project_id != project_id:
            raise NotFoundError("ScheduleVersion")
        return version
