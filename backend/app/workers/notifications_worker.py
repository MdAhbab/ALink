"""Notifications + activity worker."""
from __future__ import annotations

from ..events.handlers import notifications
from .base import run

ROUTING_KEYS = [
    "user.registered",
    "connection.*",
    "booking.*",
    "referral.*",
    "job.*",
    "verification.*",
    "mentorship.*",
    "event.*",
]


def main() -> None:
    run("alink.notifications", ROUTING_KEYS, notifications)


if __name__ == "__main__":
    main()
