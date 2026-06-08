"""Org-settings domain SQLAlchemy ORM models.

Tables
------
* positions         — 직급 체계: ordered list of position names (low → high).
* employment_types  — 고용 형태: list of employment-type names.

Import pattern::

    from domains.org.models import Position, EmploymentType
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base
from core.ids import (
    COMPANY_INFO,
    EMPLOYMENT_TYPE,
    GRADE,
    LEAVE_SETTINGS,
    POSITION,
    WORK_SETTINGS,
    id_column,
)


class Position(Base):
    """A 직급 (organizational position/rank), ordered low → high by ``sort_order``."""

    __tablename__ = "positions"

    id: Mapped[str] = id_column(POSITION)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Position name={self.name!r} sort_order={self.sort_order}>"


class EmploymentType(Base):
    """A 고용 형태 (employment type) — selectable when registering members."""

    __tablename__ = "employment_types"

    id: Mapped[str] = id_column(EMPLOYMENT_TYPE)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EmploymentType name={self.name!r}>"


class Grade(Base):
    """A 등급 (competency grade) — managed list; members reference it by name.

    Carries display colors (hex) mirroring the frontend badge so members
    screens can render any grade dynamically.
    """

    __tablename__ = "grades"

    id: Mapped[str] = id_column(GRADE)
    name: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(9), nullable=False)
    bg: Mapped[str] = mapped_column(String(9), nullable=False)
    border: Mapped[str] = mapped_column(String(9), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Grade name={self.name!r} sort_order={self.sort_order}>"


class WorkSettings(Base):
    """근무 기본값 — singleton (a single row)."""

    __tablename__ = "work_settings"

    id: Mapped[str] = id_column(WORK_SETTINGS)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    lunch_start: Mapped[str] = mapped_column(String(5), nullable=False)
    lunch_end: Mapped[str] = mapped_column(String(5), nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class LeaveSettings(Base):
    """연차 설정 — singleton (a single row)."""

    __tablename__ = "leave_settings"

    id: Mapped[str] = id_column(LEAVE_SETTINGS)
    default_days: Mapped[int] = mapped_column(Integer, nullable=False)
    probation_days: Mapped[int] = mapped_column(Integer, nullable=False)
    add_per_year: Mapped[int] = mapped_column(Integer, nullable=False)
    max_add: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_months: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CompanyInfo(Base):
    """회사 정보 — singleton (a single row)."""

    __tablename__ = "company_info"

    id: Mapped[str] = id_column(COMPANY_INFO)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    biz_no: Mapped[str] = mapped_column(String(32), nullable=False)
    ceo: Mapped[str] = mapped_column(String(64), nullable=False)
    founded: Mapped[str] = mapped_column(String(10), nullable=False)
    tel: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
