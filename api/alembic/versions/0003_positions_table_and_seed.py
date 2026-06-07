"""Positions table + org:write permission seed + default 직급 seed.

Revision ID: 0003_positions_table_and_seed
Revises: 0002_members_table_and_seed
Create Date: hand-written for org-settings-1of4-positions (slice S1)

Creates:
  - positions table (직급 체계, ordered low→high by sort_order).

Seeds (idempotent):
  - permissions row key="org:write"
  - roles row name="admin" (created if absent)
  - role_permissions link (admin -> org:write)
  - 8 default positions (사원…대표이사) with sort_order 1..8

Idempotent SELECT-then-INSERT so re-running is safe; downgrade removes only
rows it created (the admin role is left in place — it may carry other perms).
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_positions_table_and_seed"
down_revision: str | None = "0002_members_table_and_seed"
branch_labels: str | None = None
depends_on: str | None = None

PERMISSION_KEY = "org:write"
ROLE_NAME = "admin"
DEFAULT_POSITIONS = ["사원", "선임", "책임", "수석", "실장", "상무", "전무", "대표이사"]


def upgrade() -> None:
    """Create positions table and seed org:write permission + default 직급."""

    op.create_table(
        "positions",
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
        sa.UniqueConstraint("name", name="uq_positions_name"),
    )

    bind = op.get_bind()

    # ── seed: org:write permission / admin role / link (idempotent) ─────────────
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
                "description": "Create/update/delete organization settings (직급/등급/etc.).",
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
            {"id": role_id, "name": ROLE_NAME, "description": "Administrator role."},
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

    # ── seed: default 직급 (idempotent by name) ─────────────────────────────────
    for order, name in enumerate(DEFAULT_POSITIONS, start=1):
        exists = bind.execute(
            sa.text("SELECT 1 FROM positions WHERE name = :name"),
            {"name": name},
        ).scalar()
        if exists is None:
            bind.execute(
                sa.text(
                    "INSERT INTO positions (id, name, sort_order, created_at, updated_at) "
                    "VALUES (:id, :name, :sort_order, now(), now())"
                ),
                {"id": uuid.uuid4(), "name": name, "sort_order": order},
            )


def downgrade() -> None:
    """Drop positions table and remove the org:write permission link / permission.

    The ``admin`` role is intentionally left in place (it may carry other
    permissions). Only the org:write permission and its link are removed.
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

    op.drop_table("positions")
