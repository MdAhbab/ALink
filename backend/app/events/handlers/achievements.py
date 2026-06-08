"""Award achievements when activity thresholds are crossed.

Achievement ids come from the seed catalogue:
  ac1 First Connection · ac2 Bookworm (5 bookings) · ac3 Warm-Intro Hero
  (a forwarded referral) · ac4 Network Architect (50 connections) ·
  ac5 Pay it Forward (mentor 3 students).
"""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ...models import (
    Achievement, Booking, Connection, Notification, Referral, UserAchievement,
)
from ..contracts import DomainEvent, EventType


def _award(db: Session, user_id: str | None, achievement_id: str) -> None:
    if not user_id:
        return
    ach = db.get(Achievement, achievement_id)
    if not ach:
        return
    already = (
        db.query(UserAchievement)
        .filter(UserAchievement.user_id == user_id, UserAchievement.achievement_id == achievement_id)
        .first()
    )
    if already:
        return
    db.add(UserAchievement(
        id=f"ua_{uuid.uuid4().hex[:10]}",
        user_id=user_id,
        achievement_id=achievement_id,
        earned_at=date.today().isoformat(),
    ))
    db.add(Notification(
        id=f"n_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        title=f"Achievement unlocked: {ach.title} {ach.emoji}",
        body=ach.description,
        unread=True,
    ))


def _connection_count(db: Session, user_id: str) -> int:
    return (
        db.query(Connection)
        .filter(or_(Connection.a_id == user_id, Connection.b_id == user_id))
        .count()
    )


def _evaluate_connections(db: Session, user_id: str | None) -> None:
    if not user_id:
        return
    total = _connection_count(db, user_id)
    if total >= 1:
        _award(db, user_id, "ac1")
    if total >= 50:
        _award(db, user_id, "ac4")


def handle(event: DomainEvent, db: Session) -> None:
    p = event.payload
    t = event.type

    if t == EventType.CONNECTION_ACCEPTED:
        _evaluate_connections(db, p.get("requester_id"))
        _evaluate_connections(db, p.get("acceptor_id"))

    elif t == EventType.BOOKING_CREATED:
        owner = p.get("owner_id")
        if owner:
            booked = db.query(Booking).filter(Booking.owner_id == owner).count()
            if booked >= 5:
                _award(db, owner, "ac2")
        mentor = p.get("with_id")
        if mentor:
            mentees = (
                db.query(Booking.owner_id)
                .filter(Booking.with_id == mentor)
                .distinct()
                .count()
            )
            if mentees >= 3:
                _award(db, mentor, "ac5")

    elif t == EventType.REFERRAL_STATUS_CHANGED:
        if (p.get("status") or "") == "forwarded":
            _award(db, p.get("owner_id"), "ac3")
