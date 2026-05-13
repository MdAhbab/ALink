from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Activity, User
from ..schemas import ActivityOut


router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityOut])
def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Activity]:
    return (
        db.query(Activity)
        .filter(Activity.user_id == current.id)
        .order_by(Activity.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
