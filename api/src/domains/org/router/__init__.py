"""Org-settings domain routers — aggregated under one ``router``."""

from fastapi import APIRouter

from domains.org.router.config_router import router as config_router
from domains.org.router.employment_type_router import router as employment_type_router
from domains.org.router.grade_router import router as grade_router
from domains.org.router.position_router import router as position_router

router = APIRouter()
router.include_router(position_router)
router.include_router(employment_type_router)
router.include_router(grade_router)
router.include_router(config_router)

__all__ = ["router"]
