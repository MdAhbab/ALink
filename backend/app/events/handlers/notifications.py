"""Turn domain events into Notification + Activity rows for the right users.

Activity.kind is constrained by the API schema to:
connection | booking | referral | post | verify  — stay within that set.
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from ...models import Activity, Notification
from ..contracts import DomainEvent, EventType


def _notify(db: Session, user_id: str | None, title: str, body: str = "") -> None:
    if not user_id:
        return
    db.add(Notification(
        id=f"n_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        title=title,
        body=body,
        unread=True,
    ))


def _activity(db: Session, user_id: str | None, kind: str, title: str, meta: str = "") -> None:
    if not user_id:
        return
    db.add(Activity(
        id=f"a_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        kind=kind,
        title=title,
        meta=meta,
    ))


def handle(event: DomainEvent, db: Session) -> None:
    p = event.payload
    t = event.type

    if t == EventType.USER_REGISTERED:
        _notify(db, p.get("user_id"), "Welcome to ALink 👋",
                "Complete your profile and find your first connection.")

    elif t == EventType.CONNECTION_REQUESTED:
        name = p.get("from_name", "Someone")
        _notify(db, p.get("to_id"), "New connection request",
                f"{name} wants to connect with you.")
        _activity(db, p.get("to_id"), "connection", f"{name} requested to connect",
                  p.get("from_title", ""))

    elif t == EventType.CONNECTION_ACCEPTED:
        name = p.get("acceptor_name", "Someone")
        _notify(db, p.get("requester_id"), f"{name} accepted your request",
                "Say hello and book a session.")
        _activity(db, p.get("requester_id"), "connection", f"{name} accepted your connection",
                  p.get("acceptor_title", ""))

    elif t == EventType.BOOKING_CREATED:
        owner = p.get("owner_name", "A student")
        topic = p.get("topic", "a session")
        when = " · ".join(x for x in (p.get("date"), p.get("time")) if x)
        _notify(db, p.get("with_id"), "New session request", f"{owner}: {topic}")
        _activity(db, p.get("owner_id"), "booking", f"Requested: {topic}",
                  f"with {p.get('with_name', '')}{(' · ' + when) if when else ''}")

    elif t == EventType.BOOKING_CANCELLED:
        other = p.get("notify_id")
        _notify(db, other, "Session cancelled", p.get("topic", ""))

    elif t == EventType.REFERRAL_CREATED:
        owner = p.get("owner_name", "A student")
        company = p.get("company", "")
        _notify(db, p.get("referrer_id"), "New referral request",
                f"{owner} is requesting a referral to {company}.")
        _activity(db, p.get("owner_id"), "referral", f"Requested referral · {company}",
                  p.get("role", ""))

    elif t == EventType.REFERRAL_STATUS_CHANGED:
        company = p.get("company", "")
        status = (p.get("status", "") or "").replace("_", " ")
        _notify(db, p.get("owner_id"), f"Referral {status}", f"{company} · {p.get('role', '')}")
        _activity(db, p.get("owner_id"), "referral", f"Referral {status} · {company}", p.get("role", ""))

    elif t == EventType.JOB_POSTED:
        _activity(db, p.get("posted_by_id"), "post", f"Posted: {p.get('role', '')}",
                  f"{p.get('company', '')} · pending review")

    elif t == EventType.JOB_APPROVED:
        _notify(db, p.get("posted_by_id"), "Your job post is live ✅",
                f"{p.get('role', '')} at {p.get('company', '')}")
        _activity(db, p.get("posted_by_id"), "post", f"Job approved: {p.get('role', '')}",
                  p.get("company", ""))

    elif t == EventType.VERIFICATION_SUBMITTED:
        _activity(db, p.get("user_id"), "verify", "Verification submitted",
                  p.get("university", ""))

    elif t == EventType.VERIFICATION_APPROVED:
        _notify(db, p.get("user_id"), "You're verified ✅",
                "Your identity is confirmed — you now stand out in the directory.")
        _activity(db, p.get("user_id"), "verify", "Profile verified", p.get("university", ""))

    elif t == EventType.MENTORSHIP_APPLIED:
        applicant = p.get("applicant_name", "A student")
        _notify(db, p.get("mentor_id"), "New mentorship application",
                f"{applicant} applied to {p.get('title', 'your program')}.")
        _activity(db, p.get("applicant_id"), "connection", f"Applied: {p.get('title', '')}",
                  p.get("mentor_name", ""))

    elif t == EventType.EVENT_RSVP:
        _activity(db, p.get("user_id"), "post", f"RSVP'd: {p.get('title', '')}",
                  p.get("location", ""))
