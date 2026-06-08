"""Users domain Pydantic schemas (employee directory DTOs).

Request / Response DTOs for the ``/api/v1/users`` endpoints. The directory
exposes a ``name`` field that maps to the underlying ``users.display_name``
column (single human name — see ADR-0006); the API contract keeps ``name`` so
the frontend directory screen is unchanged.

Naming convention (matches the auth/members domains):
  * ``UserCreate``  — request body for creation (사번 server-generated, excluded)
  * ``UserUpdate``  — partial-update request body (all fields optional)
  * ``UserResponse`` — single-user (directory record) response body
  * ``UserListResponse`` — paginated list envelope
  * ``UserStatsResponse`` — summary statistics for the dashboard cards
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    """Request body for POST /users. ``employee_no`` is server-generated."""

    name: str = Field(min_length=1, max_length=128)
    department: str = Field(min_length=1, max_length=64)
    rank: str = Field(min_length=1, max_length=64)
    grade: str = Field(min_length=1, max_length=16)
    phone: str = Field(min_length=1, max_length=32)
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", "department", "rank", "grade", "phone", mode="before")
    @classmethod
    def strip_required_text(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field is required.")
            return stripped
        return v


class UserUpdate(BaseModel):
    """Request body for PATCH /users/{id}. All fields optional (partial update)."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    department: str | None = Field(default=None, min_length=1, max_length=64)
    rank: str | None = Field(default=None, min_length=1, max_length=64)
    grade: str | None = Field(default=None, min_length=1, max_length=16)
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    email: EmailStr | None = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", "department", "rank", "grade", "phone", mode="before")
    @classmethod
    def strip_text(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field must not be blank.")
            return stripped
        return v


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    """Single directory-record response body (a ``users`` row with HR fields)."""

    model_config = {"from_attributes": True}

    id: str
    employee_no: str | None
    name: str | None
    department: str | None
    rank: str | None
    grade: str | None
    phone: str | None
    email: EmailStr
    is_active: bool
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _name_from_display_name(cls, data: Any) -> Any:
        """Map the ORM ``display_name`` column onto the API ``name`` field."""
        # ORM object (from_attributes): expose display_name as name.
        if not isinstance(data, dict) and hasattr(data, "display_name"):
            return {
                "id": data.id,
                "employee_no": data.employee_no,
                "name": data.display_name,
                "department": data.department,
                "rank": data.rank,
                "grade": data.grade,
                "phone": data.phone,
                "email": data.email,
                "is_active": data.is_active,
                "created_at": data.created_at,
            }
        return data


class UserListResponse(BaseModel):
    """Paginated list envelope for GET /users."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserStatsResponse(BaseModel):
    """Summary statistics for the dashboard cards (active employees only)."""

    total: int
    department_count: int
    new_this_month: int
    grade_distribution: dict[str, int]
    departments: list[str]
