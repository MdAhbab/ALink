"""Achievements worker — awards badges when thresholds are crossed."""
from __future__ import annotations

from ..events.handlers import achievements
from .base import run

ROUTING_KEYS = [
    "connection.accepted",
    "booking.created",
    "referral.status_changed",
]


def main() -> None:
    run("alink.achievements", ROUTING_KEYS, achievements)


if __name__ == "__main__":
    main()
