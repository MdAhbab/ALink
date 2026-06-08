"""Event handlers shared by worker microservices and the in-process fallback.

Each ``handle(event, db)`` adds rows but does **not** commit — the caller owns the
transaction (a worker per-message, or the in-process dispatcher per-event).
"""
from __future__ import annotations

import logging

from ...database import SessionLocal
from ..contracts import DomainEvent
from . import achievements, ai, notifications

logger = logging.getLogger("alink.events.handlers")

__all__ = ["notifications", "achievements", "ai", "dispatch_in_process"]


def dispatch_in_process(event: DomainEvent) -> None:
    """Run every concern for an event in a single local transaction.

    Used when no RabbitMQ broker is configured (local dev / single box without
    workers running) so the platform still produces notifications, activity,
    achievements and AI replies.
    """
    db = SessionLocal()
    try:
        for concern in (notifications, achievements, ai):
            try:
                concern.handle(event, db)
            except Exception:
                logger.exception("In-process handler %s failed for %s", concern.__name__, event.type)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("dispatch_in_process failed for %s", event.type)
    finally:
        db.close()
