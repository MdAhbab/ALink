from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Story, User
from ..schemas import StoryOut


router = APIRouter(prefix="/stories", tags=["stories"])
import uuid
from ..schemas import StoryIn


def estimate_read_minutes(text: str) -> int:
    words = len(text.split())
    return max(1, (words + 199) // 200)


@router.post("", response_model=StoryOut, status_code=201)
def create_story(
    body: StoryIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Story:
    if current.role not in ["admin", "alumni"]:
        raise HTTPException(403, "Only admins or alumni can create stories")
    content = body.body.strip() or body.excerpt.strip()
    s = Story(
        id=f"st_{uuid.uuid4().hex[:10]}",
        title=body.title,
        author_id=current.id,
        cover=body.cover,
        excerpt=body.excerpt,
        body=body.body or body.excerpt,
        tag=body.tag,
        read_minutes=estimate_read_minutes(content),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("", response_model=list[StoryOut])
def list_stories(
    tag: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Story]:
    qry = db.query(Story)
    if tag:
        qry = qry.filter(Story.tag == tag)
    return qry.all()


@router.get("/{story_id}", response_model=StoryOut)
def get_story(story_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Story:
    s = db.get(Story, story_id)
    if not s:
        raise HTTPException(404, "Story not found")
    return s
