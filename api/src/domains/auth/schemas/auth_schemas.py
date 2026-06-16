"""Auth domain Pydantic schemas.

Request / Response models for all auth endpoints.

Naming convention:
  * ``<Entity>Create``  — request body for creation
  * ``<Entity>Response`` — response body (never includes hashed_password)
  * ``<Entity>Request`` — generic request body that doesn't fit create/update
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    """Public user representation — never includes hashed_password."""

    model_config = {"from_attributes": True}

    id: str
    email: EmailStr
    display_name: str | None
    is_verified: bool
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Login / Tokens
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""

    email: EmailStr
    password: str = Field(max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        """Trim and lower-case the user identifier before EmailStr validation."""
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("password", mode="before")
    @classmethod
    def reject_blank_password(cls, v: object) -> object:
        """Reject blank login passwords before the request reaches the service layer."""
        if isinstance(v, str) and not v.strip():
            raise ValueError("Password is required.")
        return v


class TokenResponse(BaseModel):
    """JWT pair returned by login and refresh endpoints."""

    access_token: str = Field(min_length=1)
    refresh_token: str = Field(min_length=1)
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - JWT token type constant, not a password.
    expires_in: int = Field(gt=0, description="Access token TTL in seconds.")


class RefreshRequest(BaseModel):
    """Request body for POST /auth/refresh."""

    refresh_token: str = Field(min_length=1)

    @field_validator("refresh_token", mode="before")
    @classmethod
    def reject_blank_refresh_token(cls, v: object) -> object:
        """Reject blank refresh tokens before service-layer rotation logic runs."""
        if isinstance(v, str) and not v.strip():
            raise ValueError("Refresh token is required.")
        return v


class LogoutRequest(BaseModel):
    """Request body for POST /auth/logout."""

    refresh_token: str


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


class PasswordResetRequest(BaseModel):
    """Request body for POST /auth/password-reset (request reset link)."""

    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        """Trim and lower-case email before EmailStr format validation."""
        if isinstance(v, str):
            return v.strip().lower()
        return v


class PasswordResetRequestResponse(BaseModel):
    """Response body for POST /auth/password-reset.

    The message is intentionally generic to prevent account enumeration.
    """

    message: str = "If an account with that email exists, a reset link has been sent."


class PasswordResetConfirmRequest(BaseModel):
    """Request body for POST /auth/password-reset/confirm."""

    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter.")
        return v


class PasswordResetConfirmResponse(BaseModel):
    """Response body for POST /auth/password-reset/confirm."""

    message: str = "Password reset successfully."


# ---------------------------------------------------------------------------
# OAuth
# ---------------------------------------------------------------------------


class OAuthLoginURLResponse(BaseModel):
    """Response body for GET /auth/oauth/{provider}/login."""

    authorization_url: str
    state: str


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


class RoleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    description: str | None


class PermissionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    key: str
    description: str | None
