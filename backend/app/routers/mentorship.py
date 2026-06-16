import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import MentorApplication, MentorProgram, User
from ..schemas import MentorProgramIn, MentorProgramOut


router = APIRouter(prefix="/mentorship", tags=["mentorship"])


@router.post("/programs", response_model=MentorProgramOut, status_code=201)
def create_program(
    body: MentorProgramIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MentorProgram:
    if current.role not in ("alumni", "admin"):
        raise HTTPException(403, "Only alumni or admins can create mentorship programs")
    p = MentorProgram(
        id=f"mp_{uuid.uuid4().hex[:10]}",
        title=body.title,
        mentor_id=current.id,
        duration=body.duration,
        cadence=body.cadence,
        spots=body.spots,
        filled=0,
        focus=body.focus,
        price=body.price,
        start_date=body.start_date,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/programs", response_model=list[MentorProgramOut])
def list_programs(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> list[MentorProgram]:
    programs = db.query(MentorProgram).options(
        selectinload(MentorProgram.mentor),
        selectinload(MentorProgram.applications).selectinload(MentorApplication.applicant),
    ).all()
    for program in programs:
        if program.mentor_id != current.id:
            program.applications = []
    return programs


@router.get("/programs/{program_id}", response_model=MentorProgramOut)
def get_program(
    program_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> MentorProgram:
    program = db.query(MentorProgram).options(
        selectinload(MentorProgram.mentor),
        selectinload(MentorProgram.applications).selectinload(MentorApplication.applicant),
    ).filter(MentorProgram.id == program_id).first()
    if not program:
        raise HTTPException(404, "Program not found")
    if program.mentor_id != current.id:
        program.applications = []
    return program


@router.post("/programs/{program_id}/apply", status_code=201)
def apply(
    program_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    p = db.get(MentorProgram, program_id)
    if not p:
        raise HTTPException(404, "Program not found")
    if current.id == p.mentor_id:
        raise HTTPException(400, "You cannot apply to your own program")
    existing = (
        db.query(MentorApplication)
        .filter(MentorApplication.program_id == program_id, MentorApplication.user_id == current.id)
        .first()
    )
    if existing:
        raise HTTPException(409, "Already applied")
    # `filled` is a denormalized counter that already includes any seeded base.
    # Increment it (so seeded values are preserved) while MentorApplication rows
    # provide idempotency / the audit trail of who applied.
    if p.filled >= p.spots:
        raise HTTPException(409, "Program is full")
    db.add(MentorApplication(
        id=f"ma_{uuid.uuid4().hex[:10]}",
        program_id=program_id,
        user_id=current.id,
        status="applied",
    ))
    p.filled += 1
    db.commit()
    mentor = db.get(User, p.mentor_id)
    mentor_name = mentor.name if mentor else ""
    publish(EventType.MENTORSHIP_APPLIED, {
        "program_id": p.id,
        "title": p.title,
        "mentor_id": p.mentor_id,
        "mentor_name": mentor_name,
        "applicant_id": current.id,
        "applicant_name": current.name,
    })
    return {"ok": True, "program_id": program_id}
