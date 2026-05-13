from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Activity, User
from ..schemas import ActivityOut


router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityOut])
def list_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Activity]:
    return (
        db.query(Activity)
        .filter(Activity.user_id == current.id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
