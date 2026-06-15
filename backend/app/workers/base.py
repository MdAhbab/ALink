"""Shared worker runner: wraps a concern handler in a per-message transaction."""
from __future__ import annotations

import logging
from types import ModuleType
from typing import Callable

from ..database import Base, SessionLocal, engine
from ..events.bus import consume
from ..events.contracts import DomainEvent


def _make_callback(concern: ModuleType) -> Callable[[DomainEvent], None]:
    def _callback(event: DomainEvent) -> None:
        db = SessionLocal()
        try:
            concern.handle(event, db)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    return _callback


def run(queue_name: str, routing_keys: list[str], concern: ModuleType) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    log = logging.getLogger(queue_name)
    # Tables may already exist; ensure they do so a worker can start standalone.
    Base.metadata.create_all(bind=engine)
    log.info("Starting worker '%s'.", queue_name)
    consume(queue_name, routing_keys, _make_callback(concern))
