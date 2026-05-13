from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Notification, User
from ..schemas import NotificationOut


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == current.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/{nid}/read", response_model=NotificationOut)
def mark_read(nid: str, db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> Notification:
    n = db.get(Notification, nid)
    if not n or n.user_id != current.id:
        raise HTTPException(404, "Notification not found")
    n.unread = False
    db.commit()
    db.refresh(n)
    return n


@router.post("/read-all", status_code=204)
def mark_all_read(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> None:
    db.query(Notification).filter(
        Notification.user_id == current.id, Notification.unread == True  # noqa: E712
    ).update({"unread": False})
    db.commit()


@router.delete("", status_code=204)
def clear_all(db: Session = Depends(get_db), current: User = Depends(get_current_user)) -> None:
    db.query(Notification).filter(Notification.user_id == current.id).delete()
    db.commit()
