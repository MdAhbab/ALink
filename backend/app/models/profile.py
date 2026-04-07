from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    roll_id = Column(String)
    university_1 = Column(String)
    university_2 = Column(String, nullable=True)
    high_school_1 = Column(String)
    high_school_2 = Column(String, nullable=True)
    major = Column(String)
    industry = Column(String, nullable=True)
    company = Column(String, nullable=True)
    grad_year = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)

    user = relationship("User", back_populates="profile")
