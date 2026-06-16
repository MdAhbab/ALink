import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..events import publish, EventType
from ..models import User
from ..ratelimit import rate_limit_auth
from ..schemas import LoginIn, RegisterIn, TokenOut, UserMe
from ..security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> TokenOut:
    token = create_access_token(user.id, extra={"role": user.role, "ver": user.token_version or 0})
    return TokenOut(access_token=token, user=UserMe.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db), _: None = Depends(rate_limit_auth)) -> TokenOut:
    if body.role == "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin accounts cannot self-register")
    normalized_email = body.email.strip().lower()
    normalized_institution_email = body.institution_email.strip().lower() if body.institution_email else None
    if db.query(User).filter(func.lower(User.email) == normalized_email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        id=f"u_{uuid.uuid4().hex[:10]}",
        email=normalized_email,
        institution_email=normalized_institution_email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
        university=body.university or "",
        major=body.major or "",
        graduation_year=body.graduation_year,
        secondary_institutions=body.secondary_institutions,
        linkedin=body.linkedin,
        avatar=f"https://api.dicebear.com/9.x/notionists/svg?seed={body.name}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    publish(EventType.USER_REGISTERED, {"user_id": user.id, "name": user.name})
    return _token_for(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db), _: None = Depends(rate_limit_auth)) -> TokenOut:
    normalized_email = body.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return _token_for(user)


@router.post("/login/oauth", response_model=TokenOut, include_in_schema=False)
def login_oauth(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    """OAuth2-compatible endpoint for Swagger 'Authorize' button."""
    normalized_email = form.username.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return _token_for(user)
