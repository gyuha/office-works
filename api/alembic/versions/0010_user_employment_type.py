"""Add employment_type (고용 형태) column to users.

Revision ID: 0010_user_employment_type
Revises: 0009_string_ids
Create Date: hand-written for member employment-type capture.

Adds a nullable ``employment_type`` column to ``users``. It holds the *name*
of an org ``employment_types`` row (referenced by name, like ``grade``).
Nullable so existing rows (auth-only / system users, and members created
before this column existed) stay valid.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_user_employment_type"
down_revision: str | None = "0009_string_ids"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("employment_type", sa.String(length=64), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "employment_type")
