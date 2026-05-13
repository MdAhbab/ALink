import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import LoginIn, RegisterIn, TokenOut, UserMe
from ..security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> TokenOut:
    token = create_access_token(user.id, extra={"role": user.role})
    return TokenOut(access_token=token, user=UserMe.model_validate(user))


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(
        id=f"u_{uuid.uuid4().hex[:10]}",
        email=body.email,
        institution_email=body.institution_email,
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
    return _token_for(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return _token_for(user)


@router.post("/login/oauth", response_model=TokenOut, include_in_schema=False)
def login_oauth(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    """OAuth2-compatible endpoint for Swagger 'Authorize' button."""
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return _token_for(user)
