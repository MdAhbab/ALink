from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Activity, Booking, Job, Referral, User, Verification
from ..schemas import AdminStatsOut, AdminWeeklyPoint, JobOut, UserPublic


router = APIRouter(prefix="/admin", tags=["admin"])
PROCESS_STARTED_AT = datetime.now(timezone.utc)


def _to_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.get("/stats", response_model=AdminStatsOut)
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminStatsOut:
    now = datetime.now(timezone.utc)
    users = db.query(User).count()
    alumni = db.query(User).filter(User.role == "alumni").count()
    students = db.query(User).filter(User.role == "student").count()
    bookings = db.query(Booking).count()
    referrals = db.query(Referral).count()
    verifications = db.query(Verification).filter(Verification.status == "pending").count()
    flagged_jobs = db.query(Job).filter(Job.status == "flagged").count()

    start_of_today = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    new_today = db.query(User).filter(User.created_at >= start_of_today).count()

    active_threshold = now - timedelta(hours=1)
    active_now = (
        db.query(Activity.user_id)
        .filter(Activity.created_at >= active_threshold)
        .distinct()
        .count()
    )

    week_start = now.date() - timedelta(days=6)
    week_start_dt = datetime.combine(week_start, time.min, tzinfo=timezone.utc)
    day_labels = [week_start + timedelta(days=i) for i in range(7)]
    signups_by_day = {day: 0 for day in day_labels}
    sessions_by_day = {day: 0 for day in day_labels}

    signup_rows = db.query(User.created_at).filter(User.created_at >= week_start_dt).all()
    booking_rows = db.query(Booking.created_at).filter(Booking.created_at >= week_start_dt).all()

    for (created_at,) in signup_rows:
        day = _to_utc(created_at).date()
        if day in signups_by_day:
            signups_by_day[day] += 1
    for (created_at,) in booking_rows:
        day = _to_utc(created_at).date()
        if day in sessions_by_day:
            sessions_by_day[day] += 1

    weekly = [
        AdminWeeklyPoint(
            d=day.strftime("%a"),
            signups=signups_by_day[day],
            sessions=sessions_by_day[day],
        )
        for day in day_labels
    ]

    return AdminStatsOut(
        users=users, alumni=alumni, students=students,
        bookings=bookings, referrals=referrals, verifications=verifications,
        uptime_seconds=max(1, int((now - PROCESS_STARTED_AT).total_seconds())),
        active_now=active_now,
        flagged_jobs=flagged_jobs,
        new_today=new_today,
        weekly=weekly,
    )


@router.get("/users", response_model=list[UserPublic])
def list_all_users(
    role: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[User]:
    qry = db.query(User)
    if role:
        qry = qry.filter(User.role == role)
    return qry.order_by(User.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/jobs", response_model=list[JobOut])
def list_all_jobs(
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Job]:
    qry = db.query(Job)
    if status:
        qry = qry.filter(Job.status == status)
    return qry.order_by(Job.posted.desc()).offset(offset).limit(limit).all()


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> None:
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    u = db.get(User, user_id)
    if u:
        db.delete(u)
        db.commit()
