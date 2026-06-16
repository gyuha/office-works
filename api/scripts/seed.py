"""Idempotent dev/bootstrap seed — the canonical org-settings dataset.

Run after migrations::

    task seed          # or: PYTHONPATH=src uv run python scripts/seed.py

Upserts by natural key (``key`` / ``name`` / singleton row), so it is safe to
re-run. It reflects the *current* dataset — in particular the UI-customized
``grades`` (colors, ordering, descriptions) that the schema migrations' built-in
defaults do not capture.

Out of scope by design: ``users``, ``oauth_accounts`` and ``refresh_tokens`` are
environment-specific / sensitive / ephemeral and are never seeded here.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import get_settings
from domains.auth.models.auth_models import Permission, Role, role_permissions
from domains.org.models.org_models import (
    CompanyInfo,
    EmploymentType,
    Grade,
    LeaveSettings,
    Position,
    WorkSettings,
)
from domains.projects.models import Project

# ── Seed data (mirrors the current database) ───────────────────────────────

PERMISSIONS: list[tuple[str, str]] = [
    ("org:write", "Create/update/delete organization settings (직급/등급/etc.)."),
    ("users:write", "Create/update/delete users (employee directory)."),
]

ROLES: list[tuple[str, str]] = [
    ("admin", "Administrator role."),
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": ["org:write", "users:write"],
}

# 직급 (low → high); sort_order is the 1-based position in this list.
POSITIONS: list[str] = ["사원", "선임", "책임", "수석", "실장", "상무", "전무", "대표이사"]

EMPLOYMENT_TYPES: list[str] = ["정규직", "계약직", "파트타임", "인턴", "프리랜서"]

# 등급 — current customized values (name, color, bg, border, description, sort_order)
GRADES: list[tuple[str, str, str, str, str, int]] = [
    ("특급", "#0066FF", "#E8F0FF", "#A9C9FF", "최고 전문가 · 사내 기술 리더", 3),
    ("고급", "#00BF40", "#E6F8EC", "#B8EECB", "전문성 인정 · 팀 리딩 가능 수준", 4),
    ("중급", "#FF9200", "#FFF3E0", "#FFD9A0", "독립 수행 가능 · 실무 경험 2년 이상", 5),
    ("초급", "#8a7e00", "#fffee5", "#eed21b", "초급 개발 자", 6),
]

WORK_SETTINGS: dict[str, Any] = {
    "start_time": "09:00",
    "end_time": "18:00",
    "lunch_start": "12:00",
    "lunch_end": "13:00",
    "break_minutes": 10,
}

LEAVE_SETTINGS: dict[str, Any] = {
    "default_days": 15,
    "probation_days": 3,
    "add_per_year": 1,
    "max_add": 5,
    "expiry_months": 24,
}

COMPANY_INFO: dict[str, Any] = {
    "name": "오피스메이트 주식회사",
    "biz_no": "123-45-67890",
    "ceo": "홍길동",
    "founded": "2018-03-15",
    "tel": "02-1234-5678",
    "email": "contact@officemate.co.kr",
    "address": "서울특별시 강남구 테헤란로 123 오피스메이트빌딩 7층",
}

# 프로젝트 — 데모 데이터셋 (id 기준 upsert). 본문이 길어 별도 JSON 파일에서 로드.
PROJECTS: list[dict[str, Any]] = json.loads(
    (Path(__file__).parent / "projects_seed.json").read_text(encoding="utf-8")
)


# ── Upsert helpers ─────────────────────────────────────────────────────────


async def _upsert_by(
    session: AsyncSession, model: Any, key_field: str, key_value: str, fields: dict[str, Any]
) -> Any:
    """Find a row by a natural key; update its fields, or insert it."""
    obj = await session.scalar(select(model).where(getattr(model, key_field) == key_value))
    if obj is None:
        obj = model(**{key_field: key_value}, **fields)
        session.add(obj)
    else:
        for name, value in fields.items():
            setattr(obj, name, value)
    return obj


async def _upsert_singleton(session: AsyncSession, model: Any, fields: dict[str, Any]) -> None:
    """Update the single existing row, or insert one."""
    obj = await session.scalar(select(model).limit(1))
    if obj is None:
        session.add(model(**fields))
    else:
        for name, value in fields.items():
            setattr(obj, name, value)


async def seed(session: AsyncSession) -> None:
    perms = {
        key: await _upsert_by(session, Permission, "key", key, {"description": desc})
        for key, desc in PERMISSIONS
    }
    roles = {
        name: await _upsert_by(session, Role, "name", name, {"description": desc})
        for name, desc in ROLES
    }
    await session.flush()  # populate generated ids before linking

    for role_name, perm_keys in ROLE_PERMISSIONS.items():
        for perm_key in perm_keys:
            await session.execute(
                pg_insert(role_permissions)
                .values(role_id=roles[role_name].id, permission_id=perms[perm_key].id)
                .on_conflict_do_nothing()
            )

    for order, name in enumerate(POSITIONS, start=1):
        await _upsert_by(session, Position, "name", name, {"sort_order": order})

    for order, name in enumerate(EMPLOYMENT_TYPES, start=1):
        await _upsert_by(session, EmploymentType, "name", name, {"sort_order": order})

    for name, color, bg, border, description, sort_order in GRADES:
        await _upsert_by(
            session,
            Grade,
            "name",
            name,
            {
                "color": color,
                "bg": bg,
                "border": border,
                "description": description,
                "sort_order": sort_order,
            },
        )

    await _upsert_singleton(session, WorkSettings, WORK_SETTINGS)
    await _upsert_singleton(session, LeaveSettings, LEAVE_SETTINGS)
    await _upsert_singleton(session, CompanyInfo, COMPANY_INFO)

    for proj in PROJECTS:
        fields = {k: v for k, v in proj.items() if k != "id"}
        await _upsert_by(session, Project, "id", proj["id"], fields)


async def main() -> None:
    engine = create_async_engine(get_settings().database_url)
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessionmaker() as session, session.begin():
            await seed(session)
    finally:
        await engine.dispose()
    print("✅ seed complete")


if __name__ == "__main__":
    asyncio.run(main())
