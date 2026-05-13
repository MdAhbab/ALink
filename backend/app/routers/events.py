import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Event, EventRSVP, User
from ..schemas import EventOut


router = APIRouter(prefix="/events", tags=["events"])
from ..schemas import EventIn

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
    return e


@router.get("", response_model=list[EventOut])
def list_events(
    kind: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Event]:
    qry = db.query(Event)
    if kind:
        qry = qry.filter(Event.kind == kind)
    return qry.order_by(Event.date.asc()).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Event:
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(404, "Event not found")
    return e


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
    if e.capacity > 0 and (e.attending or 0) >= e.capacity:
        raise HTTPException(409, "Event is at full capacity")
    db.add(EventRSVP(id=f"rsvp_{uuid.uuid4().hex[:10]}", event_id=event_id, user_id=current.id))
    e.attending = (e.attending or 0) + 1
    db.commit()
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
    e = db.get(Event, event_id)
    if e and e.attending > 0:
        e.attending -= 1
    db.delete(row)
    db.commit()
