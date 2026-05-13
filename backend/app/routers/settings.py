from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import PrefsIn


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/prefs")
def get_prefs(current: User = Depends(get_current_user)) -> dict:
    return current.prefs or {}


@router.put("/prefs")
def replace_prefs(
    body: PrefsIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    current.prefs = body.model_dump(exclude_none=True)
    flag_modified(current, "prefs")
    db.commit()
    return current.prefs


@router.patch("/prefs")
def patch_prefs(
    body: PrefsIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    current.prefs = {**(current.prefs or {}), **body.model_dump(exclude_none=True)}
    flag_modified(current, "prefs")
    db.commit()
    return current.prefs
