"""Projects domain Pydantic schemas (request / response DTOs).

The nested collection items mirror the frontend object shapes verbatim (they are
stored as JSONB), so their field names stay camelCase where the UI uses it
(e.g. ``fileName``). Only the three top-level scalar fields whose Python /
ORM names differ from the UI carry an alias so the API speaks the UI's
vocabulary: ``start_date``→``startDate``, ``end_date``→``endDate``,
``description``→``desc``.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemberItem(BaseModel):
    id: str
    name: str
    rank: str = ""
    role: str = ""
    grade: str = ""
    start: str = ""
    end: str = ""
    active: bool = True


class TaskItem(BaseModel):
    id: str = ""
    name: str
    start: str = ""
    end: str = ""
    done: int = 0
    dept: str = ""


class ContractItem(BaseModel):
    name: str
    date: str = ""
    amount: int = 0
    type: str = ""
    status: str = ""
    fileName: str = ""  # noqa: N815 — JSONB key mirrors the UI field name verbatim


class IssueItem(BaseModel):
    no: int
    title: str
    type: str = ""
    priority: str = ""
    status: str = ""
    date: str = ""
    assignee: str = ""
    desc: str = ""


class CostItem(BaseModel):
    category: str
    budgeted: int = 0
    actual: int = 0
    date: str = ""


class ProjectBase(BaseModel):
    """Editable fields shared by create / update / response."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    name: str
    client: str = ""
    status: str = "대기"
    progress: int = 0
    pm: str = ""
    start_date: str = Field(default="", alias="startDate")
    end_date: str = Field(default="", alias="endDate")
    budget: int = 0
    spent: int = 0
    description: str = Field(default="", alias="desc")
    members: list[MemberItem] = Field(default_factory=list)
    tasks: list[TaskItem] = Field(default_factory=list)
    contracts: list[ContractItem] = Field(default_factory=list)
    issues: list[IssueItem] = Field(default_factory=list)
    costs: list[CostItem] = Field(default_factory=list)


class ProjectCreate(ProjectBase):
    """Payload to create a project (server generates the id)."""


class ProjectUpdate(ProjectBase):
    """Payload to replace a project's editable fields wholesale (PUT)."""


class ProjectResponse(ProjectBase):
    """A project as returned by the API — includes its id."""

    id: str


# ── Schedule history (versions) ─────────────────────────────────────────────


class ScheduleVersionCreate(BaseModel):
    """Save the current schedule — snapshots ``tasks`` and updates the project."""

    tasks: list[TaskItem] = Field(default_factory=list)
    note: str = ""


class ScheduleVersionResponse(BaseModel):
    """A full schedule snapshot — loadable back into the Gantt view."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    note: str
    tasks: list[TaskItem]
    created_at: datetime


class ScheduleVersionListItem(BaseModel):
    """Lightweight history-list entry (no task payload)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    note: str
    task_count: int
    created_at: datetime


__all__ = [
    "ContractItem",
    "CostItem",
    "IssueItem",
    "MemberItem",
    "ProjectBase",
    "ProjectCreate",
    "ProjectResponse",
    "ProjectUpdate",
    "ScheduleVersionCreate",
    "ScheduleVersionListItem",
    "ScheduleVersionResponse",
    "TaskItem",
]
