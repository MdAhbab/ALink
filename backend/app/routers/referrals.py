import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import Referral, User
from ..schemas import ReferralIn, ReferralOut, ReferralPatch


router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("", response_model=list[ReferralOut])
def list_referrals(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Referral]:
    qry = db.query(Referral)
    if current.role != "admin":
        qry = qry.filter(or_(Referral.owner_id == current.id, Referral.referrer_id == current.id))
    return qry.order_by(Referral.submitted_at.desc()).offset(offset).limit(limit).all()


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
    publish(EventType.REFERRAL_CREATED, {
        "owner_id": r.owner_id,
        "owner_name": current.name,
        "referrer_id": r.referrer_id,
        "company": r.company,
        "role": r.role,
    })
    return r


@router.patch("/{ref_id}", response_model=ReferralOut)
def update_referral(
    ref_id: str,
    body: ReferralPatch,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Referral:
    r = db.get(Referral, ref_id)
    if not r or (current.id not in (r.owner_id, r.referrer_id) and current.role != "admin"):
        raise HTTPException(404, "Referral not found")
    data = body.model_dump(exclude_unset=True, by_alias=False)
    if "status" in data and current.id != r.referrer_id and current.role != "admin":
        raise HTTPException(403, "Only the referrer or admin can update referral status")
    if current.id == r.referrer_id and current.role != "admin":
        data = {k: v for k, v in data.items() if k == "status"}
    old_status = r.status
    for k, v in data.items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    if "status" in data and r.status != old_status:
        publish(EventType.REFERRAL_STATUS_CHANGED, {
            "owner_id": r.owner_id,
            "company": r.company,
            "role": r.role,
            "status": r.status,
        })
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
