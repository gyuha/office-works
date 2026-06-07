"""OAuth callback route contract tests — browser-completion fragment redirect.

The shared ``GET /auth/oauth/{provider}/callback`` no longer returns JSON; it
redirects (302) to ``{frontend_url}/auth/callback#access_token=…&refresh_token=…``
on success and to ``{frontend_url}/login?error=oauth`` on any failure.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

import domains.auth.router.auth_router as auth_router
from core.config import Settings
from core.redis import get_redis_dep
from domains.auth.router import _get_service, router

pytestmark = pytest.mark.unit

_FRONTEND_URL = "http://localhost:3000"


class _FakeRedis:
    def __init__(self, state_provider: dict[str, str]) -> None:
        self._state = state_provider

    async def get(self, key: str) -> str | None:
        return self._state.get(key)

    async def delete(self, key: str) -> None:
        self._state.pop(key, None)


class _FakeOAuthAdapter:
    def __init__(self, user_info: dict[str, Any] | None = None, raise_exc: bool = False) -> None:
        self._user_info = user_info or {}
        self._raise = raise_exc

    async def exchange_code(self, code: str) -> dict[str, Any]:
        if self._raise:
            raise RuntimeError("provider boom")
        return self._user_info


class _FakeProvisionService:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def oauth_provision_user(self, **kwargs: Any) -> tuple[object, dict[str, Any]]:
        self.calls.append(kwargs)
        return object(), {
            "access_token": "app.access.jwt",
            "refresh_token": "app.refresh.jwt",
            "token_type": "bearer",
            "expires_in": 900,
        }


def _build_app(
    *,
    redis: _FakeRedis,
    service: _FakeProvisionService,
) -> FastAPI:
    application = FastAPI()
    application.include_router(router, prefix="/api/v1")
    application.dependency_overrides[_get_service] = lambda: service
    application.dependency_overrides[get_redis_dep] = lambda: redis
    return application


def _patch_env(
    monkeypatch: pytest.MonkeyPatch,
    adapter: _FakeOAuthAdapter,
) -> None:
    settings = Settings(frontend_url=_FRONTEND_URL)
    monkeypatch.setattr(auth_router, "get_settings", lambda: settings)
    monkeypatch.setattr(auth_router, "_get_oauth_adapter", lambda provider, s: adapter)


async def test_oauth_callback_redirects_to_frontend_fragment_on_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis = _FakeRedis({"oauth:state:good-state": "microsoft"})
    service = _FakeProvisionService()
    adapter = _FakeOAuthAdapter(
        {
            "provider_user_id": "oid-1",
            "email": "alice@example.com",
            "display_name": "Alice",
        }
    )
    _patch_env(monkeypatch, adapter)
    app = _build_app(redis=redis, service=service)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver", follow_redirects=False
    ) as client:
        response = await client.get(
            "/api/v1/auth/oauth/microsoft/callback",
            params={"code": "auth-code", "state": "good-state"},
        )

    assert response.status_code == 302
    location = response.headers["location"]
    parsed = urlparse(location)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == f"{_FRONTEND_URL}/auth/callback"
    fragment = parse_qs(parsed.fragment)
    assert fragment["access_token"] == ["app.access.jwt"]
    assert fragment["refresh_token"] == ["app.refresh.jwt"]
    assert len(service.calls) == 1


async def test_oauth_callback_redirects_to_login_error_on_state_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis = _FakeRedis({})  # no stored state
    service = _FakeProvisionService()
    adapter = _FakeOAuthAdapter({})
    _patch_env(monkeypatch, adapter)
    app = _build_app(redis=redis, service=service)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver", follow_redirects=False
    ) as client:
        response = await client.get(
            "/api/v1/auth/oauth/microsoft/callback",
            params={"code": "auth-code", "state": "unknown-state"},
        )

    assert response.status_code == 302
    assert response.headers["location"] == f"{_FRONTEND_URL}/login?error=oauth"
    assert service.calls == []


async def test_oauth_callback_redirects_to_login_error_when_exchange_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    redis = _FakeRedis({"oauth:state:good-state": "microsoft"})
    service = _FakeProvisionService()
    adapter = _FakeOAuthAdapter(raise_exc=True)
    _patch_env(monkeypatch, adapter)
    app = _build_app(redis=redis, service=service)

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver", follow_redirects=False
    ) as client:
        response = await client.get(
            "/api/v1/auth/oauth/microsoft/callback",
            params={"code": "auth-code", "state": "good-state"},
        )

    assert response.status_code == 302
    assert response.headers["location"] == f"{_FRONTEND_URL}/login?error=oauth"
    assert service.calls == []
