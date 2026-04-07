"""
Seed database with relational dummy data for Bangladesh context.
"""
import sys
from datetime import datetime, timedelta

sys.path.insert(0, '/Users/ahbab/Downloads/ALink/backend')

from app.database import SessionLocal
from app.models.user import User, UserRole, VerificationStatus, VerificationRequest
from app.models.profile import Profile
from app.models.activity import (
    Connection,
    ConsultationBooking,
    ReferralRequest,
    ReferralRecipient,
    JobPost,
)
from app.services.auth_service import get_password_hash


def create_user_with_profile(db, email, password, role, verification_status, profile_data):
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
        is_verified=verification_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(user_id=user.id, **profile_data)
    db.add(profile)
    db.commit()
    return user


def main():
    db = SessionLocal()

    print("Clearing existing data...")
    db.query(ReferralRecipient).delete()
    db.query(ReferralRequest).delete()
    db.query(ConsultationBooking).delete()
    db.query(Connection).delete()
    db.query(JobPost).delete()
    db.query(VerificationRequest).delete()
    db.query(Profile).delete()
    db.query(User).delete()
    db.commit()

    print("Creating dummy data...")

    # ========================================================================
    # ADMIN USERS (5) - keep first baseline set
    # ========================================================================
    admins = [
        {
            "email": "admin1@alink.edu.bd",
            "password": "admin123",
            "profile": {
                "name": "Dr. Rafiqul Islam",
                "university_1": "BUET",
                "high_school_1": "Notre Dame College",
                "major": "CSE",
                "bio": "Platform Administrator. Former Professor at BUET.",
            },
        },
        {
            "email": "admin2@alink.edu.bd",
            "password": "admin123",
            "profile": {
                "name": "Tasnim Ahmed",
                "university_1": "DU",
                "high_school_1": "Viqarunnisa Noon College",
                "major": "Economics",
                "bio": "Content Moderator and Community Manager.",
            },
        },
        {
            "email": "admin3@alink.edu.bd",
            "password": "admin123",
            "profile": {
                "name": "Md. Kamal Hossain",
                "university_1": "KUET",
                "high_school_1": "Rajshahi College",
                "major": "EEE",
                "bio": "Technical Support Lead.",
            },
        },
        {
            "email": "admin4@alink.edu.bd",
            "password": "admin123",
            "profile": {
                "name": "Farhana Sultana",
                "university_1": "BRAC",
                "high_school_1": "Holy Cross College",
                "major": "BBA",
                "bio": "Operations Manager.",
            },
        },
        {
            "email": "admin5@alink.edu.bd",
            "password": "admin123",
            "profile": {
                "name": "Asif Rahman",
                "university_1": "NSU",
                "high_school_1": "Dhaka College",
                "major": "CSE",
                "bio": "Platform Security and Compliance Officer.",
            },
        },
    ]

    admin_users = []
    for admin_data in admins:
        admin_users.append(
            create_user_with_profile(
                db,
                admin_data["email"],
                admin_data["password"],
                UserRole.ADMIN,
                VerificationStatus.VERIFIED,
                admin_data["profile"],
            )
        )
    print(f"Created {len(admin_users)} admin users")

    # ========================================================================
    # ALUMNI USERS (5) - keep first baseline set
    # ========================================================================
    alumni = [
        {
            "email": "alumni1@example.com",
            "password": "alumni123",
            "profile": {
                "name": "Fahim Shahriar",
                "roll_id": "1605001",
                "university_1": "BUET",
                "high_school_1": "Notre Dame College",
                "major": "CSE",
                "industry": "Technology",
                "company": "Google",
                "grad_year": 2018,
                "bio": "Software Engineer at Google, London. Mentors students on distributed systems and interview prep.",
            },
        },
        {
            "email": "alumni2@example.com",
            "password": "alumni123",
            "profile": {
                "name": "Nusrat Jahan",
                "roll_id": "1505042",
                "university_1": "DU",
                "university_2": "BRAC",
                "high_school_1": "Viqarunnisa Noon College",
                "major": "Economics",
                "industry": "Finance",
                "company": "JPMorgan Chase",
                "grad_year": 2019,
                "bio": "Investment Banking Analyst. Supports BD students targeting finance and MBA pathways.",
            },
        },
        {
            "email": "alumni3@example.com",
            "password": "alumni123",
            "profile": {
                "name": "Ashraful Islam",
                "roll_id": "1405089",
                "university_1": "CUET",
                "high_school_1": "Chittagong College",
                "major": "ME",
                "industry": "Manufacturing",
                "company": "Tesla",
                "grad_year": 2020,
                "bio": "Mechanical Engineer focused on battery manufacturing and automation.",
            },
        },
        {
            "email": "alumni4@example.com",
            "password": "alumni123",
            "profile": {
                "name": "Sabrina Rahman",
                "roll_id": "1305123",
                "university_1": "NSU",
                "high_school_1": "Holy Cross College",
                "high_school_2": "Dhaka College",
                "major": "BBA",
                "industry": "Consulting",
                "company": "McKinsey & Company",
                "grad_year": 2017,
                "bio": "Management Consultant. Helps students with case interviews and consulting career tracks.",
            },
        },
        {
            "email": "alumni5@example.com",
            "password": "alumni123",
            "profile": {
                "name": "Tanzim Ahmed",
                "roll_id": "1205067",
                "university_1": "RUET",
                "high_school_1": "Rajshahi College",
                "major": "EEE",
                "industry": "Technology",
                "company": "Microsoft",
                "grad_year": 2016,
                "bio": "Senior Software Engineer at Microsoft with previous bKash experience.",
            },
        },
    ]

    alumni_users = []
    for alumni_data in alumni:
        alumni_users.append(
            create_user_with_profile(
                db,
                alumni_data["email"],
                alumni_data["password"],
                UserRole.ALUMNI,
                VerificationStatus.VERIFIED,
                alumni_data["profile"],
            )
        )
    print(f"Created {len(alumni_users)} alumni users")

    # ========================================================================
    # STUDENT USERS (5) - Bangladesh-focused fresh relational set
    # ========================================================================
    students = [
        {
            "email": "student1@example.com",
            "password": "student123",
            "profile": {
                "name": "Mehedi Hasan",
                "roll_id": "2005001",
                "university_1": "BUET",
                "high_school_1": "Notre Dame College",
                "major": "CSE",
                "grad_year": 2025,
                "bio": "Final year CSE student targeting backend roles at bKash and Brain Station 23.",
            },
        },
        {
            "email": "student2@example.com",
            "password": "student123",
            "profile": {
                "name": "Tanjina Akter",
                "roll_id": "2105078",
                "university_1": "SUST",
                "high_school_1": "Viqarunnisa Noon College",
                "major": "CSE",
                "grad_year": 2026,
                "bio": "Frontend-focused student interested in product teams at Pathao and Shohoz.",
            },
        },
        {
            "email": "student3@example.com",
            "password": "student123",
            "profile": {
                "name": "Rakibul Hasan",
                "roll_id": "2005112",
                "university_1": "KUET",
                "high_school_1": "Khulna Zilla School",
                "major": "EEE",
                "grad_year": 2025,
                "bio": "EEE student interested in telco and power systems roles in Grameenphone and Robi.",
            },
        },
        {
            "email": "student4@example.com",
            "password": "student123",
            "profile": {
                "name": "Lamia Haque",
                "roll_id": "2205034",
                "university_1": "DU",
                "high_school_1": "Holy Cross College",
                "major": "Economics",
                "grad_year": 2027,
                "bio": "Economics undergrad interested in MTO tracks and policy analytics in Bangladesh.",
            },
        },
        {
            "email": "student5@example.com",
            "password": "student123",
            "profile": {
                "name": "Fahad Rahman",
                "roll_id": "2105089",
                "university_1": "IUT",
                "high_school_1": "Adamjee Cantonment College",
                "major": "CSE",
                "grad_year": 2026,
                "bio": "CSE student building security projects and looking for internships at TigerIT and fintech teams.",
            },
        },
    ]

    student_users = []
    for student_data in students:
        student_users.append(
            create_user_with_profile(
                db,
                student_data["email"],
                student_data["password"],
                UserRole.STUDENT,
                VerificationStatus.VERIFIED,
                student_data["profile"],
            )
        )
    print(f"Created {len(student_users)} student users")

    # ========================================================================
    # CONNECTIONS (13)
    # ========================================================================
    connections_data = [
        {"requester": student_users[0], "receiver": alumni_users[0], "status": "accepted"},
        {"requester": student_users[0], "receiver": alumni_users[4], "status": "accepted"},
        {"requester": student_users[0], "receiver": alumni_users[2], "status": "pending"},
        {"requester": student_users[1], "receiver": alumni_users[0], "status": "accepted"},
        {"requester": student_users[1], "receiver": alumni_users[3], "status": "pending"},
        {"requester": student_users[2], "receiver": alumni_users[4], "status": "accepted"},
        {"requester": student_users[2], "receiver": alumni_users[2], "status": "pending"},
        {"requester": student_users[3], "receiver": alumni_users[1], "status": "accepted"},
        {"requester": student_users[3], "receiver": alumni_users[3], "status": "accepted"},
        {"requester": student_users[4], "receiver": alumni_users[0], "status": "accepted"},
        {"requester": student_users[4], "receiver": alumni_users[4], "status": "pending"},
        {"requester": alumni_users[2], "receiver": student_users[2], "status": "accepted"},
        {"requester": alumni_users[3], "receiver": student_users[3], "status": "pending"},
    ]

    for conn_data in connections_data:
        db.add(
            Connection(
                requester_id=conn_data["requester"].id,
                receiver_id=conn_data["receiver"].id,
                status=conn_data["status"],
            )
        )
    db.commit()
    print(f"Created {len(connections_data)} connections")

    # ========================================================================
    # CONSULTATION BOOKINGS (7)
    # ========================================================================
    bookings_data = [
        {
            "student": student_users[0],
            "alumni": alumni_users[0],
            "scheduled_time": datetime.now() + timedelta(days=2, hours=14),
            "meeting_link": "https://meet.google.com/bd-tech-mentoring-1",
            "status": "accepted",
        },
        {
            "student": student_users[1],
            "alumni": alumni_users[3],
            "scheduled_time": datetime.now() + timedelta(days=4, hours=16),
            "meeting_link": "https://zoom.us/j/880123456789",
            "status": "requested",
        },
        {
            "student": student_users[2],
            "alumni": alumni_users[4],
            "scheduled_time": datetime.now() + timedelta(days=6, hours=10),
            "meeting_link": None,
            "status": "requested",
        },
        {
            "student": student_users[3],
            "alumni": alumni_users[1],
            "scheduled_time": datetime.now() + timedelta(days=3, hours=19),
            "meeting_link": "https://teams.microsoft.com/meet/finance-mentoring-bd",
            "status": "accepted",
        },
        {
            "student": student_users[4],
            "alumni": alumni_users[0],
            "scheduled_time": datetime.now() + timedelta(days=8, hours=11),
            "meeting_link": "https://meet.google.com/security-career-session",
            "status": "accepted",
        },
        {
            "student": student_users[0],
            "alumni": alumni_users[4],
            "scheduled_time": datetime.now() - timedelta(days=2),
            "meeting_link": "https://meet.google.com/completed-session-bd",
            "status": "completed",
        },
        {
            "student": student_users[1],
            "alumni": alumni_users[0],
            "scheduled_time": datetime.now() + timedelta(days=1, hours=9),
            "meeting_link": None,
            "status": "declined",
        },
    ]

    for booking_data in bookings_data:
        db.add(
            ConsultationBooking(
                student_id=booking_data["student"].id,
                alumni_id=booking_data["alumni"].id,
                scheduled_time=booking_data["scheduled_time"],
                meeting_link=booking_data["meeting_link"],
                status=booking_data["status"],
            )
        )
    db.commit()
    print(f"Created {len(bookings_data)} consultation bookings")

    # ========================================================================
    # JOB POSTS (8)
    # ========================================================================
    jobs_data = [
        {
            "content": """Software Engineer (New Grad) - Brain Station 23, Dhaka\nTech stack: Python, Django, React. Fresh graduates encouraged to apply.""",
            "link": "https://brainstation-23.com/careers/",
            "author_id": alumni_users[0].id,
        },
        {
            "content": """MTO - Finance - Grameenphone, Dhaka\n12-month rotation program with focus on analytics and strategic finance.""",
            "link": "https://www.grameenphone.com/about/careers",
            "author_id": alumni_users[1].id,
        },
        {
            "content": """QA Automation Engineer - TigerIT Bangladesh\nSelenium/Cypress automation for large-scale national solutions.""",
            "link": "https://tigerit.com/career",
            "author_id": alumni_users[4].id,
        },
        {
            "content": """Product Manager - bKash, Dhaka\nDrive digital financial product growth for Bangladesh market segments.""",
            "link": "https://www.bkash.com/careers",
            "author_id": alumni_users[4].id,
        },
        {
            "content": """Supply Chain Executive - Unilever Bangladesh\nManage vendor and logistics operations across Bangladesh regions.""",
            "link": "https://careers.unilever.com/",
            "author_id": alumni_users[2].id,
        },
        {
            "content": """Junior Data Analyst - Pathao, Dhaka\nAnalyze mobility and logistics data to optimize rider/captain matching.""",
            "link": "https://pathao.com/career/",
            "author_id": alumni_users[0].id,
        },
        {
            "content": """Graduate Trainee - Robi Axiata, Dhaka\nEarly-career program for engineering and business graduates.""",
            "link": "https://www.robi.com.bd/en/career",
            "author_id": alumni_users[2].id,
        },
        {
            "content": """Associate Consultant - LightCastle Partners, Dhaka\nResearch, market intelligence, and advisory support for development projects.""",
            "link": "https://www.lightcastlebd.com/careers/",
            "author_id": alumni_users[3].id,
        },
    ]

    for job in jobs_data:
        db.add(JobPost(**job))
    db.commit()
    print(f"Created {len(jobs_data)} job posts")

    # ========================================================================
    # REFERRAL REQUESTS (5)
    # ========================================================================
    referral_requests_data = [
        {
            "student": student_users[0],
            "pitch": "BUET CSE final-year student with strong DS/Algo and backend projects in Django. Looking for referral to Brain Station 23 or bKash engineering teams.",
            "resume_link": "https://drive.google.com/file/d/student1_resume",
            "alumni_ids": [alumni_users[0].id, alumni_users[4].id],
        },
        {
            "student": student_users[1],
            "pitch": "SUST CSE student with frontend portfolio and internship experience. Seeking referral to product engineering teams at Pathao.",
            "resume_link": "https://drive.google.com/file/d/student2_resume",
            "alumni_ids": [alumni_users[0].id],
        },
        {
            "student": student_users[2],
            "pitch": "KUET EEE student focused on telecom and automation, requesting referral for graduate tracks in Robi and Grameenphone.",
            "resume_link": "https://drive.google.com/file/d/student3_resume",
            "alumni_ids": [alumni_users[2].id, alumni_users[4].id],
        },
        {
            "student": student_users[3],
            "pitch": "DU Economics student with research internship experience, aiming for MTO and analyst positions in Bangladesh telecom/finance sector.",
            "resume_link": "https://drive.google.com/file/d/student4_resume",
            "alumni_ids": [alumni_users[1].id, alumni_users[3].id],
        },
        {
            "student": student_users[4],
            "pitch": "IUT CSE student with cybersecurity projects and CTF participation, looking for referral to security engineering roles.",
            "resume_link": "https://drive.google.com/file/d/student5_resume",
            "alumni_ids": [alumni_users[0].id, alumni_users[4].id],
        },
    ]

    for ref_data in referral_requests_data:
        referral = ReferralRequest(
            student_id=ref_data["student"].id,
            pitch=ref_data["pitch"],
            resume_link=ref_data["resume_link"],
        )
        db.add(referral)
        db.commit()
        db.refresh(referral)

        for idx, alumni_id in enumerate(ref_data["alumni_ids"]):
            db.add(
                ReferralRecipient(
                    request_id=referral.id,
                    alumni_id=alumni_id,
                    status="pending" if idx == 0 else "accepted",
                )
            )
    db.commit()
    print(f"Created {len(referral_requests_data)} referral requests")

    # ========================================================================
    # TEST / PENDING VERIFICATION USERS (2)
    # ========================================================================
    unverified_users = [
        {
            "email": "teststudent1@example.com",
            "password": "test123",
            "profile": {
                "name": "Arif Hossain",
                "university_1": "AUST",
                "high_school_1": "BAF Shaheen College",
                "major": "CSE",
                "grad_year": 2024,
            },
            "id_card": "https://drive.google.com/file/d/id_card_1.jpg",
        },
        {
            "email": "teststudent2@example.com",
            "password": "test123",
            "profile": {
                "name": "Sadia Islam",
                "university_1": "UIU",
                "high_school_1": "Birshreshtha Noor Mohammad College",
                "major": "BBA",
                "grad_year": 2025,
            },
            "id_card": "https://drive.google.com/file/d/id_card_2.jpg",
        },
    ]

    for unverified_data in unverified_users:
        user = create_user_with_profile(
            db,
            unverified_data["email"],
            unverified_data["password"],
            UserRole.STUDENT,
            VerificationStatus.PENDING,
            unverified_data["profile"],
        )
        db.add(
            VerificationRequest(
                user_id=user.id,
                id_card_url=unverified_data["id_card"],
                timestamp=datetime.now(),
            )
        )
    db.commit()
    print(f"Created {len(unverified_users)} unverified users with verification requests")

    # ========================================================================
    # Summary
    # ========================================================================
    print("\n" + "=" * 60)
    print("DUMMY DATA CREATION COMPLETE!")
    print("=" * 60)
    print(f"✓ {len(admin_users)} Admins")
    print(f"✓ {len(alumni_users)} Alumni")
    print(f"✓ {len(student_users)} Students")
    print(f"✓ {len(connections_data)} Connections")
    print(f"✓ {len(bookings_data)} Consultation Bookings")
    print(f"✓ {len(jobs_data)} Job Posts")
    print(f"✓ {len(referral_requests_data)} Referral Requests")
    print(f"✓ {len(unverified_users)} Pending Verifications")
    print("=" * 60)

    print("\nLogin Credentials:")
    print("-" * 60)
    print("ADMINS:")
    for i in range(5):
        print(f"  Email: admin{i+1}@alink.edu.bd | Password: admin123")
    print("\nALUMNI:")
    for i in range(5):
        print(f"  Email: alumni{i+1}@example.com | Password: alumni123")
    print("\nSTUDENTS:")
    for i in range(5):
        print(f"  Email: student{i+1}@example.com | Password: student123")
    print("\nTEST PENDING USERS:")
    print("  Email: teststudent1@example.com | Password: test123")
    print("  Email: teststudent2@example.com | Password: test123")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    main()
