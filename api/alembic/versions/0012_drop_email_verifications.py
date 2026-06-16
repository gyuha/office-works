"""Drop the email_verifications table — self-signup + email verification removed.

Revision ID: 0012_drop_email_verif
Revises: 0011_schedule
Create Date: hand-written for member-only-login (slice S4, ADR-0009)

Closed membership (ADR-0009) removes self-registration and its email-verification
chain at the code level (the ``EmailVerification`` model, repository methods, and
``POST /signup`` / ``POST /verify-email`` routes are gone). This revision drops the
now-orphaned table.

``downgrade`` recreates the table as it stood at the head before this revision —
the post-0009 string-id schema (``varchar(40)`` id/user_id) with the original
indexes — so the down/up cycle is structurally idempotent. It does NOT restore
dropped rows.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012_drop_email_verif"
down_revision: str | None = "0011_schedule"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Drop the email_verifications table (its indexes drop with it)."""
    op.drop_index(
        op.f("ix_email_verifications_user_id"), table_name="email_verifications"
    )
    op.drop_index(
        op.f("ix_email_verifications_token_hash"), table_name="email_verifications"
    )
    op.drop_table("email_verifications")


def downgrade() -> None:
    """Recreate the email_verifications table schema (post-0009 state; data not restored)."""
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="email_verifications_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="email_verifications_pkey"),
    )
    op.create_index(
        op.f("ix_email_verifications_token_hash"),
        "email_verifications",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_email_verifications_user_id"),
        "email_verifications",
        ["user_id"],
    )
