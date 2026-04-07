from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services import auth_service
from app.models.user import User, UserRole, VerificationStatus, VerificationRequest
from app.models.activity import Connection, ConsultationBooking, ReferralRequest, ReferralRecipient, JobPost
from app.schemas.user_schema import UserOut, VerificationRequestOut

router = APIRouter()


def require_admin(current_user: User = Depends(auth_service.get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_alumni = db.query(User).filter(User.role == UserRole.ALUMNI).count()
    pending_verifications = db.query(VerificationRequest).join(User).filter(
        User.is_verified == VerificationStatus.PENDING
    ).count()
    pending_bookings = db.query(ConsultationBooking).filter(
        ConsultationBooking.status == "requested"
    ).count()
    pending_connections = db.query(Connection).filter(
        Connection.status == "pending"
    ).count()
    pending_referrals = db.query(ReferralRecipient).filter(
        ReferralRecipient.status == "pending"
    ).count()
    total_jobs = db.query(JobPost).count()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_alumni": total_alumni,
        "pending_verifications": pending_verifications,
        "pending_bookings": pending_bookings,
        "pending_connections": pending_connections,
        "pending_referrals": pending_referrals,
        "total_jobs": total_jobs
    }


@router.get("/users", response_model=List[UserOut])
async def get_all_users(
    role: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role and role.lower() in ["student", "alumni", "admin"]:
        query = query.filter(User.role == UserRole[role.upper()])
    return query.all()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.get("/verifications", response_model=List[VerificationRequestOut])
async def get_pending_verifications(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    verifications = db.query(VerificationRequest).join(User).filter(
        User.is_verified == VerificationStatus.PENDING
    ).all()
    return verifications


@router.put("/verifications/{request_id}")
async def process_verification(
    request_id: int,
    approve: bool,
    feedback: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    verification = db.query(VerificationRequest).filter(
        VerificationRequest.id == request_id
    ).first()

    if not verification:
        raise HTTPException(status_code=404, detail="Verification request not found")

    user = db.query(User).filter(User.id == verification.user_id).first()

    if approve:
        user.is_verified = VerificationStatus.VERIFIED
    else:
        user.is_verified = VerificationStatus.DECLINED
        verification.admin_feedback = feedback

    db.commit()
    return {"message": "Verification processed successfully"}


@router.get("/bookings")
async def get_all_bookings(
    status: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(ConsultationBooking)
    if status:
        query = query.filter(ConsultationBooking.status == status)
    return query.all()


@router.get("/referrals")
async def get_all_referrals(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    referrals = db.query(ReferralRequest).all()
    return referrals


@router.get("/referrals/{referral_id}")
async def get_referral_detail(
    referral_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    referral = db.query(ReferralRequest).filter(ReferralRequest.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    recipients = db.query(ReferralRecipient).filter(
        ReferralRecipient.request_id == referral_id
    ).all()

    return {
        "referral": referral,
        "recipients": recipients
    }


@router.get("/connections")
async def get_all_connections(
    status: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Connection)
    if status:
        query = query.filter(Connection.status == status)
    return query.all()


@router.get("/jobs")
async def get_all_job_posts(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    jobs = db.query(JobPost).order_by(JobPost.created_at.desc()).all()
    return jobs


@router.delete("/jobs/{job_id}")
async def delete_job_post(
    job_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job post not found")

    db.delete(job)
    db.commit()
    return {"message": "Job post deleted"}
