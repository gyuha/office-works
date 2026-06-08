"""Prefixed string primary-key identifiers.

Every aggregate table uses a Stripe-style identifier — a short entity prefix,
an underscore, then a lowercase `ULID`_::

    usr_01hx3k2m8q9v4t6w0y7z5b2c3d

The prefix makes joins readable at a glance (you can tell a ``usr_`` from a
``rol_`` without a schema lookup), while the ULID suffix is random enough that
identifiers cannot be guessed or enumerated when exposed in URLs / responses.
ULIDs are also k-sortable, so they preserve B-tree insert locality the way a
sequence would — unlike a fully random UUIDv4.

.. _ULID: https://github.com/ulid/spec

Usage::

    from core.ids import id_column, USER

    class User(Base):
        id: Mapped[str] = id_column(USER)
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

# ---------------------------------------------------------------------------
# Entity prefixes — one per table that owns identity
# ---------------------------------------------------------------------------

USER = "usr"
ROLE = "rol"
PERMISSION = "prm"
REFRESH_TOKEN = "rft"  # noqa: S105 — entity prefix, not a secret
EMAIL_VERIFICATION = "evf"
PASSWORD_RESET = "pwr"  # noqa: S105 — entity prefix, not a secret
OAUTH_ACCOUNT = "oau"
CONVERSATION = "cnv"
MESSAGE = "msg"
POSITION = "pos"
EMPLOYMENT_TYPE = "emp"
GRADE = "grd"
WORK_SETTINGS = "wks"
LEAVE_SETTINGS = "lvs"
COMPANY_INFO = "cmp"

#: Column width: longest prefix (3) + "_" (1) + ULID (26) = 30; 40 leaves room.
ID_LENGTH = 40


def generate_id(prefix: str) -> str:
    """Return a new prefixed identifier, e.g. ``usr_01hx3k2m8q...`` (lowercase)."""
    return f"{prefix}_{str(ULID()).lower()}"


def id_column(prefix: str) -> Mapped[str]:
    """A ``String`` primary-key column that auto-generates a prefixed ID."""
    return mapped_column(String(ID_LENGTH), primary_key=True, default=lambda: generate_id(prefix))
