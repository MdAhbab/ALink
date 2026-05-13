"""Pydantic request/response schemas matching the TS types in mock.ts."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


Role = Literal["student", "alumni", "admin"]
BookingStatus = Literal["upcoming", "pending", "completed", "cancelled"]
ReferralStatus = Literal["submitted", "under_review", "forwarded", "declined"]
JobStatus = Literal["live", "pending", "flagged"]
JobType = Literal["Internship", "Full-time", "Co-op"]
EventKind = Literal["panel", "mixer", "workshop", "career_fair"]
ActivityKind = Literal["connection", "booking", "referral", "post", "verify"]
Rarity = Literal["Common", "Rare", "Epic", "Legendary"]


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------- Users ----------------------------------------------------------- #
class UserPublic(ORMBase):
    id: str
    name: str
    role: Role
    title: str = ""
    company: Optional[str] = None
    university: str = ""
    major: str = ""
    industry: Optional[str] = None
    graduation_year: Optional[int] = Field(default=None, alias="graduationYear")
    avatar: str = ""
    location: str = ""
    bio: str = ""
    verified: bool = False
    skills: list[str] = []
    open: bool = Field(default=True, alias="open_to_mentor")


class UserMe(UserPublic):
    email: EmailStr
    institution_email: Optional[EmailStr] = Field(default=None, alias="institutionEmail")
    secondary_institutions: list[str] = Field(default_factory=list, alias="secondaryInstitutions")
    linkedin: Optional[str] = None
    prefs: dict = {}


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    industry: Optional[str] = None
    graduation_year: Optional[int] = Field(default=None, alias="graduationYear")
    avatar: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    secondary_institutions: Optional[list[str]] = Field(default=None, alias="secondaryInstitutions")
    linkedin: Optional[str] = None
    open_to_mentor: Optional[bool] = Field(default=None, alias="openToMentor")
    institution_email: Optional[EmailStr] = Field(default=None, alias="institutionEmail")


class AvatarUpdate(BaseModel):
    avatar: str  # URL or data: URI


# ---------- Auth ------------------------------------------------------------ #
class RegisterIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    role: Role = "student"
    institution_email: Optional[EmailStr] = Field(default=None, alias="institutionEmail")
    university: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[int] = Field(default=None, alias="graduationYear")
    secondary_institutions: list[str] = Field(default_factory=list, alias="secondaryInstitutions")
    linkedin: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMe


# ---------- Connections ---------------------------------------------------- #
class ConnectionRequestIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    to_id: str = Field(alias="toId")
    message: str = ""


class ConnectionRequestOut(ORMBase):
    id: str
    from_user: UserPublic = Field(alias="from")
    message: str
    created_at: datetime = Field(alias="at")
    status: str


# ---------- Bookings -------------------------------------------------------- #
class BookingIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    with_id: str = Field(alias="withId")
    topic: str
    date: str
    time: str
    duration: int = 30


class BookingPatch(BaseModel):
    topic: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    status: Optional[BookingStatus] = None


class BookingOut(ORMBase):
    id: str
    with_user: UserPublic = Field(alias="with")
    topic: str
    date: str
    time: str
    duration: int
    status: BookingStatus
    meeting_link: Optional[str] = Field(default=None, alias="meetingLink")


# ---------- Referrals ------------------------------------------------------ #
class ReferralIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    company: str
    role: str
    pitch: str = ""
    resume_url: str = Field(default="", alias="resumeUrl")
    referrer_id: Optional[str] = Field(default=None, alias="referrerId")


class ReferralPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: Optional[ReferralStatus] = None
    pitch: Optional[str] = None
    resume_url: Optional[str] = Field(default=None, alias="resumeUrl")


class ReferralOut(ORMBase):
    id: str
    company: str
    role: str
    pitch: str
    resume_url: str = Field(alias="resumeUrl")
    submitted_at: str = Field(alias="submittedAt")
    status: ReferralStatus
    referrer: Optional[UserPublic] = None


# ---------- Events --------------------------------------------------------- #
class EventIn(BaseModel):
    title: str
    kind: EventKind
    date: str
    time: str
    location: str
    host: str
    cover: str
    capacity: int
    tags: list[str] = []

class EventOut(ORMBase):
    id: str
    title: str
    kind: EventKind
    date: str
    time: str
    location: str
    host: str
    cover: str
    attending: int
    capacity: int
    tags: list[str]


# ---------- Jobs ----------------------------------------------------------- #
class JobOut(ORMBase):
    id: str
    company: str
    role: str
    location: str
    type: JobType
    posted: str
    salary: str
    tags: list[str]
    posted_by: Optional[UserPublic] = Field(default=None, alias="postedBy")
    alumni_count: int = Field(alias="alumniCount")
    status: JobStatus


class JobIn(BaseModel):
    company: str
    role: str
    location: str = ""
    type: JobType = "Internship"
    salary: str = ""
    tags: list[str] = []


class JobEngagementOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    likes_count: int = Field(alias="likesCount")
    comments_count: int = Field(alias="commentsCount")
    liked_by_me: bool = Field(alias="likedByMe")


class JobCommentIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    body: str = Field(min_length=1, max_length=2000)
    parent_id: Optional[str] = Field(default=None, alias="parentId")


class JobCommentOut(ORMBase):
    id: str
    job_id: str = Field(alias="jobId")
    parent_id: Optional[str] = Field(default=None, alias="parentId")
    body: str
    author: UserPublic
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    replies: list["JobCommentOut"] = []


# ---------- Mentorship ----------------------------------------------------- #
class MentorProgramOut(ORMBase):
    id: str
    title: str
    mentor: UserPublic
    duration: str
    cadence: str
    spots: int
    filled: int
    focus: list[str]
    price: Literal["Free", "Paid"]


# ---------- Stories -------------------------------------------------------- #
class StoryIn(BaseModel):
    title: str
    cover: str
    excerpt: str
    tag: str

class StoryOut(ORMBase):
    id: str
    title: str
    author: UserPublic
    read_minutes: int = Field(alias="readMinutes")
    cover: str
    excerpt: str
    tag: str


# ---------- Achievements --------------------------------------------------- #
class AchievementOut(ORMBase):
    id: str
    title: str
    description: str
    rarity: Rarity
    emoji: str
    earned_at: Optional[str] = Field(default=None, alias="earnedAt")


# ---------- Notifications / Activity --------------------------------------- #
class NotificationOut(ORMBase):
    id: str
    title: str
    body: str
    unread: bool
    created_at: datetime = Field(alias="at")


class ActivityOut(ORMBase):
    id: str
    kind: ActivityKind
    title: str
    meta: str
    created_at: datetime = Field(alias="at")


# ---------- Chat ----------------------------------------------------------- #
class ChatMessageOut(ORMBase):
    id: str
    thread_id: str = Field(alias="threadId")
    sender_id: Optional[str] = Field(default=None, alias="senderId")
    body: str
    is_ai: bool = Field(alias="isAI")
    read: bool
    created_at: datetime = Field(alias="at")


class ChatMessageIn(BaseModel):
    body: str


class ChatThreadOut(ORMBase):
    id: str
    title: str
    is_ai: bool = Field(alias="isAI")
    is_group: bool = Field(alias="isGroup")
    pinned: bool
    members: list[UserPublic] = []
    last_message: Optional[ChatMessageOut] = Field(default=None, alias="lastMessage")
    unread_count: int = Field(default=0, alias="unreadCount")


# ---------- Verifications -------------------------------------------------- #
class VerificationOut(ORMBase):
    id: str
    name: str
    university: str
    role: Role
    submitted_at: str = Field(alias="submittedAt")
    status: Literal["pending", "approved", "rejected"]


class VerificationSubmissionIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id_card_url: str = Field(alias="idCardUrl")
    resume_url: Optional[str] = Field(default=None, alias="resumeUrl")
    notes: str = ""


class VerificationSubmissionOut(ORMBase):
    id: str
    verification_id: str = Field(alias="verificationId")
    user_id: str = Field(alias="userId")
    id_card_url: str = Field(alias="idCardUrl")
    resume_url: Optional[str] = Field(default=None, alias="resumeUrl")
    notes: str
    created_at: datetime = Field(alias="createdAt")
    verification: VerificationOut


# ---------- Uploads -------------------------------------------------------- #
class UploadOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str
    filename: str
    content_type: str = Field(alias="contentType")
    size: int


# ---------- Settings ------------------------------------------------------- #
class PrefsIn(BaseModel):
    emailDigest: Optional[bool] = None
    productUpdates: Optional[bool] = None
    bookingReminders: Optional[bool] = None
    messagePings: Optional[bool] = None
    showInDirectory: Optional[bool] = None
    openToMentorship: Optional[bool] = None
    openToReferrals: Optional[bool] = None
    reduceMotion: Optional[bool] = None
    twoFactor: Optional[bool] = None
    language: Optional[str] = None
    density: Optional[Literal["comfortable", "compact"]] = None
    accent: Optional[Literal["violet", "amber", "mint", "rose"]] = None


# ---------- Admin stats ---------------------------------------------------- #
class AdminWeeklyPoint(BaseModel):
    d: str
    signups: int
    sessions: int


class AdminStatsOut(BaseModel):
    users: int
    alumni: int
    students: int
    bookings: int
    referrals: int
    verifications: int
    weekly: list[AdminWeeklyPoint]


# ---------- Goals ---------------------------------------------------------- #
class GoalOut(ORMBase):
    id: str
    label: str
    progress: int


class GoalIn(BaseModel):
    label: str
    progress: int = 0


class GoalPatch(BaseModel):
    label: Optional[str] = None
    progress: Optional[int] = None


JobCommentOut.model_rebuild()
