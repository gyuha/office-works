"""Unit tests for the Microsoft (Entra ID) OAuth adapter.

Covers the authorization URL parameters and the id_token claim extraction.
Per ADR 0003, the email is derived from the verified ``email`` claim only —
``preferred_username``/``upn`` are NOT used as a fallback (they are mutable,
not verified-owned). The id_token is also validated for ``aud``/``tid``/``exp``
to enforce the single-tenant trust boundary.
"""

from __future__ import annotations

import base64
import json
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from core.config import Settings
from domains.auth.oauth.microsoft import MicrosoftOAuthAdapter

pytestmark = pytest.mark.unit

# Far-future / past unix timestamps for exp validation (avoid wall-clock coupling).
_FUTURE_EXP = 9999999999
_PAST_EXP = 1000000000


def _make_settings() -> Settings:
    return Settings(
        microsoft_client_id="client-123",
        microsoft_client_secret="secret-456",  # type: ignore[arg-type]
        microsoft_tenant_id="tenant-789",
        microsoft_redirect_uri="http://localhost:8000/api/v1/auth/oauth/microsoft/callback",
    )


def _valid_claims(**overrides: Any) -> dict[str, Any]:
    """Base claims that pass aud/tid/exp validation; override per test."""
    claims: dict[str, Any] = {
        "oid": "oid-abc",
        "name": "Alice Example",
        "email": "alice@example.com",
        "aud": "client-123",
        "tid": "tenant-789",
        "exp": _FUTURE_EXP,
    }
    claims.update(overrides)
    return {k: v for k, v in claims.items() if v is not _OMIT}


_OMIT = object()


def _make_id_token(claims: dict[str, Any]) -> str:
    """Build an unsigned JWT-shaped id_token whose payload encodes *claims*."""

    def _segment(data: dict[str, Any]) -> str:
        raw = json.dumps(data).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    header = _segment({"alg": "RS256", "typ": "JWT"})
    payload = _segment(claims)
    return f"{header}.{payload}.signature"


class _FakeResponse:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self._payload


class _FakeAsyncClient:
    """Stand-in for ``httpx.AsyncClient`` capturing the token POST."""

    def __init__(self, token_payload: dict[str, Any]) -> None:
        self._token_payload = token_payload
        self.posted_url: str | None = None
        self.posted_data: dict[str, Any] | None = None

    async def __aenter__(self) -> _FakeAsyncClient:
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def post(self, url: str, data: dict[str, Any]) -> _FakeResponse:
        self.posted_url = url
        self.posted_data = data
        return _FakeResponse(self._token_payload)


def _patch_client(monkeypatch: pytest.MonkeyPatch, token_payload: dict[str, Any]) -> _FakeAsyncClient:
    fake_client = _FakeAsyncClient(token_payload)
    monkeypatch.setattr(httpx, "AsyncClient", lambda *a, **k: fake_client)
    return fake_client


def test_get_authorization_url_builds_single_tenant_v2_authorize_with_expected_params() -> None:
    adapter = MicrosoftOAuthAdapter(_make_settings())

    url, state = adapter.get_authorization_url()

    parsed = urlparse(url)
    assert parsed.scheme == "https"
    assert parsed.netloc == "login.microsoftonline.com"
    assert parsed.path == "/tenant-789/oauth2/v2.0/authorize"

    params = parse_qs(parsed.query)
    assert params["client_id"] == ["client-123"]
    assert params["redirect_uri"] == [
        "http://localhost:8000/api/v1/auth/oauth/microsoft/callback"
    ]
    assert params["response_type"] == ["code"]
    assert params["scope"] == ["openid email profile"]
    assert params["response_mode"] == ["query"]
    assert params["state"] == [state]
    assert len(state) > 0


async def test_exchange_code_posts_to_tenant_token_endpoint_and_extracts_claims(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    id_token = _make_id_token(_valid_claims())
    token_payload = {
        "id_token": id_token,
        "access_token": "ms-access",
        "refresh_token": "ms-refresh",
        "expires_in": 3600,
    }
    fake_client = _patch_client(monkeypatch, token_payload)

    adapter = MicrosoftOAuthAdapter(_make_settings())
    user_info = await adapter.exchange_code("auth-code")

    assert fake_client.posted_url == (
        "https://login.microsoftonline.com/tenant-789/oauth2/v2.0/token"
    )
    assert fake_client.posted_data is not None
    assert fake_client.posted_data["grant_type"] == "authorization_code"
    assert fake_client.posted_data["code"] == "auth-code"
    assert fake_client.posted_data["client_secret"] == "secret-456"

    assert user_info["provider_user_id"] == "oid-abc"
    assert user_info["email"] == "alice@example.com"
    assert user_info["display_name"] == "Alice Example"
    assert user_info["access_token"] == "ms-access"
    assert user_info["refresh_token"] == "ms-refresh"
    assert user_info["expires_in"] == 3600


async def test_exchange_code_rejects_preferred_username_and_upn_without_falling_back(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # email claim absent; mutable claims present must NOT be used (ADR 0003).
    id_token = _make_id_token(
        _valid_claims(
            email=_OMIT,
            preferred_username="bob@contoso.com",
            upn="bob@contoso.onmicrosoft.com",
        )
    )
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="email"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_raises_when_email_claim_absent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    id_token = _make_id_token(_valid_claims(email=_OMIT))
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="email"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_raises_when_oid_absent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    id_token = _make_id_token(_valid_claims(oid=_OMIT))
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="oid"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_rejects_when_aud_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    id_token = _make_id_token(_valid_claims(aud="other-app"))
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="aud"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_rejects_when_tid_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # A guest / cross-tenant token carries a different tid — must be rejected.
    id_token = _make_id_token(_valid_claims(tid="other-tenant"))
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="tid"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_rejects_when_expired(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    id_token = _make_id_token(_valid_claims(exp=_PAST_EXP))
    _patch_client(monkeypatch, {"id_token": id_token})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="exp"):
        await adapter.exchange_code("auth-code")


async def test_exchange_code_raises_when_id_token_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_client(monkeypatch, {"access_token": "ms-access"})

    adapter = MicrosoftOAuthAdapter(_make_settings())
    with pytest.raises(ValueError, match="id_token"):
        await adapter.exchange_code("auth-code")
