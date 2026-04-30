from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services import auth_service
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.activity import Connection, ConsultationBooking, ReferralRequest, ReferralRecipient, JobPost
from app.schemas.user_schema import (
    ProfileOut, ProfileUpdate, ConnectionCreate, ConnectionOut,
    BookingCreate, BookingOut, ReferralCreate, ReferralOut, JobPostOut, UserOut, AlumniDirectoryOut
)

router = APIRouter()


@router.get("/profile", response_model=ProfileOut)
async def get_my_profile(current_user: User = Depends(auth_service.get_current_user)):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return current_user.profile


@router.put("/profile", response_model=ProfileOut)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(auth_service.get_current_user),
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


@router.get("/alumni", response_model=List[AlumniDirectoryOut])
async def get_alumni_directory(
    major: str = None,
    industry: str = None,
    grad_year: int = None,
    company: str = None,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == UserRole.ALUMNI)

    if major or industry or grad_year or company:
        query = query.join(Profile)
        if major:
            query = query.filter(Profile.major.ilike(f"%{major}%"))
        if industry:
            query = query.filter(Profile.industry.ilike(f"%{industry}%"))
        if grad_year:
            query = query.filter(Profile.grad_year == grad_year)
        if company:
            query = query.filter(Profile.company.ilike(f"%{company}%"))

    alumni_users = query.all()

    result = []
    for user in alumni_users:
        profile = user.profile
        result.append(
            {
                "id": user.id,
                "name": profile.name if profile and profile.name else user.email,
                "university": profile.university_1 if profile else None,
                "company": profile.company if profile else None,
                "industry": profile.industry if profile else None,
                "major": profile.major if profile else None,
                "grad_year": profile.grad_year if profile else None,
            }
        )

    return result


@router.post("/connections", response_model=ConnectionOut)
async def send_connection_request(
    connection: ConnectionCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.id == connection.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Connection).filter(
        ((Connection.requester_id == current_user.id) & (Connection.receiver_id == connection.receiver_id)) |
        ((Connection.requester_id == connection.receiver_id) & (Connection.receiver_id == current_user.id))
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Connection already exists or pending")

    new_connection = Connection(
        requester_id=current_user.id,
        receiver_id=connection.receiver_id,
        status="pending"
    )
    db.add(new_connection)
    db.commit()
    db.refresh(new_connection)
    return new_connection


@router.get("/connections", response_model=List[ConnectionOut])
async def get_my_connections(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    connections = db.query(Connection).filter(
        ((Connection.requester_id == current_user.id) | (Connection.receiver_id == current_user.id)) &
        (Connection.status == "accepted")
    ).all()
    return connections


@router.get("/connections/requests", response_model=List[ConnectionOut])
async def get_connection_requests(
    current_user: User = Depends(auth_service.get_current_user),
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
    current_user: User = Depends(auth_service.get_current_user),
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


@router.post("/bookings", response_model=BookingOut)
async def request_consultation(
    booking: BookingCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    alumni = db.query(User).filter(User.id == booking.alumni_id, User.role == UserRole.ALUMNI).first()
    if not alumni:
        raise HTTPException(status_code=404, detail="Alumni not found")

    connection = db.query(Connection).filter(
        ((Connection.requester_id == current_user.id) & (Connection.receiver_id == booking.alumni_id)) |
        ((Connection.requester_id == booking.alumni_id) & (Connection.receiver_id == current_user.id)),
        Connection.status == "accepted"
    ).first()

    if not connection:
        raise HTTPException(status_code=400, detail="You must be connected with this alumni to book a consultation")

    from datetime import datetime
    new_booking = ConsultationBooking(
        student_id=current_user.id,
        alumni_id=booking.alumni_id,
        scheduled_time=datetime.fromisoformat(booking.scheduled_time),
        meeting_link=booking.meeting_link,
        status="requested"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


@router.get("/bookings", response_model=List[BookingOut])
async def get_my_bookings(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(ConsultationBooking).filter(
        ConsultationBooking.student_id == current_user.id
    ).all()
    return bookings


@router.post("/referrals", response_model=ReferralOut)
async def submit_referral(
    referral: ReferralCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    if len(referral.pitch.split()) > 200:
        raise HTTPException(status_code=400, detail="Pitch must be 200 words or less")

    new_referral = ReferralRequest(
        student_id=current_user.id,
        pitch=referral.pitch,
        resume_link=referral.resume_link
    )
    db.add(new_referral)
    db.commit()
    db.refresh(new_referral)

    for alumni_id in referral.alumni_ids:
        alumni = db.query(User).filter(User.id == alumni_id, User.role == UserRole.ALUMNI).first()
        if alumni:
            recipient = ReferralRecipient(
                request_id=new_referral.id,
                alumni_id=alumni_id,
                status="pending"
            )
            db.add(recipient)

    db.commit()
    return new_referral


@router.get("/referrals", response_model=List[ReferralOut])
async def get_my_referrals(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    referrals = db.query(ReferralRequest).filter(
        ReferralRequest.student_id == current_user.id
    ).all()
    return referrals


@router.get("/jobs", response_model=List[JobPostOut])
async def get_job_posts(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db)
):
    jobs = db.query(JobPost).order_by(JobPost.created_at.desc()).all()
    return jobs
