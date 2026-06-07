"""Grades table + default 등급 seed.

Revision ID: 0005_grades
Revises: 0004_employment_types
Create Date: hand-written for org-settings-3of4-grades (slice S1)

Creates:
  - grades table (관리되는 등급; members.grade가 이름으로 참조).

Seeds (idempotent):
  - 4 default grades (초급/중급/고급/특급) with colors + description + sort_order.
  - org:write / admin link (defensive — owned by 0003).

members.grade는 이미 이름 문자열이라 backfill 불필요(검증은 서비스 레이어로 전환).
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_grades"
down_revision: str | None = "0004_employment_types"
branch_labels: str | None = None
depends_on: str | None = None

PERMISSION_KEY = "org:write"
ROLE_NAME = "admin"

# (name, color, bg, border, description) — low → high
DEFAULT_GRADES = [
    ("초급", "#70737C", "#EEEFF1", "#C2C4C8", "입문 단계 · 업무 보조 및 기초 역량 학습"),
    ("중급", "#FF9200", "#FFF3E0", "#FFD9A0", "독립 수행 가능 · 실무 경험 2년 이상"),
    ("고급", "#00BF40", "#E6F8EC", "#B8EECB", "전문성 인정 · 팀 리딩 가능 수준"),
    ("특급", "#0066FF", "#E8F0FF", "#A9C9FF", "최고 전문가 · 사내 기술 리더"),
]


def upgrade() -> None:
    op.create_table(
        "grades",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=16), nullable=False),
        sa.Column("color", sa.String(length=9), nullable=False),
        sa.Column("bg", sa.String(length=9), nullable=False),
        sa.Column("border", sa.String(length=9), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
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
        sa.UniqueConstraint("name", name="uq_grades_name"),
    )

    bind = op.get_bind()

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
        sa.text("SELECT 1 FROM role_permissions WHERE role_id = :r AND permission_id = :p"),
        {"r": role_id, "p": perm_id},
    ).scalar()
    if link is None:
        bind.execute(
            sa.text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r, :p)"),
            {"r": role_id, "p": perm_id},
        )

    for order, (name, color, bg, border, desc) in enumerate(DEFAULT_GRADES, start=1):
        exists = bind.execute(
            sa.text("SELECT 1 FROM grades WHERE name = :name"), {"name": name}
        ).scalar()
        if exists is None:
            bind.execute(
                sa.text(
                    "INSERT INTO grades "
                    "(id, name, color, bg, border, description, sort_order, created_at, updated_at) "
                    "VALUES (:id, :name, :color, :bg, :border, :description, :so, now(), now())"
                ),
                {
                    "id": uuid.uuid4(),
                    "name": name,
                    "color": color,
                    "bg": bg,
                    "border": border,
                    "description": desc,
                    "so": order,
                },
            )


def downgrade() -> None:
    """Drop grades. org:write left in place (0003 owns it)."""
    op.drop_table("grades")
