"""Project schedule history: project_schedule_versions table.

Revision ID: 0011_schedule
Revises: 0010_projects
Create Date: hand-written for the schedule-management feature.

Each saved schedule snapshots the project's ``tasks`` array into an immutable
version row, preserving full edit history. Cascade-deletes with its project.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_schedule"
down_revision: str | None = "0010_projects"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "project_schedule_versions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("project_id", sa.String(length=40), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "tasks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_project_schedule_versions_project_id",
        "project_schedule_versions",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_project_schedule_versions_project_id", "project_schedule_versions")
    op.drop_table("project_schedule_versions")
