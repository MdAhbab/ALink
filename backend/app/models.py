"""SQLAlchemy ORM models — one row per type defined in src/app/lib/mock.ts."""
from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Users ----------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    institution_email: Mapped[str | None] = mapped_column(String, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)

    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="student")  # student|alumni|admin
    title: Mapped[str] = mapped_column(String, default="")
    company: Mapped[str | None] = mapped_column(String)
    university: Mapped[str] = mapped_column(String, default="")
    major: Mapped[str] = mapped_column(String, default="")
    industry: Mapped[str | None] = mapped_column(String)
    graduation_year: Mapped[int | None] = mapped_column(Integer)
    avatar: Mapped[str] = mapped_column(String, default="")
    location: Mapped[str] = mapped_column(String, default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    open_to_mentor: Mapped[bool] = mapped_column(Boolean, default=True)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    secondary_institutions: Mapped[list[str]] = mapped_column(JSON, default=list)
    linkedin: Mapped[str | None] = mapped_column(String)

    prefs: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


# ---------- Connections ----------------------------------------------------- #
class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("a_id", "b_id", name="uq_conn_pair"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    a_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    b_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ConnectionRequest(Base):
    __tablename__ = "connection_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    from_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    to_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|accepted|declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    from_user: Mapped[User] = relationship(foreign_keys=[from_id])
    to_user: Mapped[User] = relationship(foreign_keys=[to_id])


# ---------- Bookings -------------------------------------------------------- #
class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    with_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    topic: Mapped[str] = mapped_column(String, default="")
    date: Mapped[str] = mapped_column(String)        # ISO date YYYY-MM-DD
    time: Mapped[str] = mapped_column(String)        # HH:MM
    starts_at_utc: Mapped[str | None] = mapped_column(String, index=True)
    timezone: Mapped[str | None] = mapped_column(String)
    duration: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[str] = mapped_column(String, default="pending")  # upcoming|pending|completed|cancelled
    meeting_link: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    with_user: Mapped[User] = relationship(foreign_keys=[with_id])


# ---------- Referrals ------------------------------------------------------- #
class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    referrer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    company: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    pitch: Mapped[str] = mapped_column(Text, default="")
    resume_url: Mapped[str] = mapped_column(String, default="")
    submitted_at: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="submitted")
    # submitted | under_review | forwarded | declined

    referrer: Mapped[User | None] = relationship(foreign_keys=[referrer_id])
    owner: Mapped[User] = relationship(foreign_keys=[owner_id])


# ---------- Events ---------------------------------------------------------- #
class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)  # panel|mixer|workshop|career_fair
    date: Mapped[str] = mapped_column(String)
    time: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String, default="")
    host: Mapped[str] = mapped_column(String, default="")
    cover: Mapped[str] = mapped_column(String, default="#7C5CFF")
    attending: Mapped[int] = mapped_column(Integer, default=0)
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)


class EventRSVP(Base):
    __tablename__ = "event_rsvps"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_rsvp"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ---------- Jobs ------------------------------------------------------------ #
class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    company: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String, default="")
    type: Mapped[str] = mapped_column(String, default="Internship")  # Internship|Full-time|Co-op
    posted: Mapped[str] = mapped_column(String, default="")
    salary: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    posted_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    alumni_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="live")  # live|pending|flagged

    posted_by: Mapped[User | None] = relationship(foreign_keys=[posted_by_id])


class JobLike(Base):
    __tablename__ = "job_likes"
    __table_args__ = (UniqueConstraint("job_id", "user_id", name="uq_job_like"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class JobComment(Base):
    __tablename__ = "job_comments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("job_comments.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    author: Mapped[User] = relationship(foreign_keys=[user_id])
    parent: Mapped["JobComment | None"] = relationship(
        "JobComment",
        remote_side="JobComment.id",
        back_populates="replies",
    )
    replies: Mapped[list["JobComment"]] = relationship(
        "JobComment",
        back_populates="parent",
        cascade="all, delete-orphan",
    )


# ---------- Mentorship ------------------------------------------------------ #
class MentorProgram(Base):
    __tablename__ = "mentor_programs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    mentor_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    duration: Mapped[str] = mapped_column(String, default="")
    cadence: Mapped[str] = mapped_column(String, default="")
    spots: Mapped[int] = mapped_column(Integer, default=0)
    filled: Mapped[int] = mapped_column(Integer, default=0)
    focus: Mapped[list[str]] = mapped_column(JSON, default=list)
    price: Mapped[str] = mapped_column(String, default="Free")  # Free|Paid

    mentor: Mapped[User] = relationship(foreign_keys=[mentor_id])


# ---------- Stories --------------------------------------------------------- #
class Story(Base):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    read_minutes: Mapped[int] = mapped_column(Integer, default=4)
    cover: Mapped[str] = mapped_column(String, default="#7C5CFF")
    excerpt: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text, default="")
    tag: Mapped[str] = mapped_column(String, default="")

    author: Mapped[User] = relationship(foreign_keys=[author_id])


# ---------- Achievements ---------------------------------------------------- #
class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    rarity: Mapped[str] = mapped_column(String, default="Common")
    emoji: Mapped[str] = mapped_column(String, default="🏅")


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_user_ach"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    achievement_id: Mapped[str] = mapped_column(ForeignKey("achievements.id", ondelete="CASCADE"))
    earned_at: Mapped[str | None] = mapped_column(String)


# ---------- Notifications & Activity --------------------------------------- #
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, default="")
    unread: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Activity(Base):
    __tablename__ = "activity"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String)  # connection|booking|referral|post|verify
    title: Mapped[str] = mapped_column(String)
    meta: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ---------- Chat ------------------------------------------------------------ #
class ChatThread(Base):
    __tablename__ = "chat_threads"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, default="")
    is_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    is_group: Mapped[bool] = mapped_column(Boolean, default=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ChatMember(Base):
    __tablename__ = "chat_members"
    __table_args__ = (UniqueConstraint("thread_id", "user_id", name="uq_chat_member"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("chat_threads.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("chat_threads.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    is_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ---------- Verifications -------------------------------------------------- #
class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    university: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String, default="student")
    submitted_at: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|approved|rejected


class VerificationSubmission(Base):
    __tablename__ = "verification_submissions"
    __table_args__ = (UniqueConstraint("verification_id", name="uq_verification_submission"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    verification_id: Mapped[str] = mapped_column(ForeignKey("verifications.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    id_card_url: Mapped[str] = mapped_column(String)
    resume_url: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    verification: Mapped[Verification] = relationship(foreign_keys=[verification_id])


# ---------- Goals (student) ------------------------------------------------ #
class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String)
    progress: Mapped[int] = mapped_column(Integer, default=0)
