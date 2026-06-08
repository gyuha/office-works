"""Chat domain Pydantic schemas.

Request/Response models for the conversation and message endpoints.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    conversation_id: str
    role: str
    content: str
    token_count: int | None
    finish_reason: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Conversation
# ---------------------------------------------------------------------------


class ConversationCreate(BaseModel):
    """Request body for POST /chat/conversations."""

    title: str | None = Field(default=None, max_length=256)
    system_prompt: str | None = None


class ConversationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    title: str | None
    system_prompt: str | None
    model_name: str | None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Chat message (user message sent to /conversations/{id}/messages)
# ---------------------------------------------------------------------------


class SendMessageRequest(BaseModel):
    """Request body for POST /chat/conversations/{id}/messages."""

    content: str = Field(min_length=1, max_length=32_000)
    stream: bool = Field(
        default=True,
        description="When True, response is SSE-streamed. When False, returns full JSON.",
    )
