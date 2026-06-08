from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import AvatarUpdate, PasswordChange, UserMe, UserPublic, UserUpdate
from ..security import hash_password, verify_password


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
def get_me(current: User = Depends(get_current_user)) -> User:
    return current


@router.patch("/me", response_model=UserMe)
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    data = body.model_dump(exclude_unset=True, by_alias=False)
    for k, v in data.items():
        setattr(current, k, v)
        if k == "prefs":
            flag_modified(current, "prefs")

    # PRD §2.2 — auto-reclassify student → alumni when graduation year is in the past
    if current.role == "student" and current.graduation_year is not None:
        from datetime import date
        if current.graduation_year <= date.today().year:
            current.role = "alumni"

    db.commit()
    db.refresh(current)
    return current


@router.post("/me/password")
def change_password(
    body: PasswordChange,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict[str, str]:
    if not verify_password(body.current_password, current.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")

    current.password_hash = hash_password(body.new_password)
    db.commit()
    return {"status": "ok"}


@router.post("/me/avatar", response_model=UserMe)
def update_avatar(
    body: AvatarUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    current.avatar = body.avatar
    db.commit()
    db.refresh(current)
    return current


@router.get("", response_model=list[UserPublic])
def list_users(
    q: str | None = Query(default=None, description="search name/title/university/company"),
    role: str | None = None,
    university: str | None = None,
    industry: str | None = None,
    verified: bool | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[User]:
    qry = db.query(User)
    if q:
        like = f"%{q}%"
        qry = qry.filter(or_(
            User.name.ilike(like), User.title.ilike(like),
            User.university.ilike(like), User.company.ilike(like),
        ))
    if role:
        qry = qry.filter(User.role == role)
    if university:
        qry = qry.filter(User.university == university)
    if industry:
        qry = qry.filter(User.industry == industry)
    if verified is not None:
        qry = qry.filter(User.verified == verified)
    return qry.order_by(User.name).offset(offset).limit(limit).all()


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user
