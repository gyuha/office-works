"""Project service unit tests (in-memory fake repo, no DB)."""

from __future__ import annotations

from typing import Any

import pytest

from core.exceptions import NotFoundError
from domains.projects.schemas import ProjectCreate, ProjectUpdate, ScheduleVersionCreate
from domains.projects.service import ProjectService

pytestmark = pytest.mark.unit


class FakeRow:
    """Stand-in ORM row exposing fields as attributes."""

    def __init__(self, fields: dict[str, Any]) -> None:
        self.__dict__.update(fields)


class FakeProjectRepo:
    def __init__(self) -> None:
        self.rows: dict[str, FakeRow] = {}
        self.versions: list[FakeRow] = []
        self._counter = 0

    async def list(self) -> list[FakeRow]:
        return list(self.rows.values())

    async def get(self, project_id: str) -> FakeRow:
        row = self.rows.get(project_id)
        if row is None:
            raise NotFoundError("Project")
        return row

    async def create(self, fields: dict[str, Any]) -> FakeRow:
        self._counter += 1
        pid = f"prj_test_{self._counter}"
        row = FakeRow({"id": pid, **fields})
        self.rows[pid] = row
        return row

    async def update(self, project_id: str, fields: dict[str, Any]) -> FakeRow:
        row = await self.get(project_id)
        row.__dict__.update(fields)
        return row

    async def delete(self, project_id: str) -> None:
        await self.get(project_id)
        del self.rows[project_id]

    async def add_schedule_version(
        self, project_id: str, tasks: list[dict[str, Any]], note: str
    ) -> FakeRow:
        project = await self.get(project_id)
        project.tasks = tasks
        self._counter += 1
        version = FakeRow(
            {"id": f"psv_{self._counter}", "project_id": project_id, "tasks": tasks, "note": note}
        )
        self.versions.append(version)
        return version

    async def list_schedule_versions(self, project_id: str) -> list[FakeRow]:
        await self.get(project_id)
        return [v for v in reversed(self.versions) if v.project_id == project_id]

    async def get_schedule_version(self, project_id: str, version_id: str) -> FakeRow:
        for v in self.versions:
            if v.id == version_id and v.project_id == project_id:
                return v
        raise NotFoundError("ScheduleVersion")


def _create_payload(**overrides: Any) -> ProjectCreate:
    base: dict[str, Any] = {
        "name": "스마트 HR 시스템",
        "client": "삼성전자",
        "status": "진행중",
        "progress": 10,
        "pm": "윤서준",
        "startDate": "2024-03-01",
        "endDate": "2024-08-31",
        "budget": 250000000,
        "spent": 0,
        "desc": "설명",
        "members": [{"id": "EMP-001", "name": "김지훈"}],
        "tasks": [{"name": "요구사항 분석", "done": 100, "dept": "기획"}],
    }
    base.update(overrides)
    return ProjectCreate.model_validate(base)


async def test_create_persists_scalar_and_jsonb_fields() -> None:
    svc = ProjectService(FakeProjectRepo())  # type: ignore[arg-type]
    row = await svc.create(_create_payload())
    assert row.id.startswith("prj_")
    assert row.name == "스마트 HR 시스템"
    # camelCase aliases land on snake_case ORM attributes
    assert row.start_date == "2024-03-01"
    assert row.description == "설명"
    # nested collections are dumped to plain dicts for JSONB storage
    assert row.members[0]["id"] == "EMP-001"
    assert row.tasks[0]["dept"] == "기획"


async def test_get_unknown_id_raises_not_found() -> None:
    svc = ProjectService(FakeProjectRepo())  # type: ignore[arg-type]
    with pytest.raises(NotFoundError):
        await svc.get("prj_missing")


async def test_update_replaces_whole_aggregate() -> None:
    repo = FakeProjectRepo()
    svc = ProjectService(repo)  # type: ignore[arg-type]
    created = await svc.create(_create_payload())

    payload = ProjectUpdate.model_validate(
        {
            "name": "이름 변경",
            "client": "LG",
            "status": "완료",
            "progress": 100,
            "pm": "정다은",
            "startDate": "2024-03-01",
            "endDate": "2024-09-30",
            "budget": 300000000,
            "spent": 280000000,
            "desc": "갱신",
            "members": [],
            "tasks": [],
            "contracts": [{"name": "본계약", "amount": 1000, "type": "용역", "status": "체결"}],
        }
    )
    updated = await svc.update(created.id, payload)
    assert updated.name == "이름 변경"
    assert updated.progress == 100
    assert updated.members == []  # cleared
    assert updated.contracts[0]["name"] == "본계약"


async def test_delete_removes_row() -> None:
    repo = FakeProjectRepo()
    svc = ProjectService(repo)  # type: ignore[arg-type]
    created = await svc.create(_create_payload())
    await svc.delete(created.id)
    assert await svc.list() == []
    with pytest.raises(NotFoundError):
        await svc.delete(created.id)


async def test_save_schedule_updates_current_tasks_and_appends_version() -> None:
    repo = FakeProjectRepo()
    svc = ProjectService(repo)  # type: ignore[arg-type]
    created = await svc.create(_create_payload())

    payload = ScheduleVersionCreate.model_validate(
        {
            "note": "1차 일정",
            "tasks": [
                {"id": "t1", "name": "설계", "start": "2024-03-01", "end": "2024-03-31", "done": 0},
                {"id": "t2", "name": "개발", "start": "2024-04-01", "end": "2024-06-30", "done": 0},
            ],
        }
    )
    version = await svc.save_schedule(created.id, payload)
    assert version.note == "1차 일정"
    assert len(version.tasks) == 2
    # current project tasks reflect the saved snapshot
    assert len(repo.rows[created.id].tasks) == 2
    assert repo.rows[created.id].tasks[0]["id"] == "t1"


async def test_schedule_versions_listed_newest_first_and_loadable() -> None:
    repo = FakeProjectRepo()
    svc = ProjectService(repo)  # type: ignore[arg-type]
    created = await svc.create(_create_payload())

    v1 = await svc.save_schedule(
        created.id, ScheduleVersionCreate.model_validate({"note": "v1", "tasks": []})
    )
    v2 = await svc.save_schedule(
        created.id,
        ScheduleVersionCreate.model_validate(
            {"note": "v2", "tasks": [{"id": "t1", "name": "작업"}]}
        ),
    )
    listed = await svc.list_schedule_versions(created.id)
    assert [v.id for v in listed] == [v2.id, v1.id]  # newest first

    loaded = await svc.get_schedule_version(created.id, v2.id)
    assert loaded.tasks[0]["name"] == "작업"


async def test_get_schedule_version_unknown_raises_not_found() -> None:
    repo = FakeProjectRepo()
    svc = ProjectService(repo)  # type: ignore[arg-type]
    created = await svc.create(_create_payload())
    with pytest.raises(NotFoundError):
        await svc.get_schedule_version(created.id, "psv_missing")
