"""Org config singleton service unit tests (in-memory fake repo)."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from domains.org.schemas import CompanyInfoData, WorkSettingsData
from domains.org.service import CompanyInfoService, WorkSettingsService

pytestmark = pytest.mark.unit


@dataclass
class FakeRow:
    """Stand-in row whose attributes get mutated by update()."""

    data: dict[str, object]

    def __getattr__(self, item: str) -> object:
        return self.data[item]


class FakeSingletonRepo:
    def __init__(self, initial: dict[str, object]) -> None:
        self.row = FakeRow(dict(initial))

    async def get(self) -> FakeRow:
        return self.row

    async def update(self, fields: dict[str, object]) -> FakeRow:
        self.row.data.update(fields)
        return self.row


async def test_work_settings_put_replaces_fields() -> None:
    repo = FakeSingletonRepo(
        {
            "start_time": "09:00",
            "end_time": "18:00",
            "lunch_start": "12:00",
            "lunch_end": "13:00",
            "break_minutes": 10,
        }
    )
    svc = WorkSettingsService(repo)  # type: ignore[arg-type]
    payload = WorkSettingsData(
        start_time="08:30",
        end_time="17:30",
        lunch_start="12:00",
        lunch_end="13:00",
        break_minutes=15,
    )
    row = await svc.put(payload)
    assert row.data["start_time"] == "08:30"
    assert row.data["break_minutes"] == 15


async def test_company_info_get_and_put() -> None:
    repo = FakeSingletonRepo(
        {
            "name": "구회사",
            "biz_no": "000-00-00000",
            "ceo": "전대표",
            "founded": "2000-01-01",
            "tel": "02-0000-0000",
            "email": "old@x.com",
            "address": "구주소",
        }
    )
    svc = CompanyInfoService(repo)  # type: ignore[arg-type]
    assert (await svc.get()).data["name"] == "구회사"
    await svc.put(
        CompanyInfoData(
            name="새회사",
            biz_no="123-45-67890",
            ceo="신대표",
            founded="2020-02-02",
            tel="02-1111-2222",
            email="new@x.com",
            address="새주소",
        )
    )
    assert repo.row.data["name"] == "새회사"
    assert repo.row.data["email"] == "new@x.com"
