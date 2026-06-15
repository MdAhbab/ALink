"""Recommendation endpoints (ML-1 people, ML-2 jobs)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..ml.recommenders import recommend_jobs, recommend_people
from ..models import User
from ..schemas import JobOut, JobRecOut, PersonRecOut, UserPublic

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/people", response_model=list[PersonRecOut])
def people_recommendations(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    recs = recommend_people(db, current, limit=limit)
    results = []
    for user, score, reasons in recs:
        base = UserPublic.model_validate(user).model_dump(by_alias=True)
        base["matchScore"] = score
        base["reasons"] = reasons
        results.append(base)
    return results


@router.get("/jobs", response_model=list[JobRecOut])
def job_recommendations(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    recs = recommend_jobs(db, current, limit=limit)
    results = []
    for job, score, matched in recs:
        base = JobOut.model_validate(job).model_dump(by_alias=True)
        base["matchScore"] = score
        base["matchedSkills"] = matched
        results.append(base)
    return results
