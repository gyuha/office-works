"""Self-signup + email-verification teardown (ADR-0009).

The closed-membership model removes self-registration entirely: the
``POST /auth/signup`` and ``POST /auth/verify-email/{token}`` routes no longer
exist and must return 404.
"""

from __future__ import annotations

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from domains.auth.router import router


def _build_app() -> FastAPI:
    application = FastAPI()
    application.include_router(router, prefix="/api/v1")
    return application


async def test_signup_route_is_removed_returns_404() -> None:
    app = _build_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/v1/auth/signup",
            json={"email": "x@example.com", "password": "Password1!", "display_name": "X"},
        )
    assert response.status_code == 404


async def test_verify_email_route_is_removed_returns_404() -> None:
    app = _build_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/api/v1/auth/verify-email/some-token")
    assert response.status_code == 404
