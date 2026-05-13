import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Referral, User
from ..schemas import ReferralIn, ReferralOut, ReferralPatch


router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("", response_model=list[ReferralOut])
def list_referrals(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Referral]:
    return (
        db.query(Referral)
        .filter(Referral.owner_id == current.id)
        .order_by(Referral.submitted_at.desc())
        .all()
    )


@router.post("", response_model=ReferralOut, status_code=201)
def create_referral(
    body: ReferralIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Referral:
    if body.referrer_id and not db.get(User, body.referrer_id):
        raise HTTPException(404, "Referrer not found")
    r = Referral(
        id=f"rf_{uuid.uuid4().hex[:10]}",
        owner_id=current.id,
        referrer_id=body.referrer_id,
        company=body.company,
        role=body.role,
        pitch=body.pitch,
        resume_url=body.resume_url,
        submitted_at=date.today().isoformat(),
        status="submitted",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.patch("/{ref_id}", response_model=ReferralOut)
def update_referral(
    ref_id: str,
    body: ReferralPatch,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Referral:
    r = db.get(Referral, ref_id)
    if not r or r.owner_id != current.id:
        raise HTTPException(404, "Referral not found")
    for k, v in body.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{ref_id}", status_code=204)
def delete_referral(
    ref_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    r = db.get(Referral, ref_id)
    if not r or r.owner_id != current.id:
        raise HTTPException(404, "Referral not found")
    db.delete(r)
    db.commit()
