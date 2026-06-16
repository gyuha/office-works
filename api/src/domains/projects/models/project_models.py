"""Projects domain SQLAlchemy ORM model.

Tables
------
* projects — 프로젝트: a single aggregate row per project.

The nested collections a project owns (투입 인력·작업·계약서·이슈·비용) have no
stable per-item identity in the UI (tasks/contracts/costs are positional, issues
use an ordinal ``no``), and the frontend edits and persists the whole project as
one object. Modelling them as separate normalized tables would force inventing
ids and rewriting every editor for zero functional gain, so each collection is
stored as a ``JSONB`` column and travels with the project row.

Import pattern::

    from domains.projects.models import Project
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base
from core.ids import PROJECT, SCHEDULE_VERSION, id_column


class Project(Base):
    """A 프로젝트 (project) aggregate — scalar fields plus JSONB collections."""

    __tablename__ = "projects"

    id: Mapped[str] = id_column(PROJECT)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="대기")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pm: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    start_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    end_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    budget: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    spent: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    members: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    tasks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    contracts: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    issues: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    costs: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id!r} name={self.name!r} status={self.status!r}>"


class ProjectScheduleVersion(Base):
    """A saved snapshot of a project's schedule (the ``tasks`` array).

    Each press of the schedule "저장" button appends one immutable version, so
    the full edit history is preserved and any past version can be loaded back
    into the Gantt view. Deleting a project cascades to its versions.
    """

    __tablename__ = "project_schedule_versions"

    id: Mapped[str] = id_column(SCHEDULE_VERSION)
    project_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tasks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<ProjectScheduleVersion id={self.id!r} project_id={self.project_id!r}>"
