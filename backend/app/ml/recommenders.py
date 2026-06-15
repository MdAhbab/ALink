"""ML recommender functions for ALink.

Implements:
  ML-1  recommend_people — content-based profile similarity + collaborative heuristics
  ML-2  recommend_jobs   — content-based job matching + popularity prior + recency bonus

Both functions require only a SQLAlchemy Session and a User ORM object.
scikit-learn is optional: when unavailable a pure-Python Jaccard fallback is used so
the application remains functional without sklearn installed.
"""
from __future__ import annotations

import math
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from ..models import Connection, Job, JobComment, JobLike, User
from .text import (
    SKLEARN_AVAILABLE,
    jaccard,
    make_profile_vectorizer,
    normalize,
    tokenize,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_doc(user: User) -> str:
    """Build a weighted text document representing a user's profile."""
    skills: list[str] = user.skills or []
    parts = (
        skills * 3  # weight skills heavily
        + [user.major or ""]
        + [user.industry or ""]
        + [user.title or ""]
        + [user.company or ""]
        + [user.university or ""]
        + [user.bio or ""]
    )
    return " ".join(parts).lower()


def _job_doc(job: Job) -> str:
    """Build a text document for a job posting."""
    tags: list[str] = job.tags or []
    parts = [job.role, " ".join(tags), job.company, job.type]
    return " ".join(parts).lower()


def _student_job_profile(user: User) -> str:
    """Build the student-side document used for job matching."""
    skills: list[str] = user.skills or []
    parts = (
        skills * 3
        + [user.major or ""]
        + [user.industry or ""]
        + [user.title or ""]
    )
    return " ".join(parts).lower()


def _adjacency_map(db: Session) -> dict[str, set[str]]:
    """Build the full connection adjacency map in a single query.

    Returns ``{user_id: {neighbour_id, ...}}``. Computing this once avoids an
    N+1 where each candidate's connections would otherwise be fetched
    individually inside the recommendation loop.
    """
    adjacency: dict[str, set[str]] = {}
    for a_id, b_id in db.query(Connection.a_id, Connection.b_id).all():
        adjacency.setdefault(a_id, set()).add(b_id)
        adjacency.setdefault(b_id, set()).add(a_id)
    return adjacency


def _content_scores_sklearn(current_doc: str, candidate_docs: list[str]) -> list[float]:
    """Return per-candidate cosine similarity scores using TF-IDF."""
    from sklearn.metrics.pairwise import cosine_similarity  # type: ignore[import]

    all_docs = [current_doc] + candidate_docs
    vec = make_profile_vectorizer()
    matrix = vec.fit_transform(all_docs)
    sims = cosine_similarity(matrix[0:1], matrix[1:])  # shape (1, n_candidates)
    return sims[0].tolist()


def _content_scores_fallback(current_doc: str, candidate_docs: list[str]) -> list[float]:
    """Return per-candidate Jaccard overlap scores (sklearn-free fallback)."""
    current_tokens = tokenize(current_doc)
    return [jaccard(current_tokens, tokenize(doc)) for doc in candidate_docs]


def _content_scores(current_doc: str, candidate_docs: list[str]) -> list[float]:
    if not candidate_docs:
        return []
    if SKLEARN_AVAILABLE:
        return _content_scores_sklearn(current_doc, candidate_docs)
    return _content_scores_fallback(current_doc, candidate_docs)


# ---------------------------------------------------------------------------
# ML-1: People recommendations
# ---------------------------------------------------------------------------

def recommend_people(
    db: Session,
    current_user: User,
    limit: int = 12,
) -> list[tuple[User, float, list[str]]]:
    """Return up to *limit* recommended users with a match score and reasons.

    Returns a list of (User, score, reasons) tuples sorted by score descending.
    """
    # Determine the target role pool
    if current_user.role == "student":
        target_role = "alumni"
    elif current_user.role == "alumni":
        target_role = "student"
    else:
        # admin → recommend alumni
        target_role = "alumni"

    # Build the connection graph once (avoids per-candidate N+1 below).
    adjacency = _adjacency_map(db)
    connected_ids = adjacency.get(current_user.id, set())

    # Candidate pool: opposite role, not admin, not self, not already connected
    candidates: list[User] = (
        db.query(User)
        .filter(
            User.role == target_role,
            User.id != current_user.id,
            ~User.id.in_(connected_ids) if connected_ids else True,
        )
        .all()
    )

    if not candidates:
        return []

    # Build documents
    current_doc = _user_doc(current_user)
    candidate_docs = [_user_doc(c) for c in candidates]

    # Content scores
    content_scores = _content_scores(current_doc, candidate_docs)

    # Current user's connection ids for 2nd-degree overlap
    current_conn_ids = connected_ids  # already fetched

    current_skills_lower = {s.lower() for s in (current_user.skills or [])}
    current_industry = normalize(current_user.industry)
    current_university = normalize(current_user.university)
    is_student = current_user.role == "student"

    results: list[tuple[User, float, list[str]]] = []
    for candidate, content in zip(candidates, content_scores):
        boosts = 0.0

        # Same university
        if current_university and normalize(candidate.university) == current_university:
            boosts += 0.12

        # Shared industry
        cand_industry = normalize(candidate.industry)
        if current_industry and cand_industry and current_industry == cand_industry:
            boosts += 0.06

        # Open to mentor (only when current user is a student looking at alumni)
        if is_student and candidate.open_to_mentor:
            boosts += 0.06

        # Verified candidate
        if candidate.verified:
            boosts += 0.04

        # Mutual-connection (2nd-degree) overlap
        cand_conn_ids = adjacency.get(candidate.id, set())
        if current_conn_ids or cand_conn_ids:
            mutual_jaccard = jaccard(current_conn_ids, cand_conn_ids)
            boosts += mutual_jaccard * 0.15

        # Blend: content dominates at 70%
        final_score = round(min(1.0, content * 0.7 + boosts), 3)

        # Build reasons
        reasons: list[str] = []

        # Shared skills
        cand_skills_lower = {s.lower() for s in (candidate.skills or [])}
        shared_lower = current_skills_lower & cand_skills_lower
        if shared_lower:
            # Recover original casing from candidate's skill list
            cand_skill_map = {s.lower(): s for s in (candidate.skills or [])}
            shared_named = [cand_skill_map[k] for k in list(shared_lower)[:3]]
            reasons.append(f"{len(shared_lower)} shared skill{'s' if len(shared_lower) != 1 else ''}: {', '.join(shared_named)}")

        if current_university and normalize(candidate.university) == current_university:
            reasons.append("Same university")

        if is_student and candidate.open_to_mentor:
            reasons.append("Open to mentoring")

        if current_industry and cand_industry and current_industry == cand_industry:
            reasons.append(f"Works in {candidate.industry}")

        # Cap at 3 reasons
        reasons = reasons[:3]
        if not reasons:
            reasons = ["Recommended for you"]

        results.append((candidate, final_score, reasons))

    # Sort descending by score
    results.sort(key=lambda t: t[1], reverse=True)
    return results[:limit]


# ---------------------------------------------------------------------------
# ML-2: Job recommendations
# ---------------------------------------------------------------------------

def _parse_recency(posted: str) -> float:
    """Try to parse a recency bonus in [0, 1] from the posted string.

    Returns 0.0 if the string is unparseable.  ISO dates get a mild decay:
      today → 1.0, 30 days ago → ~0.5, 180+ days → ~0.0.
    """
    if not posted:
        return 0.0
    s = posted.strip()
    try:
        d = date.fromisoformat(s[:10])
        delta_days = (date.today() - d).days
        # Exponential decay with half-life of ~30 days
        return max(0.0, math.exp(-delta_days / 43.0))  # ln(2)/30 ≈ 1/43
    except (ValueError, TypeError):
        return 0.0


def recommend_jobs(
    db: Session,
    current_user: User,
    limit: int = 12,
) -> list[tuple[Job, float, list[str]]]:
    """Return up to *limit* recommended jobs with a match score and matched skills.

    Returns a list of (Job, score, matched_skills) tuples sorted by score descending.
    """
    # Candidate pool: live jobs only (eager-load poster for serialization).
    candidates: list[Job] = (
        db.query(Job)
        .options(selectinload(Job.posted_by))
        .filter(Job.status == "live")
        .all()
    )
    if not candidates:
        return []

    # User profile document
    profile_doc = _student_job_profile(current_user)
    user_skills_lower = {s.lower(): s for s in (current_user.skills or [])}

    # Job documents
    job_docs = [_job_doc(j) for j in candidates]

    # Content scores
    content_scores = _content_scores(profile_doc, job_docs)

    # Popularity: likes + comments per job, normalized to [0, 1].
    # Two grouped aggregates instead of 2×N point-counts (avoids an N+1).
    job_ids = [j.id for j in candidates]
    like_counts = dict(
        db.query(JobLike.job_id, func.count(JobLike.id))
        .filter(JobLike.job_id.in_(job_ids))
        .group_by(JobLike.job_id)
        .all()
    )
    comment_counts = dict(
        db.query(JobComment.job_id, func.count(JobComment.id))
        .filter(JobComment.job_id.in_(job_ids))
        .group_by(JobComment.job_id)
        .all()
    )
    popularity_raw: list[float] = [
        math.log1p(like_counts.get(j.id, 0) + comment_counts.get(j.id, 0))
        for j in candidates
    ]

    max_pop = max(popularity_raw) if popularity_raw else 0.0
    popularity_norm = [p / max_pop if max_pop > 0 else 0.0 for p in popularity_raw]

    results: list[tuple[Job, float, list[str]]] = []
    for job, content, popularity, job_doc in zip(candidates, content_scores, popularity_norm, job_docs):
        recency = _parse_recency(job.posted)

        final_score = round(
            min(1.0, content * 0.75 + popularity * 0.2 + recency * 0.05),
            3,
        )

        # Matched skills: intersection of user skills with job tags + tokenized role
        job_tags_lower = {t.lower() for t in (job.tags or [])}
        role_tokens = tokenize(job.role)
        job_terms = job_tags_lower | role_tokens

        matched: list[str] = []
        for skill_lower, skill_orig in user_skills_lower.items():
            if skill_lower in job_terms:
                matched.append(skill_orig)
            if len(matched) >= 5:
                break

        results.append((job, final_score, matched))

    # Sort descending
    results.sort(key=lambda t: t[1], reverse=True)
    return results[:limit]
