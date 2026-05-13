import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import Job, JobComment, JobLike, User
from ..schemas import JobCommentIn, JobCommentOut, JobEngagementOut, JobIn, JobOut


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobOut])
def list_jobs(
    type: str | None = None,
    company: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Job]:
    qry = db.query(Job).filter(Job.status == "live")
    if type:
        qry = qry.filter(Job.type == type)
    if company:
        qry = qry.filter(Job.company.ilike(f"%{company}%"))
    return qry.order_by(Job.posted.desc()).all()


@router.post("", response_model=JobOut, status_code=201)
def create_job(
    body: JobIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Job:
    if current.role not in ("alumni", "admin"):
        raise HTTPException(403, "Only alumni or admin can post jobs")
    j = Job(
        id=f"jb_{uuid.uuid4().hex[:10]}",
        company=body.company,
        role=body.role,
        location=body.location,
        type=body.type,
        salary=body.salary,
        tags=body.tags,
        posted=date.today().isoformat(),
        posted_by_id=current.id,
        alumni_count=0,
        status="pending",
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> Job:
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    return j


@router.post("/{job_id}/approve", response_model=JobOut)
def approve_job(job_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> Job:
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    j.status = "live"
    db.commit()
    db.refresh(j)
    return j


@router.post("/{job_id}/flag", response_model=JobOut)
def flag_job(job_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> Job:
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    j.status = "flagged"
    db.commit()
    db.refresh(j)
    return j


# ---------- Engagement: Likes --------------------------------------------- #
@router.get("/{job_id}/engagement", response_model=JobEngagementOut)
def job_engagement(
    job_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> JobEngagementOut:
    if not db.get(Job, job_id):
        raise HTTPException(404, "Job not found")
    likes = db.query(JobLike).filter(JobLike.job_id == job_id).count()
    comments = db.query(JobComment).filter(JobComment.job_id == job_id).count()
    liked = (
        db.query(JobLike)
        .filter(JobLike.job_id == job_id, JobLike.user_id == current.id)
        .first()
    ) is not None
    return JobEngagementOut(likes_count=likes, comments_count=comments, liked_by_me=liked)


@router.post("/{job_id}/like", status_code=201)
def like_job(
    job_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    if not db.get(Job, job_id):
        raise HTTPException(404, "Job not found")
    existing = (
        db.query(JobLike)
        .filter(JobLike.job_id == job_id, JobLike.user_id == current.id)
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(JobLike(
        id=f"jl_{uuid.uuid4().hex[:10]}",
        job_id=job_id,
        user_id=current.id,
    ))
    db.commit()
    return {"ok": True}


@router.delete("/{job_id}/like", status_code=204)
def unlike_job(
    job_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    row = (
        db.query(JobLike)
        .filter(JobLike.job_id == job_id, JobLike.user_id == current.id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Like not found")
    db.delete(row)
    db.commit()


# ---------- Engagement: Comments / Replies -------------------------------- #
@router.get("/{job_id}/comments", response_model=list[JobCommentOut])
def list_comments(
    job_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[JobComment]:
    if not db.get(Job, job_id):
        raise HTTPException(404, "Job not found")
    # Return top-level comments (no parent); replies are nested via the relationship
    return (
        db.query(JobComment)
        .filter(JobComment.job_id == job_id, JobComment.parent_id.is_(None))
        .order_by(JobComment.created_at.asc())
        .all()
    )


@router.post("/{job_id}/comments", response_model=JobCommentOut, status_code=201)
def add_comment(
    job_id: str,
    body: JobCommentIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> JobComment:
    if not db.get(Job, job_id):
        raise HTTPException(404, "Job not found")
    # If replying, validate parent exists and belongs to the same job
    if body.parent_id:
        parent = db.get(JobComment, body.parent_id)
        if not parent or parent.job_id != job_id:
            raise HTTPException(404, "Parent comment not found")
    comment = JobComment(
        id=f"jc_{uuid.uuid4().hex[:10]}",
        job_id=job_id,
        user_id=current.id,
        parent_id=body.parent_id,
        body=body.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{job_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    job_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    c = db.get(JobComment, comment_id)
    if not c or c.job_id != job_id:
        raise HTTPException(404, "Comment not found")
    if c.user_id != current.id and current.role != "admin":
        raise HTTPException(403, "Not your comment")
    db.delete(c)
    db.commit()
