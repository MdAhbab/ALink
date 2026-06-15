import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import Event, EventRSVP, User
from ..schemas import EventIn, EventOut


router = APIRouter(prefix="/events", tags=["events"])


def _rsvp_count(db: Session, event_id: str) -> int:
    return db.query(func.count(EventRSVP.id)).filter(EventRSVP.event_id == event_id).scalar() or 0


def _to_out(db: Session, event: Event) -> EventOut:
    """Serialize an event with a drift-proof headcount.

    The stored ``attending`` is treated as a seed/base figure; live RSVP rows are
    added on top, so the count is always consistent (no manual counter to drift).
    """
    out = EventOut.model_validate(event)
    out.attending = (event.attending or 0) + _rsvp_count(db, event.id)
    return out


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    body: EventIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Event:
    if current.role not in ["admin", "alumni"]:
        raise HTTPException(403, "Only admins or alumni can create events")
    
    e = Event(
        id=f"ev_{uuid.uuid4().hex[:10]}",
        title=body.title,
        kind=body.kind,
        date=body.date,
        time=body.time,
        location=body.location,
        host=body.host,
        cover=body.cover,
        capacity=body.capacity,
        tags=body.tags,
        attending=0,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_out(db, e)


@router.get("", response_model=list[EventOut])
def list_events(
    kind: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Event]:
    qry = db.query(Event)
    if kind:
        qry = qry.filter(Event.kind == kind)
    events = qry.order_by(Event.date.asc()).all()
    return [_to_out(db, e) for e in events]


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> EventOut:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(404, "Event not found")
    return _to_out(db, e)


@router.post("/{event_id}/rsvp", status_code=201)
def rsvp(
    event_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(404, "Event not found")
    exists = (
        db.query(EventRSVP)
        .filter(EventRSVP.event_id == event_id, EventRSVP.user_id == current.id)
        .first()
    )
    if exists:
        return {"ok": True, "already": True}
    if e.capacity > 0 and ((e.attending or 0) + _rsvp_count(db, event_id)) >= e.capacity:
        raise HTTPException(409, "Event is at full capacity")
    db.add(EventRSVP(id=f"rsvp_{uuid.uuid4().hex[:10]}", event_id=event_id, user_id=current.id))
    db.commit()
    publish(EventType.EVENT_RSVP, {
        "event_id": e.id,
        "title": e.title,
        "user_id": current.id,
        "location": e.location,
    })
    return {"ok": True}


@router.delete("/{event_id}/rsvp", status_code=204)
def cancel_rsvp(
    event_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    row = (
        db.query(EventRSVP)
        .filter(EventRSVP.event_id == event_id, EventRSVP.user_id == current.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "RSVP not found")
    db.delete(row)
    db.commit()
