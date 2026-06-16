"""Projects table: project aggregate with JSONB collections.

Revision ID: 0010_projects
Revises: 0011_user_memo
Create Date: hand-written for the project-management feature.

A project owns five collections (members / tasks / contracts / issues / costs)
that the UI edits and persists as one object; they are stored as ``JSONB``
columns on the project row rather than normalized tables. Seed data lives in
``scripts/seed.py`` (idempotent upsert by id).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_projects"
down_revision: str | None = "0011_user_memo"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("client", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="대기"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pm", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("start_date", sa.String(length=10), nullable=False, server_default=""),
        sa.Column("end_date", sa.String(length=10), nullable=False, server_default=""),
        sa.Column("budget", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("spent", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "members",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "tasks",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "contracts",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "issues",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "costs",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("projects")
