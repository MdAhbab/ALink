import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Booking, User
from ..schemas import BookingIn, BookingOut, BookingPatch


router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=list[BookingOut])
def list_bookings(
    status: str | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Booking]:
    qry = db.query(Booking).filter(or_(Booking.owner_id == current.id, Booking.with_id == current.id))
    if status:
        qry = qry.filter(Booking.status == status)
    return qry.order_by(Booking.date.asc(), Booking.time.asc()).all()


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    body: BookingIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Booking:
    if body.with_id == current.id:
        raise HTTPException(400, "Cannot book a session with yourself")
    if not db.get(User, body.with_id):
        raise HTTPException(404, "Counterpart not found")
    b = Booking(
        id=f"bk_{uuid.uuid4().hex[:10]}",
        owner_id=current.id,
        with_id=body.with_id,
        topic=body.topic,
        date=body.date,
        time=body.time,
        duration=body.duration,
        status="pending",
        meeting_link=f"https://meet.alink.app/m-{uuid.uuid4().hex[:6]}",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
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
    for k, v in body.model_dump(exclude_unset=True).items():
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
