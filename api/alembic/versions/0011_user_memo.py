"""Add memo (구성원 메모, rich-text HTML) column to users.

Revision ID: 0011_user_memo
Revises: 0010_user_employment_type
Create Date: hand-written for member rich-text memo (Tiptap editor).

Adds a nullable ``memo`` TEXT column to ``users``. It holds the member's
rich-text note as an HTML string (authored via the Tiptap editor, sanitized
on render — see ADR-0007). Nullable so existing rows stay valid.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011_user_memo"
down_revision: str | None = "0010_user_employment_type"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("memo", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "memo")
