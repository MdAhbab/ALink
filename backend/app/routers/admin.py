from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Booking, Job, Referral, User, Verification
from ..schemas import AdminStatsOut, AdminWeeklyPoint, JobOut, UserPublic


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsOut)
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminStatsOut:
    users = db.query(User).count()
    alumni = db.query(User).filter(User.role == "alumni").count()
    students = db.query(User).filter(User.role == "student").count()
    bookings = db.query(Booking).count()
    referrals = db.query(Referral).count()
    verifications = db.query(Verification).filter(Verification.status == "pending").count()

    # Mock weekly snapshot — the frontend chart expects 7 points.
    weekly_raw = [
        ("Mon", 84, 41), ("Tue", 102, 55), ("Wed", 96, 62), ("Thu", 130, 71),
        ("Fri", 121, 80), ("Sat", 70, 24), ("Sun", 62, 18),
    ]
    weekly = [AdminWeeklyPoint(d=d, signups=s, sessions=ss) for d, s, ss in weekly_raw]

    return AdminStatsOut(
        users=users, alumni=alumni, students=students,
        bookings=bookings, referrals=referrals, verifications=verifications,
        weekly=weekly,
    )


@router.get("/users", response_model=list[UserPublic])
def list_all_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[User]:
    qry = db.query(User)
    if role:
        qry = qry.filter(User.role == role)
    return qry.order_by(User.created_at.desc()).all()


@router.get("/jobs", response_model=list[JobOut])
def list_all_jobs(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Job]:
    return db.query(Job).order_by(Job.posted.desc()).all()


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)) -> None:
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    u = db.get(User, user_id)
    if u:
        db.delete(u)
        db.commit()
