"""Microsoft (Entra ID) OAuth 2.0 / OpenID Connect adapter.

Handles the authorization URL generation and callback token exchange for
Microsoft Entra ID's single-tenant v2.0 OAuth 2.0 / OpenID Connect flow.

Identity is read from the ``id_token`` claims only (decode-only — the token is
received directly over TLS from the token endpoint, so no JWKS signature
verification is performed, matching the trust model of the other adapters).
``aud``/``tid``/``exp`` are still validated after decoding to enforce the
single-tenant boundary (ADR 0003). The email is derived from the verified
``email`` claim only — ``preferred_username``/``upn`` are mutable and not
verified-owned, so they are NOT used as a fallback; if ``email`` is absent the
exchange is rejected (enable the optional ``email`` claim in the Entra app's
Token configuration).

Usage::

    from domains.auth.oauth.microsoft import MicrosoftOAuthAdapter

    adapter = MicrosoftOAuthAdapter(settings)
    url, state = adapter.get_authorization_url()
    user_info = await adapter.exchange_code(code)
"""

from __future__ import annotations

import base64
import binascii
import json
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx
import structlog

from core.config import Settings

logger = structlog.get_logger(__name__)

_AUTHORITY = "https://login.microsoftonline.com"


def _decode_id_token_claims(id_token: str) -> dict[str, Any]:
    """Decode the claims (payload) segment of a JWT without verifying its signature.

    The id_token is received directly from the token endpoint over TLS, so the
    payload is trusted without JWKS signature verification (same trust model as
    the other OAuth adapters).
    """
    try:
        _header, payload_b64, _signature = id_token.split(".")
    except ValueError as exc:
        raise ValueError("Malformed id_token: expected three dot-separated segments.") from exc

    padding = "=" * (-len(payload_b64) % 4)
    try:
        payload_bytes = base64.urlsafe_b64decode(payload_b64 + padding)
        claims = json.loads(payload_bytes)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Malformed id_token: could not decode claims.") from exc

    if not isinstance(claims, dict):
        raise ValueError("Malformed id_token: claims are not a JSON object.")
    return claims


class MicrosoftOAuthAdapter:
    """Microsoft Entra ID (single-tenant) OAuth 2.0 / OIDC adapter."""

    PROVIDER = "microsoft"

    def __init__(self, settings: Settings) -> None:
        self._client_id = settings.microsoft_client_id
        self._client_secret = settings.microsoft_client_secret.get_secret_value()
        self._tenant_id = settings.microsoft_tenant_id
        self._redirect_uri = settings.microsoft_redirect_uri

    @property
    def _authorize_url(self) -> str:
        return f"{_AUTHORITY}/{self._tenant_id}/oauth2/v2.0/authorize"

    @property
    def _token_url(self) -> str:
        return f"{_AUTHORITY}/{self._tenant_id}/oauth2/v2.0/token"

    def get_authorization_url(self) -> tuple[str, str]:
        """Return (authorization_url, state) — state is a random CSRF nonce."""
        state = secrets.token_urlsafe(32)
        params = {
            "client_id": self._client_id,
            "redirect_uri": self._redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "response_mode": "query",
        }
        url = f"{self._authorize_url}?{urlencode(params)}"
        return url, state

    async def exchange_code(self, code: str) -> dict[str, Any]:
        """Exchange an authorization code for user info.

        Returns
        -------
        dict with keys: provider_user_id, email, display_name, access_token,
                        refresh_token, expires_in

        Raises
        ------
        ValueError
            If the id_token is missing/malformed, its ``aud``/``tid``/``exp`` do
            not match the configured client/tenant or it is expired, or the
            verified ``email`` / ``oid`` claims are absent (ADR 0003).
        """
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                self._token_url,
                data={
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self._redirect_uri,
                    "scope": "openid email profile",
                },
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()

        id_token = token_data.get("id_token")
        if not id_token:
            raise ValueError("Microsoft token response did not include an id_token.")

        claims = _decode_id_token_claims(id_token)
        self._validate_claims(claims)

        # Derive email from the verified `email` claim ONLY. preferred_username/upn
        # are mutable and not verified-owned — using them as a fallback would let a
        # mutable claim become the account-merge key (ADR 0003).
        email = claims.get("email")
        if not email:
            raise ValueError(
                "Microsoft id_token has no verified 'email' claim. Enable the optional "
                "'email' claim in the Entra app's Token configuration "
                "(preferred_username/upn are not used as a fallback)."
            )

        oid = claims.get("oid")
        if not oid:
            raise ValueError("Microsoft id_token has no 'oid' claim to use as provider_user_id.")

        return {
            "provider_user_id": oid,
            "email": email,
            "display_name": claims.get("name"),
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in"),
        }

    def _validate_claims(self, claims: dict[str, Any]) -> None:
        """Validate aud/tid/exp without signature verification (single-tenant boundary).

        Signature is trusted via the direct-TLS token-endpoint receipt (same model as
        the other adapters), but audience, tenant, and expiry are still checked so a
        guest / cross-tenant / expired token cannot be accepted (ADR 0003).
        """
        if claims.get("aud") != self._client_id:
            raise ValueError("Microsoft id_token 'aud' does not match the configured client_id.")
        if claims.get("tid") != self._tenant_id:
            raise ValueError(
                "Microsoft id_token 'tid' does not match the configured tenant_id (single-tenant)."
            )
        exp = claims.get("exp")
        if not isinstance(exp, (int, float)) or exp < time.time():
            raise ValueError("Microsoft id_token is expired or has no valid 'exp' claim.")
