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
