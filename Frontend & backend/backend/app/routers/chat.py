import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ChatMember, ChatMessage, ChatThread, User
from ..schemas import ChatMessageIn, ChatMessageOut, ChatThreadOut


router = APIRouter(prefix="/chat", tags=["chat"])


def _ai_reply(prompt: str) -> str:
    p = prompt.lower()
    if "intro" in p or "draft" in p:
        return "Here's a 3-line warm intro you can copy. Want me to tailor it?"
    if "vc" in p or "venture" in p:
        return "I'd start with Aiko at Sequoia and a couple of alumni at Index. Want intros queued?"
    if "prep" in p or "friday" in p:
        return "Pulled together a prep doc: top 5 questions, latest news, mutual links. Want it pinned?"
    if "referral" in p:
        return "Your Stripe referral is forwarded; Linear is under review. Nudge in 3 days?"
    return "Got it. I'll think on this and surface 2-3 suggestions in a moment."


def _serialize_thread(t: ChatThread, db: Session, current: User) -> ChatThreadOut:
    members = (
        db.query(User)
        .join(ChatMember, ChatMember.user_id == User.id)
        .filter(ChatMember.thread_id == t.id)
        .all()
    )
    last = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == t.id)
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    unread = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.thread_id == t.id,
            ChatMessage.sender_id != current.id,
            ChatMessage.read == False,  # noqa: E712
        )
        .count()
    )
    return ChatThreadOut(
        id=t.id, title=t.title, is_ai=t.is_ai, is_group=t.is_group, pinned=t.pinned,
        members=[m for m in members],  # type: ignore[list-item]
        last_message=last,  # type: ignore[arg-type]
        unread_count=unread,
    )


@router.get("/threads", response_model=list[ChatThreadOut])
def list_threads(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ChatThreadOut]:
    thread_ids = [
        m.thread_id for m in db.query(ChatMember).filter(ChatMember.user_id == current.id).all()
    ]
    rows = (
        db.query(ChatThread)
        .filter(ChatThread.id.in_(thread_ids))
        .order_by(ChatThread.pinned.desc(), ChatThread.created_at.desc())
        .all()
    )
    return [_serialize_thread(t, db, current) for t in rows]


@router.post("/threads/{thread_id}/pin", response_model=ChatThreadOut)
def pin_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ChatThreadOut:
    t = db.get(ChatThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    t.pinned = not t.pinned
    db.commit()
    db.refresh(t)
    return _serialize_thread(t, db, current)


@router.get("/threads/{thread_id}/messages", response_model=list[ChatMessageOut])
def list_messages(
    thread_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ChatMessage]:
    if not db.query(ChatMember).filter(
        ChatMember.thread_id == thread_id, ChatMember.user_id == current.id
    ).first():
        raise HTTPException(404, "Thread not found")
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@router.post("/threads/{thread_id}/messages", response_model=ChatMessageOut, status_code=201)
def send_message(
    thread_id: str,
    body: ChatMessageIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ChatMessage:
    t = db.get(ChatThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    # Ensure the sender is a member of this thread
    if not db.query(ChatMember).filter(
        ChatMember.thread_id == thread_id, ChatMember.user_id == current.id
    ).first():
        raise HTTPException(403, "Not a member of this thread")
    if not body.body.strip():
        raise HTTPException(400, "Message body cannot be empty")
    msg = ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:10]}",
        thread_id=thread_id,
        sender_id=current.id,
        body=body.body,
        is_ai=False,
        read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # If this is the AI thread, queue a reply.
    if t.is_ai:
        reply = ChatMessage(
            id=f"msg_{uuid.uuid4().hex[:10]}",
            thread_id=thread_id,
            sender_id=None,
            body=_ai_reply(body.body),
            is_ai=True,
            read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(reply)
        db.commit()
    return msg


@router.post("/threads/{thread_id}/read", status_code=204)
def mark_thread_read(
    thread_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id,
        ChatMessage.sender_id != current.id,
    ).update({"read": True})
    db.commit()
