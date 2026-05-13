from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Achievement, User, UserAchievement
from ..schemas import AchievementOut


router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("", response_model=list[AchievementOut])
def list_achievements(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[AchievementOut]:
    earned_map = {
        ua.achievement_id: ua.earned_at
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == current.id).all()
    }
    out: list[AchievementOut] = []
    for a in db.query(Achievement).all():
        out.append(AchievementOut(
            id=a.id, title=a.title, description=a.description,
            rarity=a.rarity, emoji=a.emoji, earned_at=earned_map.get(a.id),  # type: ignore[arg-type]
        ))
    return out
