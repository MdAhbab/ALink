from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import settings
from .controllers import ALL_CONTROLLERS
from .database import Base, engine
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"ok": True, "service": "alink-api"}


for r in ALL_CONTROLLERS:
    app.include_router(r)

# Serve uploaded files at /static/<subfolder>/<filename>
# Using /static to avoid clashing with the /uploads API router prefix.
_upload_path = Path(settings.upload_dir)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_upload_path)), name="static-uploads")
