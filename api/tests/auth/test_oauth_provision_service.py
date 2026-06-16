"""OAuth provisioning gate tests — closed-membership login (ADR-0009).

The JIT user-creation branch is removed: ``oauth_provision_user`` issues app
tokens only for an already-existing ``users`` row. An unknown email is rejected
with :class:`ForbiddenError` and creates no user; an email matching an existing
user attaches the OAuth identity and issues tokens (row existence is the gate,
never ``employee_no``).
"""

from __future__ import annotations

from typing import Any

import pytest

from core.exceptions import ForbiddenError
from domains.auth.service import AuthService

pytestmark = pytest.mark.unit

_PROVIDER = "google"
_PROVIDER_UID = "google-oauth-uid-1"
_EMAIL = "member@example.com"


async def test_oauth_provision_user_unknown_email_raises_forbidden_and_creates_no_user(
    auth_service: AuthService,
    fake_repo: Any,
) -> None:
    assert fake_repo.users == {}

    with pytest.raises(ForbiddenError):
        await auth_service.oauth_provision_user(
            provider=_PROVIDER,
            provider_user_id=_PROVIDER_UID,
            email=_EMAIL,
            display_name="Stranger",
        )

    assert fake_repo.users == {}
    assert fake_repo.users_by_id == {}
    assert fake_repo.oauth_accounts == {}


async def test_oauth_provision_user_existing_user_email_attaches_oauth_and_issues_tokens(
    auth_service: AuthService,
    fake_repo: Any,
) -> None:
    # Pre-register a member with no employee_no — gate is row existence, not employee_no.
    user = await fake_repo.create_user(_EMAIL, hashed_password=None, display_name="Member")

    returned_user, tokens = await auth_service.oauth_provision_user(
        provider=_PROVIDER,
        provider_user_id=_PROVIDER_UID,
        email=_EMAIL,
        display_name="Member",
    )

    assert returned_user is user
    assert fake_repo.oauth_accounts[(_PROVIDER, _PROVIDER_UID)].user_id == user.id
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"
    assert tokens["expires_in"] > 0
