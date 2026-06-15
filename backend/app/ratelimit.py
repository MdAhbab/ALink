"""Lightweight in-process sliding-window rate limiting.

Used to blunt credential brute-forcing on the auth endpoints. It is per-process
(each gunicorn worker keeps its own window), which is intentionally simple — for
stricter global limits, move the window to Redis. Good enough as a first defence.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindowLimiter:
    def __init__(self, max_events: int, window_seconds: float) -> None:
        self.max_events = max_events
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            cutoff = now - self.window
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self.max_events:
                return False
            q.append(now)
            # Opportunistic cleanup so the dict doesn't grow unbounded.
            if len(self._hits) > 10_000:
                self._hits = defaultdict(deque, {k: v for k, v in self._hits.items() if v})
            return True


def client_ip(request: Request) -> str:
    """Best-effort client IP, honouring the nginx X-Forwarded-For header."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# 10 attempts / minute / IP on auth endpoints.
_auth_limiter = SlidingWindowLimiter(max_events=10, window_seconds=60.0)


def rate_limit_auth(request: Request) -> None:
    if not _auth_limiter.allow(f"auth:{client_ip(request)}"):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many attempts. Please wait a minute and try again.",
        )
