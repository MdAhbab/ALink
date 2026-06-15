"""Event-driven messaging layer for ALink.

Producers (FastAPI routers) call :func:`publish`; consumers (worker
microservices) bind queues to the durable ``alink.events`` topic exchange.

When ``RABBITMQ_URL`` is unset or the broker is unreachable, :func:`publish`
degrades gracefully to **in-process synchronous handling** so the app still
produces notifications/activity/achievements without a broker (local dev).
"""
from .contracts import DomainEvent, EventType
from .bus import publish, get_bus

__all__ = ["DomainEvent", "EventType", "publish", "get_bus"]
