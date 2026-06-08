"""Create tables and seed the DB with the same fixtures the frontend ships.

Run with:
    python -m app.seed
"""
from __future__ import annotations

import uuid

from .database import Base, SessionLocal, engine
from .models import (
    Achievement, Activity, Booking, ChatMember, ChatMessage, ChatThread,
    Connection, ConnectionRequest, Event, Goal, Job, MentorProgram,
    Notification, Referral, Story, User, UserAchievement, Verification,
)
from .security import hash_password


def avatar(seed: str) -> str:
    return f"https://api.dicebear.com/9.x/notionists/svg?seed={seed.replace(' ', '%20')}&backgroundColor=ede9fe,fef3c7,d1fae5,fce7f3"


# Same fixtures as src/app/lib/mock.ts ------------------------------------- #
PEOPLE = [
    dict(id="u1", name="Maya Patel", role="alumni", title="Staff Product Designer", company="Linear",
         university="Stanford University", major="HCI", industry="Software", graduation_year=2018,
         location="San Francisco, CA", bio="Designing tools for makers. Loves typography & climbing.",
         verified=True, skills=["Design Systems", "Interface Design", "Prototyping"], open_to_mentor=True),
    dict(id="u2", name="Jordan Reyes", role="alumni", title="Senior Software Engineer", company="Stripe",
         university="MIT", major="Computer Science", industry="Fintech", graduation_year=2016,
         location="New York, NY", bio="Payments infra & developer experience.",
         verified=True, skills=["Go", "Distributed Systems", "Mentoring"], open_to_mentor=True),
    dict(id="u3", name="Aiko Tanaka", role="alumni", title="Investment Associate", company="Sequoia",
         university="Harvard University", major="Economics", industry="Venture Capital", graduation_year=2019,
         location="Menlo Park, CA", bio="Backing early-stage founders in AI & climate.",
         verified=True, skills=["Fundraising", "Strategy", "Markets"], open_to_mentor=False),
    dict(id="u4", name="Daniel Okafor", role="alumni", title="Engineering Manager", company="Google",
         university="Carnegie Mellon", major="Computer Science", industry="Software", graduation_year=2014,
         location="Mountain View, CA", bio="Building search infrastructure.",
         verified=True, skills=["Leadership", "Systems", "Hiring"], open_to_mentor=True),
    dict(id="u5", name="Sofia Lindqvist", role="student", title="M.S. Candidate, CS",
         university="Stanford University", major="Computer Science", graduation_year=2026,
         location="Palo Alto, CA", bio="Researching multimodal models. Looking for SWE internships.",
         skills=["Python", "PyTorch", "Research"]),
    dict(id="u6", name="Ravi Mehta", role="student", title="B.S. Junior, EECS",
         university="UC Berkeley", major="EECS", graduation_year=2027,
         location="Berkeley, CA", bio="Founder of campus product club.",
         skills=["React", "Product", "Go"]),
    dict(id="u7", name="Hannah Cohen", role="alumni", title="Founder & CEO", company="Frame.ai",
         university="MIT", major="EECS", industry="AI", graduation_year=2015,
         location="Boston, MA", bio="Building NLP for customer ops.",
         verified=True, skills=["Leadership", "ML", "Hiring"], open_to_mentor=True),
    dict(id="u8", name="Lucas Romero", role="student", title="B.S. Senior, ME",
         university="Georgia Tech", major="Mechanical Engineering", graduation_year=2026,
         location="Atlanta, GA", bio="Robotics & motorsports.",
         skills=["CAD", "Robotics", "Sim"]),
]

ME = dict(
    id="me", name="Alex Morgan", role="student", title="B.S. Junior, Computer Science",
    university="Stanford University", major="Computer Science", graduation_year=2027,
    location="Palo Alto, CA",
    bio="Passionate about ML systems and developer tools. Seeking 2026 SWE internship.",
    skills=["TypeScript", "React", "Python", "Distributed Systems"],
)

ADMIN = dict(
    id="admin", name="Admin User", role="admin", title="ALink Admin",
    university="ALink HQ", major="", location="", bio="",
    skills=[], verified=True,
)


def seed(reset: bool = True) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # --- Users ----------------------------------------------------- #
        for p in PEOPLE:
            email = f"{p['name'].split()[0].lower()}@{p['university'].split()[0].lower()}.edu"
            db.add(User(
                **p,
                email=email,
                password_hash=hash_password("password"),
                avatar=avatar(p["name"]),
            ))

        db.add(User(
            **ME,
            email="alex@stanford.edu",
            institution_email="alex@stanford.edu",
            password_hash=hash_password("password"),
            avatar=avatar(ME["name"]),
        ))
        db.add(User(
            **ADMIN,
            email="admin@alink.app",
            password_hash=hash_password("password123"),
            avatar=avatar("Admin"),
        ))

        # --- Canonical demo accounts (match frontend "Try the demo") -------- #
        # student@alink.app / alumni@alink.app / admin@alink.app — password123
        db.add(User(
            id="demo_student", name="Demo Student", role="student",
            title="B.S. Junior, Computer Science", university="Stanford University",
            major="Computer Science", graduation_year=2027, location="Palo Alto, CA",
            bio="Exploring ALink as a student. Looking for SWE internships.",
            skills=["Python", "React", "SQL"],
            email="student@alink.app", institution_email="student@alink.app",
            password_hash=hash_password("password123"), avatar=avatar("Demo Student"),
        ))
        db.add(User(
            id="demo_alumni", name="Demo Alumni", role="alumni",
            title="Software Architect", company="ALink", university="Stanford University",
            major="Computer Science", industry="Software", graduation_year=2016,
            location="San Francisco, CA", verified=True, open_to_mentor=True,
            bio="Exploring ALink as an alumnus. Happy to mentor and post roles.",
            skills=["System Design", "Mentoring", "Python"],
            email="alumni@alink.app", password_hash=hash_password("password123"),
            avatar=avatar("Demo Alumni"),
        ))
        db.commit()

        # --- Connection requests --------------------------------------- #
        db.add_all([
            ConnectionRequest(id="r1", from_id="u7", to_id="me",
                              message="Saw your project on multimodal retrieval — would love to chat."),
            ConnectionRequest(id="r2", from_id="u4", to_id="me",
                              message="Happy to share my path into eng management at Google."),
        ])

        # --- Bookings -------------------------------------------------- #
        db.add_all([
            Booking(id="b1", owner_id="me", with_id="u1", topic="Breaking into Product Design",
                    date="2026-05-16", time="10:00", duration=30, status="upcoming",
                    meeting_link="https://meet.alink.app/m-p-1"),
            Booking(id="b2", owner_id="me", with_id="u2", topic="Backend interview prep",
                    date="2026-05-22", time="14:00", duration=45, status="pending"),
            Booking(id="b3", owner_id="me", with_id="u4", topic="Path to EM at Google",
                    date="2026-04-12", time="11:00", duration=30, status="completed"),
        ])

        # --- Referrals ------------------------------------------------- #
        db.add_all([
            Referral(id="rf1", owner_id="me", referrer_id="u2", company="Stripe",
                     role="SWE Intern, Summer 2026",
                     pitch="Built distributed cache for class project; eager to learn payments infra.",
                     resume_url="#", submitted_at="2026-05-02", status="forwarded"),
            Referral(id="rf2", owner_id="me", referrer_id="u1", company="Linear",
                     role="Product Design Intern",
                     pitch="Design systems work shown in portfolio; love your craft.",
                     resume_url="#", submitted_at="2026-04-28", status="under_review"),
            Referral(id="rf3", owner_id="me", company="Sequoia Capital",
                     role="Investment Analyst",
                     pitch="Co-led campus VC fellowship; covering AI infra space.",
                     resume_url="#", submitted_at="2026-05-07", status="submitted"),
        ])

        # --- Activity & Notifications --------------------------------- #
        db.add_all([
            Activity(id="a1", user_id="me", kind="connection",
                     title="Maya Patel accepted your connection",
                     meta="Staff Product Designer at Linear"),
            Activity(id="a2", user_id="me", kind="booking",
                     title="Upcoming: Breaking into Product Design",
                     meta="with Maya Patel · Fri 10:00"),
            Activity(id="a3", user_id="me", kind="referral",
                     title="Referral forwarded at Stripe", meta="by Jordan Reyes"),
            Activity(id="a4", user_id="me", kind="post",
                     title="New job at Sequoia", meta="Investment Analyst · posted by admin"),
            Activity(id="a5", user_id="me", kind="verify",
                     title="Your profile is now verified", meta="Stanford University"),
        ])
        db.add_all([
            Notification(id="n1", user_id="me", title="Maya Patel accepted your request",
                         body="Say hi and confirm Friday's session.", unread=True),
            Notification(id="n2", user_id="me", title="Booking confirmed",
                         body="Friday 10:00 with Maya Patel.", unread=True),
            Notification(id="n3", user_id="me", title="Referral forwarded",
                         body="Stripe has your application.", unread=False),
        ])

        # --- Events ---------------------------------------------------- #
        db.add_all([
            Event(id="e1", title="Breaking into Product Design", kind="panel",
                  date="2026-05-18", time="17:30", location="Stanford · Gates 104",
                  host="Maya Patel", cover="#7C5CFF", attending=86, capacity=120,
                  tags=["Design", "Career"]),
            Event(id="e2", title="Alumni × Students Spring Mixer", kind="mixer",
                  date="2026-05-24", time="19:00", location="SF · Salesforce Park",
                  host="ALink SF Chapter", cover="#F5B461", attending=240, capacity=300,
                  tags=["Mixer", "Networking"]),
            Event(id="e3", title="Cracking the SWE Interview", kind="workshop",
                  date="2026-05-27", time="18:00", location="Online · Zoom",
                  host="Jordan Reyes", cover="#5DE0B0", attending=412, capacity=1000,
                  tags=["Engineering", "Prep"]),
            Event(id="e4", title="Summer Career Fair 2026", kind="career_fair",
                  date="2026-06-02", time="10:00", location="Boston · MIT Kresge",
                  host="ALink × MIT Career Services", cover="#FF6B8A",
                  attending=1850, capacity=4000, tags=["Hiring", "On-campus"]),
        ])

        # --- Jobs ------------------------------------------------------ #
        db.add_all([
            Job(id="jb1", company="Stripe", role="SWE Intern · Summer 2026",
                location="SF / Remote", type="Internship", posted="2d ago",
                salary="$10.4k/mo", tags=["Go", "Distributed"], posted_by_id="u2",
                alumni_count=23, status="live"),
            Job(id="jb2", company="Linear", role="Product Design Intern",
                location="Remote", type="Internship", posted="5d ago",
                salary="$9.2k/mo", tags=["Design", "Interface Design"], posted_by_id="u1",
                alumni_count=5, status="live"),
            Job(id="jb3", company="Sequoia Capital", role="Investment Analyst",
                location="Menlo Park", type="Full-time", posted="1w ago",
                salary="$135k", tags=["Finance", "VC"], posted_by_id="u3",
                alumni_count=8, status="live"),
            Job(id="jb4", company="Frame.ai", role="Founding Engineer",
                location="Boston", type="Full-time", posted="3d ago",
                salary="$180k + equity", tags=["ML", "Python"], posted_by_id="u7",
                alumni_count=2, status="live"),
            Job(id="jb5", company="Google", role="STEP Intern",
                location="Mountain View", type="Internship", posted="1d ago",
                salary="$9.8k/mo", tags=["Backend", "C++"], posted_by_id="u4",
                alumni_count=31, status="live"),
        ])

        # --- Mentorship programs --------------------------------------- #
        db.add_all([
            MentorProgram(id="m1", title="Path to Product Design", mentor_id="u1",
                          duration="6 weeks", cadence="Weekly · 45m", spots=8, filled=6,
                          focus=["Portfolio review", "Design systems"], price="Free"),
            MentorProgram(id="m2", title="Backend Interview Sprint", mentor_id="u2",
                          duration="4 weeks", cadence="Bi-weekly · 60m", spots=10, filled=9,
                          focus=["DSA", "System design"], price="Free"),
            MentorProgram(id="m3", title="Founder Office Hours", mentor_id="u7",
                          duration="Ongoing", cadence="Monthly · 30m", spots=15, filled=4,
                          focus=["Pitching", "Fundraising"], price="Free"),
        ])

        # --- Stories --------------------------------------------------- #
        db.add_all([
            Story(id="s1", title="From dorm to design: my Linear journey", author_id="u1",
                  read_minutes=6, cover="#7C5CFF",
                  excerpt="Five reflections on portfolio-building when nobody's watching.",
                  tag="Design"),
            Story(id="s2", title="The referral that changed my career", author_id="u2",
                  read_minutes=4, cover="#F5B461",
                  excerpt="A short note to your future self about reaching out.",
                  tag="Engineering"),
            Story(id="s3", title="Investing in founders, finding yourself", author_id="u3",
                  read_minutes=8, cover="#5DE0B0",
                  excerpt="What I wish I knew before pivoting into venture.",
                  tag="Venture"),
            Story(id="s4", title="How to mentor without burning out", author_id="u4",
                  read_minutes=5, cover="#FF6B8A",
                  excerpt="Boundaries, cadence, and the joy of compound impact.",
                  tag="Mentorship"),
        ])

        # --- Achievements --------------------------------------------- #
        ach = [
            Achievement(id="ac1", title="First Connection",
                        description="Made your first alumni connection.",
                        rarity="Common", emoji="🌱"),
            Achievement(id="ac2", title="Bookworm",
                        description="Booked 5 consultations.",
                        rarity="Rare", emoji="📚"),
            Achievement(id="ac3", title="Warm Intro Hero",
                        description="Received your first warm referral.",
                        rarity="Epic", emoji="🚀"),
            Achievement(id="ac4", title="Network Architect",
                        description="Connect 50 people across roles.",
                        rarity="Legendary", emoji="🏛️"),
            Achievement(id="ac5", title="Pay it Forward",
                        description="Mentor 3 students. (Alumni)",
                        rarity="Rare", emoji="💛"),
        ]
        db.add_all(ach)
        db.flush()  # persist achievements before user_achievements (FK parent-first)
        db.add_all([
            UserAchievement(id=f"ua_{uuid.uuid4().hex[:8]}", user_id="me",
                            achievement_id="ac1", earned_at="2026-04-12"),
            UserAchievement(id=f"ua_{uuid.uuid4().hex[:8]}", user_id="me",
                            achievement_id="ac2", earned_at="2026-04-28"),
            UserAchievement(id=f"ua_{uuid.uuid4().hex[:8]}", user_id="me",
                            achievement_id="ac3", earned_at="2026-05-02"),
        ])

        # --- Goals ---------------------------------------------------- #
        db.add_all([
            Goal(id="g1", user_id="me", label="Secure summer 2026 internship", progress=70),
            Goal(id="g2", user_id="me", label="5 alumni conversations", progress=60),
            Goal(id="g3", user_id="me", label="Polish portfolio site", progress=35),
        ])

        # --- Verification queue --------------------------------------- #
        db.add_all([
            Verification(id="v1", user_id="u5", name="Priya Shah",
                         university="Stanford University", role="alumni",
                         submitted_at="1d", status="pending"),
            Verification(id="v2", user_id="u6", name="Marcus Bell",
                         university="MIT", role="student",
                         submitted_at="2d", status="pending"),
            Verification(id="v3", user_id="u8", name="Yuki Sato",
                         university="UC Berkeley", role="alumni",
                         submitted_at="3d", status="pending"),
        ])

        # --- Chat threads --------------------------------------------- #
        ai_thread = ChatThread(id="ct_ai", title="ALink AI", is_ai=True, is_group=False, pinned=True)
        maya_thread = ChatThread(id="ct_maya", title="Maya Patel", is_ai=False, is_group=False, pinned=False)
        prep_thread = ChatThread(id="ct_prep", title="Interview Prep Group",
                                 is_ai=False, is_group=True, pinned=False)
        db.add_all([ai_thread, maya_thread, prep_thread])
        db.flush()  # persist threads before members/messages (FK parent-first)
        db.add_all([
            ChatMember(id="cm1", thread_id="ct_ai", user_id="me"),
            ChatMember(id="cm2", thread_id="ct_maya", user_id="me"),
            ChatMember(id="cm3", thread_id="ct_maya", user_id="u1"),
            ChatMember(id="cm4", thread_id="ct_prep", user_id="me"),
            ChatMember(id="cm5", thread_id="ct_prep", user_id="u2"),
            ChatMember(id="cm6", thread_id="ct_prep", user_id="u4"),
        ])
        db.add_all([
            ChatMessage(id="msg1", thread_id="ct_maya", sender_id="u1",
                        body="Looking forward to Friday! Bring your portfolio.", read=True),
            ChatMessage(id="msg2", thread_id="ct_maya", sender_id="me",
                        body="Will do — thanks Maya.", read=True),
            ChatMessage(id="msg3", thread_id="ct_ai", sender_id=None, is_ai=True,
                        body="Hey Alex — want a 5-minute prep doc for tomorrow?", read=False),
            ChatMessage(id="msg4", thread_id="ct_prep", sender_id="u2",
                        body="Let's run a mock system design on Sunday?", read=False),
        ])

        # --- Connections (accepted) ----------------------------------- #
        db.add(Connection(id="cn1", a_id="me", b_id="u1"))
        db.add(Connection(id="cn2", a_id="me", b_id="u2"))

        db.commit()
        print("[OK] Seeded ALink database.")
    finally:
        db.close()


def seed_if_empty() -> bool:
    db = SessionLocal()
    try:
        has_users = db.query(User.id).first() is not None
    finally:
        db.close()
    if has_users:
        return False
    seed(reset=False)
    return True


if __name__ == "__main__":
    seed()
