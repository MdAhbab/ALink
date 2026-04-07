from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import UserRole, VerificationStatus


class ProfileBase(BaseModel):
    name: Optional[str] = None
    roll_id: Optional[str] = None
    university_1: str
    university_2: Optional[str] = None
    high_school_1: str
    high_school_2: Optional[str] = None
    major: Optional[str] = None
    industry: Optional[str] = None
    company: Optional[str] = None
    grad_year: Optional[int] = None
    bio: Optional[str] = None


class ProfileOut(BaseModel):
    id: int
    user_id: int
    name: Optional[str] = None
    roll_id: Optional[str] = None
    university_1: Optional[str] = None
    university_2: Optional[str] = None
    high_school_1: Optional[str] = None
    high_school_2: Optional[str] = None
    major: Optional[str] = None
    industry: Optional[str] = None
    company: Optional[str] = None
    grad_year: Optional[int] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    roll_id: Optional[str] = None
    university_1: Optional[str] = None
    university_2: Optional[str] = None
    high_school_1: Optional[str] = None
    high_school_2: Optional[str] = None
    major: Optional[str] = None
    industry: Optional[str] = None
    company: Optional[str] = None
    grad_year: Optional[int] = None
    bio: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    profile: ProfileBase


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_verified: VerificationStatus

    class Config:
        from_attributes = True


class AlumniDirectoryOut(BaseModel):
    id: int
    name: Optional[str] = None
    university: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ConnectionCreate(BaseModel):
    receiver_id: int


class ConnectionOut(BaseModel):
    id: int
    requester_id: int
    receiver_id: int
    status: str

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    alumni_id: int
    scheduled_time: str
    meeting_link: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    student_id: int
    alumni_id: int
    scheduled_time: str
    meeting_link: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class BookingUpdate(BaseModel):
    status: str
    meeting_link: Optional[str] = None


class ReferralCreate(BaseModel):
    pitch: str
    resume_link: str
    alumni_ids: list[int]


class ReferralOut(BaseModel):
    id: int
    student_id: int
    pitch: str
    resume_link: str
    created_at: str

    class Config:
        from_attributes = True


class JobPostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    link: Optional[str] = None


class JobPostOut(BaseModel):
    id: int
    author_id: int
    content: str
    image_url: Optional[str] = None
    link: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class VerificationRequestCreate(BaseModel):
    id_card_url: str


class VerificationRequestOut(BaseModel):
    id: int
    user_id: int
    id_card_url: str
    admin_feedback: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True


class AlumniSchedule(BaseModel):
    is_active: bool = True
    available_hours: Optional[str] = None
