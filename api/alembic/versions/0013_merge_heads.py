"""merge main employment_type/memo with branch projects/auth lineage

Revision ID: 0013_merge_heads
Revises: 0011_user_memo, 0012_drop_email_verif
Create Date: 2026-06-16 13:45:44.948491+00:00
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0013_merge_heads'
down_revision: Union[str, None] = ('0011_user_memo', '0012_drop_email_verif')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
