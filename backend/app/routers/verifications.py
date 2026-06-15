import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..events import publish, EventType
from ..models import User, Verification, VerificationSubmission
from ..schemas import (
    VerificationOut, VerificationSubmissionIn, VerificationSubmissionOut,
)


router = APIRouter(prefix="/verifications", tags=["verifications"])


# ---- Admin: list pending queue ------------------------------------------- #
@router.get("", response_model=list[VerificationOut])
def list_queue(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[Verification]:
    return (
        db.query(Verification)
        .filter(Verification.status == "pending")
        .order_by(Verification.submitted_at.asc())
        .all()
    )


# ---- Admin: approve ------------------------------------------------------ #
@router.post("/{vid}/approve", response_model=VerificationOut)
def approve(vid: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> Verification:
    v = db.get(Verification, vid)
    if not v:
        raise HTTPException(404, "Not found")
    v.status = "approved"
    user = db.get(User, v.user_id)
    if user:
        user.verified = True
    db.commit()
    db.refresh(v)
    publish(EventType.VERIFICATION_APPROVED, {
        "user_id": v.user_id,
        "university": v.university,
    })
    return v


# ---- Admin: reject ------------------------------------------------------- #
@router.post("/{vid}/reject", response_model=VerificationOut)
def reject(vid: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> Verification:
    v = db.get(Verification, vid)
    if not v:
        raise HTTPException(404, "Not found")
    v.status = "rejected"
    db.commit()
    db.refresh(v)
    return v


# ---- Student: request verification -------------------------------------- #
@router.post("/request", status_code=201)
def request_verification(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    # Prevent duplicate pending requests
    existing = (
        db.query(Verification)
        .filter(Verification.user_id == current.id, Verification.status == "pending")
        .first()
    )
    if existing:
        raise HTTPException(409, "You already have a pending verification request")
    v = Verification(
        id=f"vr_{uuid.uuid4().hex[:10]}",
        user_id=current.id,
        name=current.name,
        university=current.university,
        role=current.role,
        submitted_at=date.today().isoformat(),
        status="pending",
    )
    db.add(v)
    db.commit()
    return {"ok": True, "id": v.id}


# ---- Student: get my verification status -------------------------------- #
@router.get("/me", response_model=list[VerificationOut])
def my_verifications(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Verification]:
    return (
        db.query(Verification)
        .filter(Verification.user_id == current.id)
        .order_by(Verification.submitted_at.desc())
        .all()
    )


# ---- Student: submit documents for a verification ----------------------- #
@router.post("/{vid}/submit", response_model=VerificationSubmissionOut, status_code=201)
def submit_documents(
    vid: str,
    body: VerificationSubmissionIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> VerificationSubmission:
    v = db.get(Verification, vid)
    if not v or v.user_id != current.id:
        raise HTTPException(404, "Verification request not found")
    if v.status != "pending":
        raise HTTPException(400, "Verification is no longer pending")
    # Prevent duplicate submissions
    existing = (
        db.query(VerificationSubmission)
        .filter(VerificationSubmission.verification_id == vid)
        .first()
    )
    if existing:
        raise HTTPException(409, "Documents already submitted for this verification")
    sub = VerificationSubmission(
        id=f"vs_{uuid.uuid4().hex[:10]}",
        verification_id=vid,
        user_id=current.id,
        id_card_url=body.id_card_url,
        resume_url=body.resume_url,
        notes=body.notes,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    publish(EventType.VERIFICATION_SUBMITTED, {
        "user_id": current.id,
        "university": current.university,
    })
    return sub
