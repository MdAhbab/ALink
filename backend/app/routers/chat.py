import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import ChatMember, ChatMessage, ChatThread, User
from ..schemas import ChatDirectIn, ChatMessageIn, ChatMessageOut, ChatThreadOut


router = APIRouter(prefix="/chat", tags=["chat"])


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
    title = t.title
    if not t.is_ai and not t.is_group:
        other = next((m for m in members if m.id != current.id), None)
        if other:
            title = other.name
    return ChatThreadOut(
        id=t.id, title=title, is_ai=t.is_ai, is_group=t.is_group, pinned=t.pinned,
        members=[m for m in members],  # type: ignore[list-item]
        last_message=last,  # type: ignore[arg-type]
        unread_count=unread,
    )


def _find_direct_thread(db: Session, current_id: str, target_id: str) -> ChatThread | None:
    current_threads = {
        m.thread_id for m in db.query(ChatMember).filter(ChatMember.user_id == current_id).all()
    }
    target_threads = {
        m.thread_id for m in db.query(ChatMember).filter(ChatMember.user_id == target_id).all()
    }
    for thread_id in current_threads & target_threads:
        thread = db.get(ChatThread, thread_id)
        if not thread or thread.is_ai or thread.is_group:
            continue
        member_count = db.query(ChatMember).filter(ChatMember.thread_id == thread_id).count()
        if member_count == 2:
            return thread
    return None


def _find_ai_thread(db: Session, user_id: str) -> ChatThread | None:
    return (
        db.query(ChatThread)
        .join(ChatMember, ChatMember.thread_id == ChatThread.id)
        .filter(ChatThread.is_ai == True, ChatMember.user_id == user_id)  # noqa: E712
        .first()
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


@router.post("/threads/direct", response_model=ChatThreadOut)
def create_direct_thread(
    body: ChatDirectIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ChatThreadOut:
    if body.user_id == current.id:
        raise HTTPException(400, "Cannot message yourself")
    target = db.get(User, body.user_id)
    if not target:
        raise HTTPException(404, "User not found")

    existing = _find_direct_thread(db, current.id, target.id)
    if existing:
        return _serialize_thread(existing, db, current)

    thread = ChatThread(
        id=f"ct_{uuid.uuid4().hex[:10]}",
        title=target.name,
        is_ai=False,
        is_group=False,
        pinned=False,
    )
    db.add(thread)
    db.flush()
    db.add_all([
        ChatMember(id=f"cm_{uuid.uuid4().hex[:10]}", thread_id=thread.id, user_id=current.id),
        ChatMember(id=f"cm_{uuid.uuid4().hex[:10]}", thread_id=thread.id, user_id=target.id),
    ])
    db.commit()
    db.refresh(thread)
    return _serialize_thread(thread, db, current)


@router.post("/threads/ai", response_model=ChatThreadOut)
def create_ai_thread(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ChatThreadOut:
    existing = _find_ai_thread(db, current.id)
    if existing:
        return _serialize_thread(existing, db, current)

    thread = ChatThread(
        id=f"ct_ai_{uuid.uuid4().hex[:10]}",
        title="ALink AI",
        is_ai=True,
        is_group=False,
        pinned=True,
    )
    db.add(thread)
    db.flush()
    db.add(ChatMember(id=f"cm_{uuid.uuid4().hex[:10]}", thread_id=thread.id, user_id=current.id))
    db.add(ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:10]}",
        thread_id=thread.id,
        sender_id=None,
        body="Hey — I'm ALink AI. Ask me to find alumni, draft an intro, prep for a session, or summarize referrals.",
        is_ai=True,
        read=False,
    ))
    db.commit()
    db.refresh(thread)
    return _serialize_thread(thread, db, current)


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
    publish(EventType.CHAT_MESSAGE_CREATED, {
        "thread_id": thread_id,
        "is_ai": t.is_ai,
        "body": msg.body,
        "sender_id": current.id,
        "sender_name": current.name,
    })
    return msg


@router.post("/threads/{thread_id}/read", status_code=204)
def mark_thread_read(
    thread_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    if not db.query(ChatMember).filter(
        ChatMember.thread_id == thread_id, ChatMember.user_id == current.id
    ).first():
        raise HTTPException(404, "Thread not found")
    db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id,
        ChatMessage.sender_id != current.id,
    ).update({"read": True})
    db.commit()
