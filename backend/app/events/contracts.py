"""Domain-event contracts shared by producers and consumers.

Keep payloads self-contained (carry the ids + display strings handlers need)
so consumers avoid extra round-trips and events remain replayable.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class EventType:
    """Routing keys for the ``alink.events`` topic exchange."""

    USER_REGISTERED = "user.registered"
    CONNECTION_REQUESTED = "connection.requested"
    CONNECTION_ACCEPTED = "connection.accepted"
    BOOKING_CREATED = "booking.created"
    BOOKING_CANCELLED = "booking.cancelled"
    REFERRAL_CREATED = "referral.created"
    REFERRAL_STATUS_CHANGED = "referral.status_changed"
    JOB_POSTED = "job.posted"
    JOB_APPROVED = "job.approved"
    VERIFICATION_SUBMITTED = "verification.submitted"
    VERIFICATION_APPROVED = "verification.approved"
    MENTORSHIP_APPLIED = "mentorship.applied"
    EVENT_RSVP = "event.rsvp"
    CHAT_MESSAGE_CREATED = "chat.message.created"

    # Convenience groupings for queue bindings.
    ALL = "#"


@dataclass(slots=True)
class DomainEvent:
    type: str
    payload: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=lambda: f"ev_{uuid.uuid4().hex}")
    occurred_at: str = field(default_factory=_now_iso)

    def to_bytes(self) -> bytes:
        return json.dumps(
            {
                "id": self.id,
                "type": self.type,
                "payload": self.payload,
                "occurred_at": self.occurred_at,
            }
        ).encode("utf-8")

    @classmethod
    def from_bytes(cls, raw: bytes) -> "DomainEvent":
        data = json.loads(raw.decode("utf-8"))
        return cls(
            id=data.get("id", f"ev_{uuid.uuid4().hex}"),
            type=data["type"],
            payload=data.get("payload", {}),
            occurred_at=data.get("occurred_at", _now_iso()),
        )
