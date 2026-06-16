"""Auth email backend tests.

These tests pin the local development email topology:

* docker-compose runs Mailpit and exposes SMTP on localhost:1025.
* FastAPI runs on the host via uvicorn/uv.
* password-reset emails are delivered through fastapi-mail using those env settings.
"""

from __future__ import annotations

import os
from typing import Any, ClassVar
from unittest.mock import patch

import pytest

from core.config import get_settings
from domains.auth import email as email_module


class CapturingFastMail:
    """Test double that captures FastMail config and outgoing messages."""

    instances: ClassVar[list[CapturingFastMail]] = []

    def __init__(self, config: Any) -> None:
        self.config = config
        self.messages: list[Any] = []
        self.__class__.instances.append(self)

    async def send_message(self, message: Any) -> None:
        self.messages.append(message)


def test_password_reset_email_template_renders_subject_and_body_from_injected_link() -> None:
    """Password-reset copy is rendered from a reset-confirm link supplied by the caller."""
    reset_confirm_url = "https://app.example.com/reset-confirm/reset-token-123"

    rendered = email_module.render_password_reset_email(reset_confirm_url=reset_confirm_url)

    assert rendered.subject == "Reset your password"
    assert rendered.body.startswith("Hello,")
    assert reset_confirm_url in rendered.body
    assert "{reset_confirm_url}" not in rendered.body
    assert "The link expires in 1 hour." in rendered.body
    assert "If you did not request a reset, ignore this email." in rendered.body


@pytest.mark.asyncio
async def test_password_reset_email_uses_reset_confirm_url_base(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Any,
) -> None:
    """Password-reset mail links to FRONTEND_RESET_CONFIRM_URL_BASE plus the encoded token."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(email_module, "FastMail", CapturingFastMail)
    CapturingFastMail.instances.clear()
    reset_value = "reset token/with+symbols?email=alice@example.com"
    encoded_value = "reset%20token%2Fwith%2Bsymbols%3Femail%3Dalice%40example.com"

    with patch.dict(
        os.environ,
        {
            "SECRET_KEY": "test-secret-key",
            "JWT_SECRET_KEY": "test-jwt-secret-key",
            "FRONTEND_URL": "https://app.example.com",
            "FRONTEND_RESET_CONFIRM_URL_BASE": "https://app.example.com/reset-confirm/",
            "MAIL_SERVER": "localhost",
            "MAIL_PORT": "1025",
            "MAIL_USERNAME": "",
            "MAIL_PASSWORD": "",
            "MAIL_FROM": "noreply@office-works.example.com",
            "MAIL_FROM_NAME": "Example API",
            "MAIL_STARTTLS": "false",
            "MAIL_SSL_TLS": "false",
        },
        clear=True,
    ):
        get_settings.cache_clear()
        try:
            await email_module.send_password_reset_email(
                "alice@example.com",
                reset_value,
            )
        finally:
            get_settings.cache_clear()

    assert len(CapturingFastMail.instances) == 1
    message = CapturingFastMail.instances[0].messages[0]
    assert message.subject == "Reset your password"
    assert f"https://app.example.com/reset-confirm/{encoded_value}" in message.body
    assert f"https://app.example.com/reset-confirm/{reset_value}" not in message.body
    assert "https://app.example.com/auth/reset-password/" not in message.body
