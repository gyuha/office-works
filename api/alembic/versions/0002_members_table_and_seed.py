"""Members table + members:write permission / admin role seed.

Revision ID: 0002_members_table_and_seed
Revises: 0001_initial_schema
Create Date: hand-written for member-management-api (slice S1)

Creates:
  - members table (HR overlay records, optional 1:1 link to users via user_id).

Seeds (idempotent):
  - permissions row key="members:write"
  - roles row name="admin"
  - role_permissions link (admin -> members:write)

The seed uses SELECT-then-conditional-INSERT so re-running is safe and the
downgrade only removes rows it created.
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_members_table_and_seed"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | None = None
depends_on: str | None = None

PERMISSION_KEY = "members:write"
ROLE_NAME = "admin"


def upgrade() -> None:
    """Create members table and seed the members:write permission + admin role."""

    # ── members ────────────────────────────────────────────────────────────────
    op.create_table(
        "members",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("employee_no", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("department", sa.String(length=64), nullable=False),
        sa.Column("rank", sa.String(length=64), nullable=False),
        sa.Column("grade", sa.String(length=8), nullable=False),
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

    # ── seed: permission / role / link (idempotent) ─────────────────────────────
    bind = op.get_bind()

    perm_id = bind.execute(
        sa.text("SELECT id FROM permissions WHERE key = :key"),
        {"key": PERMISSION_KEY},
    ).scalar()
    if perm_id is None:
        perm_id = uuid.uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO permissions (id, key, description, created_at) "
                "VALUES (:id, :key, :description, now())"
            ),
            {
                "id": perm_id,
                "key": PERMISSION_KEY,
                "description": "Create/update/delete organizational member records.",
            },
        )

    role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name"),
        {"name": ROLE_NAME},
    ).scalar()
    if role_id is None:
        role_id = uuid.uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO roles (id, name, description, created_at) "
                "VALUES (:id, :name, :description, now())"
            ),
            {
                "id": role_id,
                "name": ROLE_NAME,
                "description": "Administrator role.",
            },
        )

    link_exists = bind.execute(
        sa.text(
            "SELECT 1 FROM role_permissions "
            "WHERE role_id = :role_id AND permission_id = :permission_id"
        ),
        {"role_id": role_id, "permission_id": perm_id},
    ).scalar()
    if link_exists is None:
        bind.execute(
            sa.text(
                "INSERT INTO role_permissions (role_id, permission_id) "
                "VALUES (:role_id, :permission_id)"
            ),
            {"role_id": role_id, "permission_id": perm_id},
        )


def downgrade() -> None:
    """Drop members table and remove the seeded permission link / permission.

    The ``admin`` role is intentionally left in place on downgrade: it may carry
    other permissions and other rows may reference it. Only the members:write
    permission and its link to admin (rows this migration created) are removed.
    """

    bind = op.get_bind()

    perm_id = bind.execute(
        sa.text("SELECT id FROM permissions WHERE key = :key"),
        {"key": PERMISSION_KEY},
    ).scalar()
    if perm_id is not None:
        bind.execute(
            sa.text("DELETE FROM role_permissions WHERE permission_id = :permission_id"),
            {"permission_id": perm_id},
        )
        bind.execute(
            sa.text("DELETE FROM permissions WHERE id = :id"),
            {"id": perm_id},
        )

    op.drop_index(op.f("ix_members_email"), table_name="members")
    op.drop_index(op.f("ix_members_user_id"), table_name="members")
    op.drop_table("members")
