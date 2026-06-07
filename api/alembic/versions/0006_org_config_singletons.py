"""Org config singletons: work_settings, leave_settings, company_info.

Revision ID: 0006_org_config
Revises: 0005_grades
Create Date: hand-written for org-settings-4of4-config (slice S1)

Each table holds a single row, seeded with the mock defaults.
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_org_config"
down_revision: str | None = "0005_grades"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "work_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.String(length=5), nullable=False),
        sa.Column("end_time", sa.String(length=5), nullable=False),
        sa.Column("lunch_start", sa.String(length=5), nullable=False),
        sa.Column("lunch_end", sa.String(length=5), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "leave_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("default_days", sa.Integer(), nullable=False),
        sa.Column("probation_days", sa.Integer(), nullable=False),
        sa.Column("add_per_year", sa.Integer(), nullable=False),
        sa.Column("max_add", sa.Integer(), nullable=False),
        sa.Column("expiry_months", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "company_info",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("biz_no", sa.String(length=32), nullable=False),
        sa.Column("ceo", sa.String(length=64), nullable=False),
        sa.Column("founded", sa.String(length=10), nullable=False),
        sa.Column("tel", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    bind = op.get_bind()
    if bind.execute(sa.text("SELECT count(*) FROM work_settings")).scalar() == 0:
        bind.execute(
            sa.text(
                "INSERT INTO work_settings "
                "(id, start_time, end_time, lunch_start, lunch_end, break_minutes, updated_at) "
                "VALUES (:id, '09:00', '18:00', '12:00', '13:00', 10, now())"
            ),
            {"id": uuid.uuid4()},
        )
    if bind.execute(sa.text("SELECT count(*) FROM leave_settings")).scalar() == 0:
        bind.execute(
            sa.text(
                "INSERT INTO leave_settings "
                "(id, default_days, probation_days, add_per_year, max_add, expiry_months, updated_at) "
                "VALUES (:id, 15, 3, 1, 5, 24, now())"
            ),
            {"id": uuid.uuid4()},
        )
    if bind.execute(sa.text("SELECT count(*) FROM company_info")).scalar() == 0:
        bind.execute(
            sa.text(
                "INSERT INTO company_info "
                "(id, name, biz_no, ceo, founded, tel, email, address, updated_at) "
                "VALUES (:id, :name, :biz_no, :ceo, :founded, :tel, :email, :address, now())"
            ),
            {
                "id": uuid.uuid4(),
                "name": "오피스메이트 주식회사",
                "biz_no": "123-45-67890",
                "ceo": "홍길동",
                "founded": "2018-03-15",
                "tel": "02-1234-5678",
                "email": "contact@officemate.co.kr",
                "address": "서울특별시 강남구 테헤란로 123 오피스메이트빌딩 7층",
            },
        )


def downgrade() -> None:
    op.drop_table("company_info")
    op.drop_table("leave_settings")
    op.drop_table("work_settings")
