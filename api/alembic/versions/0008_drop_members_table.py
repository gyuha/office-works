"""Drop the members table — fully merged into users (ADR-0006, slice S4).

Revision ID: 0008_drop_members_table
Revises: 0007_merge_members_into_users
Create Date: hand-written for merge-members-into-users (slice S4)

By this point every code path has been repointed to ``users`` (the directory API
is ``/api/v1/users``, the auth login no longer links Members, and the org grade
cascade targets ``users``), so the ``members`` table has no remaining readers and
is dropped.

``downgrade`` recreates the table as it stood just before this revision — i.e.
the 0002 schema with the 0005 widening of ``grade`` to ``VARCHAR(16)`` — so the
down/up cycle is idempotent. It does NOT restore the dropped data (the rows were
already backfilled into ``users`` by 0007).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_drop_members_table"
down_revision: str | None = "0007_merge_members_into_users"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Drop the members table (indexes drop with it)."""
    op.drop_index(op.f("ix_members_email"), table_name="members")
    op.drop_index(op.f("ix_members_user_id"), table_name="members")
    op.drop_table("members")


def downgrade() -> None:
    """Recreate the members table schema (post-0005 state; data not restored)."""
    op.create_table(
        "members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("employee_no", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("department", sa.String(length=64), nullable=False),
        sa.Column("rank", sa.String(length=64), nullable=False),
        sa.Column("grade", sa.String(length=16), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_no", name="uq_members_employee_no"),
        sa.UniqueConstraint("email", name="uq_members_email"),
    )
    op.create_index(op.f("ix_members_user_id"), "members", ["user_id"])
    op.create_index(op.f("ix_members_email"), "members", ["email"], unique=True)
