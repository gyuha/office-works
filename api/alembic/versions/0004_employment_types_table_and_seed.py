"""Employment types table + default 고용 형태 seed.

Revision ID: 0004_employment_types_table_and_seed
Revises: 0003_positions_table_and_seed
Create Date: hand-written for org-settings-2of4-employment-types (slice S1)

Creates:
  - employment_types table.

Seeds (idempotent):
  - org:write permission + admin link (defensive — already seeded by 0003).
  - 5 default employment types (정규직…프리랜서) with sort_order 1..5.
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_employment_types"
down_revision: str | None = "0003_positions_table_and_seed"
branch_labels: str | None = None
depends_on: str | None = None

PERMISSION_KEY = "org:write"
ROLE_NAME = "admin"
DEFAULT_TYPES = ["정규직", "계약직", "파트타임", "인턴", "프리랜서"]


def upgrade() -> None:
    op.create_table(
        "employment_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_employment_types_name"),
    )

    bind = op.get_bind()

    # org:write / admin / link — defensive idempotent (0003 already seeds these)
    perm_id = bind.execute(
        sa.text("SELECT id FROM permissions WHERE key = :key"), {"key": PERMISSION_KEY}
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
                "description": "Create/update/delete organization settings.",
            },
        )
    role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name"), {"name": ROLE_NAME}
    ).scalar()
    if role_id is None:
        role_id = uuid.uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO roles (id, name, description, created_at) "
                "VALUES (:id, :name, :description, now())"
            ),
            {"id": role_id, "name": ROLE_NAME, "description": "Administrator role."},
        )
    link = bind.execute(
        sa.text(
            "SELECT 1 FROM role_permissions WHERE role_id = :r AND permission_id = :p"
        ),
        {"r": role_id, "p": perm_id},
    ).scalar()
    if link is None:
        bind.execute(
            sa.text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r, :p)"),
            {"r": role_id, "p": perm_id},
        )

    for order, name in enumerate(DEFAULT_TYPES, start=1):
        exists = bind.execute(
            sa.text("SELECT 1 FROM employment_types WHERE name = :name"), {"name": name}
        ).scalar()
        if exists is None:
            bind.execute(
                sa.text(
                    "INSERT INTO employment_types (id, name, sort_order, created_at, updated_at) "
                    "VALUES (:id, :name, :sort_order, now(), now())"
                ),
                {"id": uuid.uuid4(), "name": name, "sort_order": order},
            )


def downgrade() -> None:
    """Drop employment_types. org:write is left in place (0003 owns it)."""
    op.drop_table("employment_types")
