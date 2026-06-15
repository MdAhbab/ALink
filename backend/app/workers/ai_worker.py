"""AI assistant worker — generates chat replies for AI threads."""
from __future__ import annotations

from ..events.handlers import ai
from .base import run

ROUTING_KEYS = ["chat.message.created"]


def main() -> None:
    run("alink.ai", ROUTING_KEYS, ai)


if __name__ == "__main__":
    main()
