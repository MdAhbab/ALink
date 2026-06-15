"""RabbitMQ-backed event bus with a graceful in-process fallback.

Design
------
* Producers call :func:`publish` from synchronous FastAPI routes. It is
  non-blocking: the event is dropped onto an in-memory queue and a single
  daemon **publisher thread** drains it.
* The publisher thread owns one (not thread-safe) ``pika`` connection. If a
  broker is configured and reachable it publishes to the durable
  ``alink.events`` topic exchange (routing key = event type). If the broker is
  unset, unreachable, or ``pika`` is missing, it runs the **in-process
  handlers** directly so notifications/activity/achievements are still produced.
* Workers call :func:`consume` (blocking) to bind a durable queue and process
  events with manual acks.
"""
from __future__ import annotations

import logging
import queue
import threading
import time
from typing import Callable

from ..config import settings
from .contracts import DomainEvent

logger = logging.getLogger("alink.events")

try:  # pika is optional — absence simply forces the in-process fallback.
    import pika

    _PIKA_AVAILABLE = True
except Exception:  # pragma: no cover - import guard
    pika = None  # type: ignore[assignment]
    _PIKA_AVAILABLE = False


class EventBus:
    def __init__(self) -> None:
        self._url = settings.rabbitmq_url
        self._exchange = settings.events_exchange
        self._broker_enabled = bool(self._url) and _PIKA_AVAILABLE
        if settings.rabbitmq_url and not _PIKA_AVAILABLE:
            logger.warning("RABBITMQ_URL set but `pika` is not installed — using in-process fallback.")
        self._queue: "queue.Queue[DomainEvent]" = queue.Queue(maxsize=10_000)
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()
        self._conn = None
        self._channel = None

    # ── Public API ───────────────────────────────────────────────────────────
    def publish(self, event_type: str, payload: dict | None = None) -> DomainEvent:
        event = DomainEvent(type=event_type, payload=payload or {})
        self._ensure_thread()
        try:
            self._queue.put_nowait(event)
        except queue.Full:  # pragma: no cover - backpressure safety valve
            logger.error("Event queue full; handling %s synchronously.", event_type)
            self._handle_in_process(event)
        return event

    # ── Publisher thread ─────────────────────────────────────────────────────
    def _ensure_thread(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._thread = threading.Thread(target=self._run, name="alink-event-publisher", daemon=True)
            self._thread.start()

    def _run(self) -> None:
        while True:
            event = self._queue.get()
            try:
                if self._broker_enabled and self._publish_to_broker(event):
                    continue
                # No broker (or publish failed) → don't lose the event.
                self._handle_in_process(event)
            except Exception:  # pragma: no cover - defensive
                logger.exception("Failed to process event %s", event.type)
            finally:
                self._queue.task_done()

    def _connect(self) -> bool:
        if self._channel and self._channel.is_open:
            return True
        try:
            params = pika.URLParameters(self._url)  # type: ignore[union-attr]
            params.heartbeat = 30
            params.blocked_connection_timeout = 15
            self._conn = pika.BlockingConnection(params)  # type: ignore[union-attr]
            self._channel = self._conn.channel()
            self._channel.exchange_declare(
                exchange=self._exchange, exchange_type="topic", durable=True
            )
            logger.info("Connected to RabbitMQ exchange '%s'.", self._exchange)
            return True
        except Exception as exc:
            logger.warning("RabbitMQ unavailable (%s); falling back to in-process handling.", exc)
            self._channel = None
            self._conn = None
            return False

    def _publish_to_broker(self, event: DomainEvent) -> bool:
        for attempt in range(2):
            if not self._connect():
                return False
            try:
                self._channel.basic_publish(  # type: ignore[union-attr]
                    exchange=self._exchange,
                    routing_key=event.type,
                    body=event.to_bytes(),
                    properties=pika.BasicProperties(  # type: ignore[union-attr]
                        delivery_mode=2,  # persistent
                        message_id=event.id,
                        content_type="application/json",
                    ),
                )
                return True
            except Exception as exc:
                logger.warning("Publish attempt %d for %s failed: %s", attempt + 1, event.type, exc)
                self._channel = None
                self._conn = None
                time.sleep(0.2)
        return False

    def _handle_in_process(self, event: DomainEvent) -> None:
        # Imported lazily to avoid import cycles (handlers import models/db).
        from . import handlers

        handlers.dispatch_in_process(event)


_bus: EventBus | None = None
_bus_lock = threading.Lock()


def get_bus() -> EventBus:
    global _bus
    if _bus is None:
        with _bus_lock:
            if _bus is None:
                _bus = EventBus()
    return _bus


def publish(event_type: str, payload: dict | None = None) -> DomainEvent:
    """Producer entry point. Safe to call from synchronous routes."""
    return get_bus().publish(event_type, payload)


# ── Worker-side consumption ──────────────────────────────────────────────────
def consume(
    queue_name: str,
    routing_keys: list[str],
    handler: Callable[[DomainEvent], None],
    *,
    prefetch: int = 16,
) -> None:
    """Blocking consume loop for worker microservices (manual ack, auto-reconnect)."""
    if not (settings.rabbitmq_url and _PIKA_AVAILABLE):
        raise RuntimeError(
            "consume() requires RABBITMQ_URL and the `pika` package. "
            "Workers are only used in broker mode; local dev relies on the in-process fallback."
        )

    exchange = settings.events_exchange
    while True:
        try:
            params = pika.URLParameters(settings.rabbitmq_url)  # type: ignore[union-attr]
            params.heartbeat = 30
            conn = pika.BlockingConnection(params)  # type: ignore[union-attr]
            channel = conn.channel()
            channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
            channel.queue_declare(queue=queue_name, durable=True)
            for key in routing_keys:
                channel.queue_bind(exchange=exchange, queue=queue_name, routing_key=key)
            channel.basic_qos(prefetch_count=prefetch)
            logger.info("Worker '%s' bound to %s; waiting for events.", queue_name, routing_keys)

            def _on_message(ch, method, _props, body):
                try:
                    event = DomainEvent.from_bytes(body)
                    handler(event)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception:
                    logger.exception("Handler error in '%s'; requeue=False", queue_name)
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=queue_name, on_message_callback=_on_message)
            channel.start_consuming()
        except Exception as exc:  # pragma: no cover - reconnect loop
            logger.warning("Worker '%s' lost broker (%s); reconnecting in 3s.", queue_name, exc)
            time.sleep(3)
