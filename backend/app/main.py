from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import settings
from .database import Base, engine
from .routers import ALL_ROUTERS
from .seed import seed_if_empty


def ensure_compatible_schema() -> None:
    """Small compatibility migration for local create_all based SQLite installs."""
    inspector = inspect(engine)
    if "bookings" not in inspector.get_table_names():
        return
    booking_columns = {c["name"] for c in inspector.get_columns("bookings")}
    statements: list[str] = []
    if "starts_at_utc" not in booking_columns:
        statements.append("ALTER TABLE bookings ADD COLUMN starts_at_utc VARCHAR")
    if "timezone" not in booking_columns:
        statements.append("ALTER TABLE bookings ADD COLUMN timezone VARCHAR")

    if "users" in inspector.get_table_names():
        user_columns = {c["name"] for c in inspector.get_columns("users")}
        if "gpa" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN gpa FLOAT")
        if "phone" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN phone VARCHAR")
        if "token_version" not in user_columns:
            statements.append("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0 NOT NULL")

    if "mentor_programs" in inspector.get_table_names():
        program_columns = {c["name"] for c in inspector.get_columns("mentor_programs")}
        if "start_date" not in program_columns:
            statements.append("ALTER TABLE mentor_programs ADD COLUMN start_date VARCHAR")

    if not statements:
        return
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_compatible_schema()
    # Ensure the uploads directory exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    seed_if_empty()
    yield


app = FastAPI(title="ALink API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe — process is up."""
    return {"ok": True, "service": "alink-api"}


@app.get("/health/ready", tags=["meta"])
def readiness() -> dict:
    """Readiness probe — reports DB connectivity and broker configuration."""
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    body = {
        "ok": db_ok,
        "database": "ok" if db_ok else "unavailable",
        "broker": "configured" if settings.rabbitmq_url else "in-process-fallback",
        "environment": settings.environment,
    }
    if not db_ok:
        return JSONResponse(status_code=503, content=body)
    return body


for r in ALL_ROUTERS:
    app.include_router(r)

# Serve uploaded files at /static/<subfolder>/<filename>
# Using /static to avoid clashing with the /uploads API router prefix.
_upload_path = Path(settings.upload_dir)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_upload_path)), name="static-uploads")
