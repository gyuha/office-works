"""Repository for the 직급(Position) entity — async SQLAlchemy data access."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.org.models import Position


class PositionRepository:
    """Data access for positions, ordered low→high by ``sort_order``."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> Sequence[Position]:
        result = await self._session.execute(select(Position).order_by(Position.sort_order))
        return result.scalars().all()

    async def get_by_id(self, position_id: uuid.UUID) -> Position | None:
        return await self._session.get(Position, position_id)

    async def get_by_name(self, name: str) -> Position | None:
        result = await self._session.execute(select(Position).where(Position.name == name))
        return result.scalar_one_or_none()

    async def create(self, name: str) -> Position:
        """Append a new position at the end (sort_order = current max + 1)."""
        max_order = (
            await self._session.execute(select(func.coalesce(func.max(Position.sort_order), 0)))
        ).scalar_one()
        position = Position(name=name, sort_order=int(max_order) + 1)
        self._session.add(position)
        await self._session.flush()
        return position

    async def update_name(self, position: Position, name: str) -> Position:
        position.name = name
        await self._session.flush()
        return position

    async def delete(self, position: Position) -> None:
        await self._session.delete(position)
        await self._session.flush()

    async def reorder(self, ordered_ids: Sequence[uuid.UUID]) -> Sequence[Position]:
        """Reassign sort_order 1..N following the given id order."""
        positions = {p.id: p for p in await self.list()}
        for order, pid in enumerate(ordered_ids, start=1):
            position = positions.get(pid)
            if position is not None:
                position.sort_order = order
        await self._session.flush()
        return await self.list()
