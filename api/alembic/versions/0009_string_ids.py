"""Convert all UUID primary/foreign keys to prefixed string IDs.

Revision ID: 0009_string_ids
Revises: 0008_drop_members_table
Create Date: auto-generated for office-works

Every aggregate identifier becomes a Stripe-style prefixed string (``usr_…``,
``rol_…``, …) — see :mod:`core.ids`. New rows created by the app use a ULID
suffix; existing rows are migrated *deterministically* here:

    new_id = '<prefix>_' || replace(old_uuid::text, '-', '')

Because a parent PK and every FK that references it share the same source UUID
and the same prefix, each column can be transformed independently with no
shared mapping table — referential integrity is preserved by construction.

Downgrade is irreversible (the original UUIDs are not recoverable once the
columns are textual), so it raises rather than silently corrupting data.
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_string_ids"
down_revision: str | None = "0008_drop_members_table"
branch_labels: str | None = None
depends_on: str | None = None

# Tables that own identity: (table, id prefix)
_ENTITY_PK: list[tuple[str, str]] = [
    ("users", "usr"),
    ("roles", "rol"),
    ("permissions", "prm"),
    ("refresh_tokens", "rft"),
    ("email_verifications", "evf"),
    ("password_resets", "pwr"),
    ("oauth_accounts", "oau"),
    ("conversations", "cnv"),
    ("messages", "msg"),
    ("positions", "pos"),
    ("employment_types", "emp"),
    ("grades", "grd"),
    ("work_settings", "wks"),
    ("leave_settings", "lvs"),
    ("company_info", "cmp"),
]

# Foreign keys: (table, column, referenced prefix, constraint name, ref table)
# Junction-table columns are both PK and FK — they are migrated here.
_FOREIGN_KEYS: list[tuple[str, str, str, str, str]] = [
    ("refresh_tokens", "user_id", "usr", "refresh_tokens_user_id_fkey", "users"),
    ("email_verifications", "user_id", "usr", "email_verifications_user_id_fkey", "users"),
    ("password_resets", "user_id", "usr", "password_resets_user_id_fkey", "users"),
    ("oauth_accounts", "user_id", "usr", "oauth_accounts_user_id_fkey", "users"),
    ("conversations", "user_id", "usr", "conversations_user_id_fkey", "users"),
    ("messages", "conversation_id", "cnv", "messages_conversation_id_fkey", "conversations"),
    ("role_permissions", "role_id", "rol", "role_permissions_role_id_fkey", "roles"),
    ("role_permissions", "permission_id", "prm", "role_permissions_permission_id_fkey", "permissions"),  # noqa: E501
    ("user_roles", "user_id", "usr", "user_roles_user_id_fkey", "users"),
    ("user_roles", "role_id", "rol", "user_roles_role_id_fkey", "roles"),
]


def _to_string_id(table: str, column: str, prefix: str) -> None:
    """ALTER one UUID column to ``varchar(40)`` with a deterministic value rewrite."""
    op.execute(
        f"ALTER TABLE {table} "
        f"ALTER COLUMN {column} TYPE varchar(40) "
        f"USING ('{prefix}_' || replace({column}::text, '-', ''))"
    )


def upgrade() -> None:
    # 1. Drop every FK constraint so referenced PK columns can change type.
    for table, _col, _prefix, constraint, _ref in _FOREIGN_KEYS:
        op.drop_constraint(constraint, table, type_="foreignkey")

    # 2. Rewrite PK columns (entity tables).
    for table, prefix in _ENTITY_PK:
        _to_string_id(table, "id", prefix)

    # 3. Rewrite FK columns (incl. junction PK/FK columns) with the referenced prefix.
    for table, col, ref_prefix, _constraint, _ref in _FOREIGN_KEYS:
        _to_string_id(table, col, ref_prefix)

    # 4. Recreate FK constraints (ON DELETE CASCADE, matching 0001).
    for table, col, _prefix, constraint, ref in _FOREIGN_KEYS:
        op.create_foreign_key(
            constraint, table, ref, [col], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    raise NotImplementedError(
        "0009_string_ids is irreversible: original UUIDs cannot be recovered "
        "from the rewritten string IDs."
    )
