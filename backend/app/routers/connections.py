import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..events import publish, EventType
from ..models import Connection, ConnectionRequest, User
from ..schemas import ConnectionRequestIn, ConnectionRequestOut, UserPublic


router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("", response_model=list[UserPublic])
def my_connections(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[User]:
    rows = db.query(Connection).filter(
        or_(Connection.a_id == current.id, Connection.b_id == current.id)
    ).all()
    other_ids = [r.b_id if r.a_id == current.id else r.a_id for r in rows]
    if not other_ids:
        return []
    return db.query(User).filter(User.id.in_(other_ids)).all()


@router.get("/requests", response_model=list[ConnectionRequestOut])
def incoming_requests(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ConnectionRequest]:
    return (
        db.query(ConnectionRequest)
        .options(selectinload(ConnectionRequest.from_user))
        .filter(ConnectionRequest.to_id == current.id, ConnectionRequest.status == "pending")
        .order_by(ConnectionRequest.created_at.desc())
        .all()
    )


@router.get("/requests/sent", response_model=list[ConnectionRequestOut])
def sent_requests(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ConnectionRequest]:
    return (
        db.query(ConnectionRequest)
        .options(selectinload(ConnectionRequest.from_user))
        .filter(ConnectionRequest.from_id == current.id, ConnectionRequest.status == "pending")
        .order_by(ConnectionRequest.created_at.desc())
        .all()
    )


@router.post("/requests", response_model=ConnectionRequestOut, status_code=201)
def send_request(
    body: ConnectionRequestIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ConnectionRequest:
    if body.to_id == current.id:
        raise HTTPException(400, "Cannot connect to yourself")
    if not db.get(User, body.to_id):
        raise HTTPException(404, "Recipient not found")
    # Check if already connected
    a, b = sorted([current.id, body.to_id])
    if db.query(Connection).filter(and_(Connection.a_id == a, Connection.b_id == b)).first():
        raise HTTPException(409, "Already connected")
    # Check for pending request in either direction
    pending = (
        db.query(ConnectionRequest)
        .filter(
            ConnectionRequest.status == "pending",
            or_(
                and_(ConnectionRequest.from_id == current.id, ConnectionRequest.to_id == body.to_id),
                and_(ConnectionRequest.from_id == body.to_id, ConnectionRequest.to_id == current.id),
            ),
        )
        .first()
    )
    if pending:
        raise HTTPException(409, "A pending request already exists")
    req = ConnectionRequest(
        id=f"cr_{uuid.uuid4().hex[:10]}",
        from_id=current.id,
        to_id=body.to_id,
        message=body.message,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    publish(EventType.CONNECTION_REQUESTED, {
        "from_id": current.id,
        "from_name": current.name,
        "from_title": current.title,
        "to_id": body.to_id,
        "message": body.message,
    })
    return req


@router.post("/requests/{req_id}/accept", response_model=UserPublic)
def accept_request(
    req_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    req = db.get(ConnectionRequest, req_id)
    if not req or req.to_id != current.id:
        raise HTTPException(404, "Request not found")
    req.status = "accepted"
    a, b = sorted([req.from_id, req.to_id])
    exists = db.query(Connection).filter(and_(Connection.a_id == a, Connection.b_id == b)).first()
    if not exists:
        db.add(Connection(id=f"cn_{uuid.uuid4().hex[:10]}", a_id=a, b_id=b))
    db.commit()
    publish(EventType.CONNECTION_ACCEPTED, {
        "requester_id": req.from_id,
        "acceptor_id": current.id,
        "acceptor_name": current.name,
        "acceptor_title": current.title,
    })
    return db.get(User, req.from_id)


@router.post("/requests/{req_id}/decline", status_code=204)
def decline_request(
    req_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    req = db.get(ConnectionRequest, req_id)
    if not req or req.to_id != current.id:
        raise HTTPException(404, "Request not found")
    req.status = "declined"
    db.commit()


@router.delete("/{other_id}", status_code=204)
def remove_connection(
    other_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    a, b = sorted([current.id, other_id])
    row = db.query(Connection).filter(and_(Connection.a_id == a, Connection.b_id == b)).first()
    if not row:
        raise HTTPException(404, "Not connected")
    db.delete(row)
    (
        db.query(ConnectionRequest)
        .filter(
            or_(
                and_(ConnectionRequest.from_id == current.id, ConnectionRequest.to_id == other_id),
                and_(ConnectionRequest.from_id == other_id, ConnectionRequest.to_id == current.id),
            )
        )
        .delete(synchronize_session=False)
    )
    db.commit()
