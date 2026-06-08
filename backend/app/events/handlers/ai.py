"""Generate the ALink-AI chat reply asynchronously (off the request path).

Consumes ``chat.message.created`` events for AI threads, classifies the user's
intent with the typo-tolerant ML model, and writes the assistant's reply. When
``ANTHROPIC_API_KEY`` is set it upgrades to a real Claude response, otherwise it
uses the local intent classifier.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy.orm import Session

from ...config import settings
from ...ml import intent as intent_model
from ...models import ChatMessage
from ..contracts import DomainEvent, EventType

logger = logging.getLogger("alink.events.handlers.ai")


def _claude_reply(prompt: str, user_name: str | None) -> str | None:
    """Optional upgrade path. Returns None on any failure → caller falls back."""
    if not settings.anthropic_api_key:
        return None
    try:  # pragma: no cover - network path, exercised only when a key is set
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=300,
            system=(
                "You are ALink AI, a concise, warm career-networking assistant for an "
                "alumni-student platform. Help with finding alumni, drafting intros, prepping "
                "for sessions, recommending jobs, and tracking referrals. Keep replies under 80 words."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
        text = "\n".join(parts).strip()
        return text or None
    except Exception as exc:
        logger.warning("Claude reply failed (%s); using local intent model.", exc)
        return None


def handle(event: DomainEvent, db: Session) -> None:
    if event.type != EventType.CHAT_MESSAGE_CREATED:
        return
    p = event.payload
    if not p.get("is_ai"):
        return
    if p.get("sender_id") is None:  # never reply to the assistant's own messages
        return

    thread_id = p.get("thread_id")
    body = p.get("body", "")
    if not thread_id or not body.strip():
        return

    user_name = p.get("sender_name")
    reply = _claude_reply(body, user_name) or intent_model.generate_reply(body, user_name=user_name)

    db.add(ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:10]}",
        thread_id=thread_id,
        sender_id=None,
        body=reply,
        is_ai=True,
        read=False,
    ))
