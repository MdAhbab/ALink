from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(enum.Enum):
    STUDENT = "student"
    ALUMNI = "alumni"
    ADMIN = "admin"

class VerificationStatus(enum.Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    DECLINED = "declined"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    is_verified = Column(Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED)

    profile = relationship("Profile", back_populates="user", uselist=False)
    verification = relationship("VerificationRequest", back_populates="user", uselist=False)

class VerificationRequest(Base):
    __tablename__ = "verification_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    id_card_url = Column(String)
    admin_feedback = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="verification")
