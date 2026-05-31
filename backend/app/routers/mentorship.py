import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import MentorProgram, User
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
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/programs", response_model=list[MentorProgramOut])
def list_programs(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[MentorProgram]:
    return db.query(MentorProgram).all()


@router.post("/programs/{program_id}/apply", status_code=201)
def apply(
    program_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    p = db.get(MentorProgram, program_id)
    if not p:
        raise HTTPException(404, "Program not found")
    if p.filled >= p.spots:
        raise HTTPException(409, "Program is full")
    p.filled += 1
    db.commit()
    return {"ok": True, "program_id": program_id, "user_id": current.id}
