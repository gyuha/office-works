"""Org-settings domain Pydantic schemas (직급 체계 / positions)."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, Field, field_validator


class PositionCreate(BaseModel):
    """Request body for POST /positions."""

    name: str = Field(min_length=1, max_length=64)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name is required.")
            return stripped
        return v


class PositionUpdate(BaseModel):
    """Request body for PATCH /positions/{id} (rename)."""

    name: str = Field(min_length=1, max_length=64)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name must not be blank.")
            return stripped
        return v


class PositionReorder(BaseModel):
    """Request body for PATCH /positions/order — full ordered list of ids (low→high)."""

    ordered_ids: list[uuid.UUID] = Field(min_length=1)


class PositionResponse(BaseModel):
    """Single-position response body."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    sort_order: int


class EmploymentTypeCreate(BaseModel):
    """Request body for POST /employment-types."""

    name: str = Field(min_length=1, max_length=64)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name is required.")
            return stripped
        return v


class EmploymentTypeResponse(BaseModel):
    """Single employment-type response body."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    sort_order: int


_HEX = r"^#[0-9A-Fa-f]{6}$"


class GradeCreate(BaseModel):
    """Request body for POST /grades."""

    name: str = Field(min_length=1, max_length=16)
    color: str = Field(pattern=_HEX)
    bg: str = Field(pattern=_HEX)
    border: str = Field(pattern=_HEX)
    description: str = Field(default="", max_length=2000)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name is required.")
            return stripped
        return v


class GradeUpdate(BaseModel):
    """Request body for PATCH /grades/{id} — partial (rename + meta)."""

    name: str | None = Field(default=None, min_length=1, max_length=16)
    color: str | None = Field(default=None, pattern=_HEX)
    bg: str | None = Field(default=None, pattern=_HEX)
    border: str | None = Field(default=None, pattern=_HEX)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: object) -> object:
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                raise ValueError("Name must not be blank.")
            return stripped
        return v


class GradeReorder(BaseModel):
    """Request body for PATCH /grades/order — full ordered list of ids (low→high)."""

    ordered_ids: list[uuid.UUID] = Field(min_length=1)


class GradeResponse(BaseModel):
    """Single grade response body."""

    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str
    bg: str
    border: str
    description: str
    sort_order: int


# --- Org config singletons (GET response = PUT body, all required) -----------

_TIME = r"^([01]\d|2[0-3]):[0-5]\d$"


class WorkSettingsData(BaseModel):
    """근무 기본값 — GET response / PUT body."""

    model_config = {"from_attributes": True}

    start_time: str = Field(pattern=_TIME)
    end_time: str = Field(pattern=_TIME)
    lunch_start: str = Field(pattern=_TIME)
    lunch_end: str = Field(pattern=_TIME)
    break_minutes: int = Field(ge=0, le=600)


class LeaveSettingsData(BaseModel):
    """연차 설정 — GET response / PUT body."""

    model_config = {"from_attributes": True}

    default_days: int = Field(ge=0, le=365)
    probation_days: int = Field(ge=0, le=365)
    add_per_year: int = Field(ge=0, le=365)
    max_add: int = Field(ge=0, le=365)
    expiry_months: int = Field(ge=0, le=600)


class CompanyInfoData(BaseModel):
    """회사 정보 — GET response / PUT body."""

    model_config = {"from_attributes": True}

    name: str = Field(min_length=1, max_length=255)
    biz_no: str = Field(min_length=1, max_length=32)
    ceo: str = Field(min_length=1, max_length=64)
    founded: str = Field(min_length=1, max_length=10)
    tel: str = Field(min_length=1, max_length=32)
    email: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=2000)
