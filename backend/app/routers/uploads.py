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


def _sniff_mime(data: bytes) -> str | None:
    """Detect the real content type from magic bytes (don't trust the client)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def _validate_bytes(data: bytes, allowed: set[str]) -> str:
    """Return the sniffed MIME type or raise 400 if it isn't an allowed real type."""
    sniffed = _sniff_mime(data)
    if sniffed not in allowed:
        raise HTTPException(400, "File content does not match an allowed file type")
    return sniffed


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
    real_type = _validate_bytes(data, ALLOWED_IMAGE_TYPES)
    url = _save_file(data, file.filename or "card.png", "id-cards")
    return UploadOut(url=url, filename=file.filename or "card.png", content_type=real_type, size=len(data))


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
    real_type = _validate_bytes(data, ALLOWED_RESUME_TYPES)
    url = _save_file(data, file.filename or "resume.pdf", "resumes")
    return UploadOut(url=url, filename=file.filename or "resume.pdf", content_type=real_type, size=len(data))


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
    real_type = _validate_bytes(data, ALLOWED_IMAGE_TYPES)
    url = _save_file(data, file.filename or "avatar.png", "avatars")
    current.avatar = url
    db.commit()
    return UploadOut(url=url, filename=file.filename or "avatar.png", content_type=real_type, size=len(data))


@router.post("/chat-image", response_model=UploadOut, status_code=201)
async def upload_chat_image(
    file: UploadFile = File(...),
    current: User = Depends(get_current_user),
) -> UploadOut:
    """Upload an image intended to be shared in a chat message. Max 5 MB."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {file.content_type}")
    data = await file.read()
    if len(data) > 5 * _MB:
        raise HTTPException(413, "Chat image too large (max 5 MB)")
    real_type = _validate_bytes(data, ALLOWED_IMAGE_TYPES)
    url = _save_file(data, file.filename or "chat-image.png", "chat-images")
    return UploadOut(url=url, filename=file.filename or "chat-image.png", content_type=real_type, size=len(data))
