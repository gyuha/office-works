"""Members domain Pydantic schemas.

Request / Response DTOs for the member-management endpoints.

Naming convention (matches auth domain):
  * ``MemberCreate``  — request body for creation (사번 server-generated, excluded)
  * ``MemberUpdate``  — partial-update request body (all fields optional)
  * ``MemberResponse`` — single-member response body
  * ``MemberListResponse`` — paginated list envelope
  * ``MemberStatsResponse`` — summary statistics for the dashboard cards
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Grade — fixed 4-value 인사 분류 축 (RBAC role / rank 와 무관)
# ---------------------------------------------------------------------------

Grade = Literal["특급", "고급", "중급", "초급"]


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class MemberCreate(BaseModel):
    """Request body for POST /members. ``employee_no`` is server-generated."""

    name: str = Field(min_length=1, max_length=128)
    department: str = Field(min_length=1, max_length=64)
    rank: str = Field(min_length=1, max_length=64)
    grade: Grade
    phone: str = Field(min_length=1, max_length=32)
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", "department", "rank", "phone", mode="before")
    @classmethod
    def strip_required_text(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Field is required.")
            return stripped
        return v


class MemberUpdate(BaseModel):
    """Request body for PATCH /members/{id}. All fields optional (partial update)."""

    name: str | None = Field(default=None, min_length=1, max_length=128)
    department: str | None = Field(default=None, min_length=1, max_length=64)
    rank: str | None = Field(default=None, min_length=1, max_length=64)
    grade: Grade | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    email: EmailStr | None = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("name", "department", "rank", "phone", mode="before")
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


class MemberResponse(BaseModel):
    """Single-member response body."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    employee_no: str
    user_id: uuid.UUID | None
    name: str
    department: str
    rank: str
    grade: str
    phone: str
    email: EmailStr
    is_active: bool
    created_at: datetime


class MemberListResponse(BaseModel):
    """Paginated list envelope for GET /members."""

    items: list[MemberResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MemberStatsResponse(BaseModel):
    """Summary statistics for the dashboard cards (active members only)."""

    total: int
    department_count: int
    new_this_month: int
    grade_distribution: dict[str, int]
