from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from datetime import datetime
from app.database import Base

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True)
    requester_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending") # pending, accepted

class ConsultationBooking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    alumni_id = Column(Integer, ForeignKey("users.id"))
    scheduled_time = Column(DateTime)
    meeting_link = Column(String, nullable=True)
    status = Column(String, default="requested") # requested, accepted, declined, rescheduled

class ReferralRequest(Base):
    __tablename__ = "referral_requests"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    pitch = Column(String(200)) # 200 word limit constraint
    resume_link = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReferralRecipient(Base):
    __tablename__ = "referral_recipients"
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("referral_requests.id"))
    alumni_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")

class JobPost(Base):
    __tablename__ = "job_posts"
    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    image_url = Column(String, nullable=True)
    content = Column(Text)
    link = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
