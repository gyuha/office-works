"""Service layer for the 직급(Position) entity."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy.exc import IntegrityError

from core.exceptions import ConflictError, NotFoundError
from domains.org.models import Position
from domains.org.repository import PositionRepository


class PositionService:
    """Business logic for 직급 체계 (positions)."""

    def __init__(self, repo: PositionRepository) -> None:
        self._repo = repo

    async def list(self) -> Sequence[Position]:
        return await self._repo.list()

    async def create(self, name: str) -> Position:
        if await self._repo.get_by_name(name) is not None:
            raise ConflictError(f"A position named '{name}' already exists.")
        try:
            return await self._repo.create(name)
        except IntegrityError as exc:
            raise ConflictError(f"A position named '{name}' already exists.") from exc

    async def rename(self, position_id: uuid.UUID, name: str) -> Position:
        position = await self._repo.get_by_id(position_id)
        if position is None:
            raise NotFoundError("Position")
        existing = await self._repo.get_by_name(name)
        if existing is not None and existing.id != position_id:
            raise ConflictError(f"A position named '{name}' already exists.")
        return await self._repo.update_name(position, name)

    async def delete(self, position_id: uuid.UUID) -> None:
        position = await self._repo.get_by_id(position_id)
        if position is None:
            raise NotFoundError("Position")
        await self._repo.delete(position)

    async def reorder(self, ordered_ids: Sequence[uuid.UUID]) -> Sequence[Position]:
        return await self._repo.reorder(ordered_ids)


__all__ = ["PositionService"]
