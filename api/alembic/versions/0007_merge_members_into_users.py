"""Merge members into users: add HR columns to users + backfill from members.

Revision ID: 0007_merge_members_into_users
Revises: 0006_org_config
Create Date: hand-written for merge-members-into-users (slice S1)

See ADR-0006. This is the first of two migrations:
  * 0007 (this one) — add nullable HR columns to ``users``, backfill the
    ``members`` rows into ``users`` (email dedup), rename the ``members:write``
    permission to ``users:write``. The ``members`` table is KEPT so the running
    app (which still reads ``members``) does not break mid-migration.
  * 0008 (later, slice S4) — drop the ``members`` table once all code has been
    repointed to ``users``.

HR columns added to ``users`` (all nullable — auth-only / system rows stay empty):
  employee_no (unique), department, rank, grade, phone.
The person's name reuses the existing ``users.display_name`` column rather than a
separate ``name`` column (single human name — see run.md divergence note).

Backfill rule (email dedup) for each ``members`` row:
  1. member.user_id set            → merge HR into that user.
  2. else email matches a user     → merge HR into that user.
  3. else                          → create a credential-less user
                                     (hashed_password NULL, no oauth) carrying
                                     the HR fields + email + display_name.

The permission rename keeps the admin→permission link intact (role_permissions
references permission_id, not the key string), so admins keep their write grant
under the new ``users:write`` name.
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_merge_members_into_users"
down_revision: str | None = "0006_org_config"
branch_labels: str | None = None
depends_on: str | None = None

OLD_PERMISSION_KEY = "members:write"
NEW_PERMISSION_KEY = "users:write"
NEW_PERMISSION_DESC = "Create/update/delete users (employee directory)."


def upgrade() -> None:
    """Add HR columns to users, backfill members, rename the write permission."""

    # ── 1. Add nullable HR columns to users ──────────────────────────────────
    op.add_column("users", sa.Column("employee_no", sa.String(length=16), nullable=True))
    op.add_column("users", sa.Column("department", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("rank", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("grade", sa.String(length=16), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    # UNIQUE on a nullable column: Postgres treats NULLs as distinct, so
    # multiple auth-only rows (employee_no NULL) coexist while non-null
    # employee numbers stay unique.
    op.create_unique_constraint("uq_users_employee_no", "users", ["employee_no"])

    # ── 2. Backfill members → users (email dedup) ────────────────────────────
    bind = op.get_bind()
    members = bind.execute(
        sa.text(
            "SELECT user_id, employee_no, name, department, rank, grade, phone, "
            "email, is_active FROM members"
        )
    ).mappings().all()

    for m in members:
        target_user_id = m["user_id"]
        if target_user_id is None:
            target_user_id = bind.execute(
                sa.text("SELECT id FROM users WHERE email = :email"),
                {"email": m["email"]},
            ).scalar()

        if target_user_id is not None:
            # Merge HR into an existing user; keep an existing display_name.
            bind.execute(
                sa.text(
                    "UPDATE users SET employee_no = :employee_no, department = :department, "
                    "rank = :rank, grade = :grade, phone = :phone, "
                    "display_name = COALESCE(display_name, :name) WHERE id = :id"
                ),
                {
                    "employee_no": m["employee_no"],
                    "department": m["department"],
                    "rank": m["rank"],
                    "grade": m["grade"],
                    "phone": m["phone"],
                    "name": m["name"],
                    "id": target_user_id,
                },
            )
        else:
            # Pre-registered employee who never logged in → credential-less user.
            bind.execute(
                sa.text(
                    "INSERT INTO users (id, email, display_name, hashed_password, "
                    "is_verified, is_active, employee_no, department, rank, grade, phone, "
                    "created_at, updated_at) VALUES (:id, :email, :name, NULL, false, "
                    ":is_active, :employee_no, :department, :rank, :grade, :phone, now(), now())"
                ),
                {
                    "id": uuid.uuid4(),
                    "email": m["email"],
                    "name": m["name"],
                    "is_active": m["is_active"],
                    "employee_no": m["employee_no"],
                    "department": m["department"],
                    "rank": m["rank"],
                    "grade": m["grade"],
                    "phone": m["phone"],
                },
            )

    # ── 3. Rename members:write → users:write (admin link preserved) ─────────
    bind.execute(
        sa.text(
            "UPDATE permissions SET key = :new, description = :desc WHERE key = :old"
        ),
        {"new": NEW_PERMISSION_KEY, "desc": NEW_PERMISSION_DESC, "old": OLD_PERMISSION_KEY},
    )


def downgrade() -> None:
    """Revert the permission rename and drop the HR columns.

    Note: the data backfill is not reversed — credential-less users created from
    pre-registered members are left in place (un-merging is inherently lossy and
    those rows carry no reliable provenance marker). Only the schema change and
    the permission rename are undone.
    """
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE permissions SET key = :old WHERE key = :new"),
        {"old": OLD_PERMISSION_KEY, "new": NEW_PERMISSION_KEY},
    )

    op.drop_constraint("uq_users_employee_no", "users", type_="unique")
    op.drop_column("users", "phone")
    op.drop_column("users", "grade")
    op.drop_column("users", "rank")
    op.drop_column("users", "department")
    op.drop_column("users", "employee_no")
