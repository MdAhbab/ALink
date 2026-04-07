from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services import auth_service
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.activity import Connection, ConsultationBooking, ReferralRequest, ReferralRecipient, JobPost
from app.schemas.user_schema import (
    ProfileOut, ProfileUpdate, ConnectionOut, BookingOut, BookingUpdate,
    ReferralOut, JobPostCreate, JobPostOut, UserOut, AlumniSchedule
)

router = APIRouter()


def require_alumni(current_user: User = Depends(auth_service.get_current_user)) -> User:
    if current_user.role != UserRole.ALUMNI:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only alumni can access this resource"
        )
    return current_user


@router.get("/profile", response_model=ProfileOut)
async def get_my_profile(current_user: User = Depends(require_alumni)):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return current_user.profile


@router.put("/profile", response_model=ProfileOut)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/connections", response_model=List[ConnectionOut])
async def get_my_connections(
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    connections = db.query(Connection).filter(
        ((Connection.requester_id == current_user.id) | (Connection.receiver_id == current_user.id)) &
        (Connection.status == "accepted")
    ).all()
    return connections


@router.get("/connections/requests", response_model=List[ConnectionOut])
async def get_connection_requests(
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    requests = db.query(Connection).filter(
        Connection.receiver_id == current_user.id,
        Connection.status == "pending"
    ).all()
    return requests


@router.put("/connections/{connection_id}")
async def respond_connection_request(
    connection_id: int,
    accept: bool,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    connection = db.query(Connection).filter(
        Connection.id == connection_id,
        Connection.receiver_id == current_user.id
    ).first()

    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found")

    if accept:
        connection.status = "accepted"
    else:
        db.delete(connection)

    db.commit()
    return {"message": "Connection request processed"}


@router.get("/finder", response_model=List[UserOut])
async def finder_search(
    role: str = None,
    major: str = None,
    university: str = None,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    query = db.query(User)

    if role and role.lower() in ["student", "alumni"]:
        query = query.filter(User.role == UserRole[role.upper()])

    if major or university:
        query = query.join(Profile)
        if major:
            query = query.filter(Profile.major.ilike(f"%{major}%"))
        if university:
            query = query.filter(
                (Profile.university_1.ilike(f"%{university}%")) |
                (Profile.university_2.ilike(f"%{university}%"))
            )

    return query.all()


@router.get("/bookings", response_model=List[BookingOut])
async def get_my_consultation_requests(
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    bookings = db.query(ConsultationBooking).filter(
        ConsultationBooking.alumni_id == current_user.id
    ).all()
    return bookings


@router.put("/bookings/{booking_id}")
async def respond_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    booking = db.query(ConsultationBooking).filter(
        ConsultationBooking.id == booking_id,
        ConsultationBooking.alumni_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking_update.status not in ["accepted", "declined", "rescheduled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    booking.status = booking_update.status
    if booking_update.meeting_link:
        booking.meeting_link = booking_update.meeting_link

    db.commit()
    return {"message": "Booking updated successfully"}


@router.get("/referrals", response_model=List[ReferralOut])
async def get_referral_requests(
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    recipients = db.query(ReferralRecipient).filter(
        ReferralRecipient.alumni_id == current_user.id
    ).all()

    referral_ids = [r.request_id for r in recipients]
    referrals = db.query(ReferralRequest).filter(ReferralRequest.id.in_(referral_ids)).all()
    return referrals


@router.put("/referrals/{referral_id}")
async def respond_referral(
    referral_id: int,
    status: str,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    recipient = db.query(ReferralRecipient).filter(
        ReferralRecipient.request_id == referral_id,
        ReferralRecipient.alumni_id == current_user.id
    ).first()

    if not recipient:
        raise HTTPException(status_code=404, detail="Referral not found")

    if status not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    recipient.status = status
    db.commit()
    return {"message": "Referral response recorded"}


@router.post("/jobs", response_model=JobPostOut)
async def create_job_post(
    job: JobPostCreate,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    new_job = JobPost(
        author_id=current_user.id,
        content=job.content,
        image_url=job.image_url,
        link=job.link
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


@router.get("/jobs", response_model=List[JobPostOut])
async def get_my_job_posts(
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    jobs = db.query(JobPost).filter(JobPost.author_id == current_user.id).all()
    return jobs


@router.delete("/jobs/{job_id}")
async def delete_job_post(
    job_id: int,
    current_user: User = Depends(require_alumni),
    db: Session = Depends(get_db)
):
    job = db.query(JobPost).filter(
        JobPost.id == job_id,
        JobPost.author_id == current_user.id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job post not found")

    db.delete(job)
    db.commit()
    return {"message": "Job post deleted"}
