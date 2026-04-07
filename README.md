# Product Requirement Document: ALink

**Project Title:** ALink – Alumni-Student Connection Platform  
**Target Users:** Students, Alumni, and System Administrators

---

## 1. Technical Architecture & Design

### 1.1 Technology Stack

- **Frontend (Client):** HTML5, CSS3, Vanilla JavaScript.
- **Backend (Server):** FastAPI (Python), implementing a RESTful API.
- **Database:** SQLite3.
- **Architecture:** MVC (Model-View-Controller) pattern, designed as a single microservice with a recognisable directory structure.

### 1.2 UI/UX Design Specifications

- **Design Philosophy:** Minimalist, low memory load for the user.
- **Fonts:** Inter, Roboto.
- **Colour Palette:** Deep Navy Blue, Crisp White, Gold, Teal, and Slate Grey.
- **System Reliability:** The platform must be reliable and synchronous in its operations.

---

## 2. Core Functional Requirements

### 2.1 Homepage & Onboarding

- **Layout:** The landing page features a single background image, a footer, and a transparent header containing the logo, name, and a one-line description.
- **Split View:** 2/3rds of the page is dedicated to Service, About, and Contact info; 1/3rd contains the Login/Signup forms.
- **Registration:** During signup, users can add up to two Universities and two High Schools/Colleges to establish their alumni status.

### 2.2 User Profiles & Graduation Logic

- **Profiles:** Both students and alumni can edit profiles (Name, Roll/ID, University, School/College, and other relevant educational info).
- **Automatic Transition:** When a student updates their graduation status, they are automatically reclassified as Alumni for that institution. This transition unlocks the "Finder" tool in their Connections page.

### 2.3 Verification System

- **Process:** Unverified users must submit ID cards via a Verification page in Settings. The system generates an automatic application timestamp.
- **Admin Review:** Admins approve or decline requests with feedback. Declined users can resubmit with additional text. Verified users no longer see this page.

### 2.4 Networking & Connections

- **Connection Rule:** Students must establish a connection with an Alumnus before they can request referrals or consultations. Connections can be initiated by either party.
- **Alumni Directory:** A searchable, filterable, and sortable list of all alumni from the student's university. Filters include Field/Major, Industry, Graduation Year, and Company.
- **Connections Page:** \* **Students:** Sections for "Connected" and "Requests."
  - **Alumni:** Sections for "Connected," "Requests," and "Finder" (to locate other students or alumni).

---

## 3. Mentorship & Professional Services

### 3.1 Mentorship & Consultations

- **Booking:** Students can request mentor consultations via the Alumni row in the directory/connections page.
- **Management:** Alumni can accept, decline, or reschedule requests. Meeting links are included directly in the booking form.
- **Availability:** Alumni set their "active state" and free hours via a scheduler in Settings for students to see during booking.
- **Calendar:** A dynamic calendar for Alumni to manage consultations, referrals, and events. Updates are synced across both Student and Alumni views.

### 3.2 Job Referrals

- **Referral Form:** Includes a mandatory 200-word pitch (written in English) and a resume upload feature.
- **Supported Formats:** .jpg, .jpeg, .png, .rtf, .txt, .pdf, .docx.
- **Multi-Send:** Students have the option to send a single referral request to multiple Alumni simultaneously.

### 3.3 Community & Job Postings

- **Eligibility:** Alumni who are currently job holders or pursuing Masters/PhD/Postdoc roles can create job postings.
- **Content:** Posts can include images, text, and links.
- **Engagement:** All users can view, like, comment, reply, and visit external links from these posts.

---

## 4. Administrative Controls

### 4.1 Admin Dashboard

- **Access:** Secure login via pre-set admin credentials.
- **Overview:** Real-time stats on pending bookings, connection requests, upcoming sessions, and referral requests.
- **User Management:** Ability to delete users and manage the verification queue.

### 4.2 System Monitoring

- **Logs:** Access to all system logs, including login status, active sessions, actions, and request histories.
- **Referral Review:** Admins can preview student pitches and attached documents in the referral section.

---

## 5. Database Schema (SQLAlchemy Models)

This schema covers all 22 points from your notes, including the multi-alumni referral logic and the verification system.

```python
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

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
    meeting_link = Column(String)
    status = Column(String, default="requested") # requested, accepted, declined, rescheduled

class ReferralRequest(Base):
    __tablename__ = "referral_requests"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    pitch = Column(String(200)) # 200 word limit constraint
    resume_link = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReferralRecipient(Base):
    """Handles sending one referral to multiple alumni"""
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

class VerificationRequest(Base):
    __tablename__ = "verification_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    id_card_url = Column(String)
    admin_feedback = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="verification")
```

[Image of Entity Relationship Diagram for a social networking database]

---

## 6. Directory Architecture (MVC Pattern)

In FastAPI, the "Controller" logic is typically handled by **Routers**, while the "Model" is handled by **SQLAlchemy**. To keep the frontend (Vanilla JS) organised, we’ll separate the static assets into a dedicated folder.

```
ALink/
├── backend/                # FastAPI (Server-side)
│   ├── app/
│   │   ├── controllers/    # API Routers (Handles requests)
│   │   │   ├── auth.py
│   │   │   ├── student.py
│   │   │   ├── alumni.py
│   │   │   └── admin.py
│   │   ├── models/         # SQLAlchemy Models (Database)
│   │   │   ├── user.py
│   │   │   ├── profile.py
│   │   │   └── activity.py
│   │   ├── schemas/        # Pydantic Schemas (Validation)
│   │   │   ├── user_schema.py
│   │   │   └── post_schema.py
│   │   ├── services/       # Business Logic (Calculations/Auth)
│   │   │   ├── auth_service.py
│   │   │   └── verification.py
│   │   ├── database.py     # SQLite connection logic
│   │   └── main.py         # App entry point & CORS config
│   ├── uploads/            # Resumes & ID cards storage
│   ├── .env                # Environment variables
│   └── requirements.txt
│
└── frontend/               # Vanilla JS & HTML (Client-side)
    ├── index.html          # Homepage (2/3 and 1/3 split)
    ├── pages/              # Specific views
    │   ├── dashboard.html
    │   ├── profile.html
    │   ├── connections.html
    │   └── admin.html
    ├── assets/
    │   ├── css/
    │   │   └── styles.css  # Deep Navy, Teal, Gold theme
    │   ├── js/
    │   │   ├── api.js      # Global fetch() wrapper for the backend
    │   │   ├── auth.js     # Login/Signup logic
    │   │   └── main.js     # DOM manipulation & UI logic
    │   └── img/            # Brand logos & background image
```

## 7. CORS Configuration

Because the frontend and backend will likely run on different ports (e.g., Frontend on Live Server and Backend on port 8000), you must enable CORS (Cross-Origin Resource Sharing) in your main.py.

### backend/app/main.py snippet

from fastapi.middleware.cors import CORSMiddleware

```
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)
```
