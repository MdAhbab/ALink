import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Goal, User
from ..schemas import GoalIn, GoalOut, GoalPatch


router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Goal]:
    return (
        db.query(Goal)
        .filter(Goal.user_id == current.id)
        .order_by(Goal.id.asc())
        .all()
    )


@router.post("", response_model=GoalOut, status_code=201)
def create_goal(
    body: GoalIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Goal:
    goal = Goal(
        id=f"g_{uuid.uuid4().hex[:10]}",
        user_id=current.id,
        label=body.label,
        progress=body.progress,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str,
    body: GoalPatch,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != current.id:
        raise HTTPException(404, "Goal not found")
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal

