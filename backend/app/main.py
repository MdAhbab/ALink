from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.controllers import auth, student, alumni, admin
from app.models import user, profile, activity
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ALink API", description="Alumni-Student Connection Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for file serving
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(alumni.router, prefix="/alumni", tags=["Alumni"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


@app.get("/")
def read_root():
    return {"message": "Welcome to ALink API", "docs": "/docs"}
