import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import Booking, User
from ..schemas import BookingIn, BookingOut, BookingPatch


router = APIRouter(prefix="/bookings", tags=["bookings"])


ACTIVE_BOOKING_STATUSES = ("pending", "upcoming")


def normalize_starts_at(
    date_value: str,
    time_value: str,
    starts_at: datetime | None,
    tz_name: str | None = None,
) -> datetime:
    """Resolve a booking start to an aware UTC datetime.

    Accepts either an explicit ``startsAt`` or a ``date``+``time`` pair. When no
    timezone is available, the wall-clock time is interpreted in ``tz_name``
    (the client's IANA zone) and falls back to UTC — never a hard 400.
    """
    if starts_at is None:
        try:
            starts_at = datetime.fromisoformat(f"{date_value}T{time_value}")
        except ValueError:
            raise HTTPException(400, "Invalid booking date or time")
    if starts_at.tzinfo is None or starts_at.tzinfo.utcoffset(starts_at) is None:
        tz: timezone | ZoneInfo = timezone.utc
        if tz_name:
            try:
                tz = ZoneInfo(tz_name)
            except Exception:
                tz = timezone.utc
        starts_at = starts_at.replace(tzinfo=tz)
    return starts_at.astimezone(timezone.utc).replace(microsecond=0)


def utc_date_time(starts_at_utc: datetime) -> tuple[str, str]:
    return starts_at_utc.date().isoformat(), starts_at_utc.strftime("%H:%M")


def booking_start(row: Booking) -> datetime:
    raw = row.starts_at_utc
    if raw:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return datetime.fromisoformat(f"{row.date}T{row.time}").replace(tzinfo=timezone.utc)


def ensure_no_overlap(
    db: Session,
    mentor_id: str,
    starts_at_utc: datetime,
    duration: int,
    exclude_id: str | None = None,
) -> None:
    requested_start = starts_at_utc
    requested_end = requested_start.timestamp() + duration * 60
    qry = db.query(Booking).filter(
        Booking.with_id == mentor_id,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
    )
    if exclude_id:
        qry = qry.filter(Booking.id != exclude_id)
    for existing in qry.all():
        existing_start = booking_start(existing)
        existing_end = existing_start.timestamp() + existing.duration * 60
        if requested_start.timestamp() < existing_end and requested_end > existing_start.timestamp():
            raise HTTPException(409, "Mentor is already booked for that time")


@router.get("", response_model=list[BookingOut])
def list_bookings(
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Booking]:
    qry = db.query(Booking).filter(or_(Booking.owner_id == current.id, Booking.with_id == current.id))
    if status:
        qry = qry.filter(Booking.status == status)
    return qry.order_by(Booking.date.asc(), Booking.time.asc()).offset(offset).limit(limit).all()


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    body: BookingIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Booking:
    if body.with_id == current.id:
        raise HTTPException(400, "Cannot book a session with yourself")
    counterpart = db.get(User, body.with_id)
    if not counterpart:
        raise HTTPException(404, "Counterpart not found")
    starts_at_utc = normalize_starts_at(body.date, body.time, body.starts_at, body.timezone)
    ensure_no_overlap(db, body.with_id, starts_at_utc, body.duration)
    utc_date, utc_time = utc_date_time(starts_at_utc)
    b = Booking(
        id=f"bk_{uuid.uuid4().hex[:10]}",
        owner_id=current.id,
        with_id=body.with_id,
        topic=body.topic,
        date=utc_date,
        time=utc_time,
        starts_at_utc=starts_at_utc.isoformat().replace("+00:00", "Z"),
        timezone=body.timezone,
        duration=body.duration,
        status="pending",
        meeting_link=f"https://meet.alink.app/m-{uuid.uuid4().hex[:6]}",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    publish(EventType.BOOKING_CREATED, {
        "owner_id": b.owner_id,
        "owner_name": current.name,
        "with_id": b.with_id,
        "with_name": counterpart.name,
        "topic": b.topic,
        "date": b.date,
        "time": b.time,
    })
    return b


@router.patch("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: str,
    body: BookingPatch,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Booking:
    b = db.get(Booking, booking_id)
    if not b or current.id not in (b.owner_id, b.with_id):
        raise HTTPException(404, "Booking not found")
    data = body.model_dump(exclude_unset=True, by_alias=False)
    date_value = data.get("date", b.date)
    time_value = data.get("time", b.time)
    duration = data.get("duration", b.duration)
    starts_at_value = data.get("starts_at")
    if "starts_at" in data or "date" in data or "time" in data or "duration" in data:
        starts_at_utc = normalize_starts_at(date_value, time_value, starts_at_value, data.get("timezone", b.timezone))
        ensure_no_overlap(db, b.with_id, starts_at_utc, duration, exclude_id=b.id)
        utc_date, utc_time = utc_date_time(starts_at_utc)
        data["date"] = utc_date
        data["time"] = utc_time
        data["starts_at_utc"] = starts_at_utc.isoformat().replace("+00:00", "Z")
        data.pop("starts_at", None)
    for k, v in data.items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    b = db.get(Booking, booking_id)
    if not b or current.id not in (b.owner_id, b.with_id):
        raise HTTPException(404, "Booking not found")
    b.status = "cancelled"
    db.commit()
    notify_id = b.with_id if current.id == b.owner_id else b.owner_id
    publish(EventType.BOOKING_CANCELLED, {
        "owner_id": b.owner_id,
        "with_id": b.with_id,
        "topic": b.topic,
        "notify_id": notify_id,
        "cancelled_by": current.id,
    })
