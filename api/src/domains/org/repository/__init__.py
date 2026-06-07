"""Org-settings domain repositories."""

from domains.org.repository.config_repository import (
    CompanyInfoRepository,
    LeaveSettingsRepository,
    WorkSettingsRepository,
)
from domains.org.repository.employment_type_repository import EmploymentTypeRepository
from domains.org.repository.grade_repository import GradeRepository
from domains.org.repository.position_repository import PositionRepository

__all__ = [
    "CompanyInfoRepository",
    "EmploymentTypeRepository",
    "GradeRepository",
    "LeaveSettingsRepository",
    "PositionRepository",
    "WorkSettingsRepository",
]
