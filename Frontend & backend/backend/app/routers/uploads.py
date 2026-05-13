"""File upload endpoints for ID cards, resumes, and avatars."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import UploadOut


router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_RESUME_TYPES = {"application/pdf", *ALLOWED_IMAGE_TYPES}
_MB = 1024 * 1024


def _save_file(data: bytes, original_name: str, subfolder: str) -> str:
    """Persist *data* under ``<upload_dir>/<subfolder>/`` and return the URL path."""
    ext = Path(original_name).suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = Path(settings.upload_dir) / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / filename).write_bytes(data)
    return f"/static/{subfolder}/{filename}"


@router.post("/id-card", response_model=UploadOut, status_code=201)
async def upload_id_card(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
) -> UploadOut:
    """Upload an ID-card image (JPEG, PNG, WebP, GIF). Max 5 MB by default."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")
    data = await file.read()
    if len(data) > settings.id_card_upload_limit_mb * _MB:
        raise HTTPException(413, f"File too large (max {settings.id_card_upload_limit_mb} MB)")
    url = _save_file(data, file.filename or "card.png", "id-cards")
    return UploadOut(url=url, filename=file.filename or "card.png", content_type=file.content_type or "", size=len(data))


@router.post("/resume", response_model=UploadOut, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
) -> UploadOut:
    """Upload a resume (PDF or image). Max 10 MB by default."""
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    data = await file.read()
    if len(data) > settings.resume_upload_limit_mb * _MB:
        raise HTTPException(413, f"File too large (max {settings.resume_upload_limit_mb} MB)")
    url = _save_file(data, file.filename or "resume.pdf", "resumes")
    return UploadOut(url=url, filename=file.filename or "resume.pdf", content_type=file.content_type or "", size=len(data))


@router.post("/avatar", response_model=UploadOut, status_code=201)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> UploadOut:
    """Upload an avatar image and update the user profile."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")
    data = await file.read()
    if len(data) > 5 * _MB:
        raise HTTPException(413, "Avatar image too large (max 5 MB)")
    url = _save_file(data, file.filename or "avatar.png", "avatars")
    current.avatar = url
    db.commit()
    return UploadOut(url=url, filename=file.filename or "avatar.png", content_type=file.content_type or "", size=len(data))
