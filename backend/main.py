from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from pathlib import Path

from routers import patients, reports, ai, alerts
from services.automation import start_scheduler
from utils.auth import create_dev_token

load_dotenv()

app = FastAPI(title="AI Patient Care Continuity System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve locally saved PDFs at /uploads/*
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(patients.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(alerts.router)

@app.on_event("startup")
def on_startup():
    start_scheduler()

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

# ------------------------------------------------------------------
# Auth endpoints – multi-doctor signup + login
# ------------------------------------------------------------------
import bcrypt
from pydantic import BaseModel
from services.local_db import local_register_doctor, local_find_doctor

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    username: str
    password: str

@app.post("/register", tags=["auth"])
def register(body: RegisterRequest):
    """Register a new doctor account (stores bcrypt-hashed passwords in doctors.json)."""
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    try:
        doctor = local_register_doctor(body.name, body.username, hashed)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    token = create_dev_token({"sub": doctor["id"], "username": body.username, "name": body.name, "role": "doctor"})
    return {"access_token": token, "token_type": "bearer", "name": body.name, "username": body.username}

@app.post("/login", tags=["auth"])
def login(body: LoginRequest):
    """Login – checks registered doctors first, then falls back to admin/1234."""
    # 1. Check registered doctors
    doctor = local_find_doctor(body.username)
    if doctor:
        if not bcrypt.checkpw(body.password.encode(), doctor["hashed_password"].encode()):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = create_dev_token({"sub": doctor["id"], "username": body.username, "name": doctor.get("name", ""), "role": "doctor"})
        return {"access_token": token, "token_type": "bearer", "name": doctor.get("name", "Doctor"), "username": body.username}
    # 2. Fallback: hardcoded admin
    if body.username == "admin" and body.password == "1234":
        token = create_dev_token({"sub": "admin-id", "username": "admin", "name": "Admin", "role": "doctor"})
        return {"access_token": token, "token_type": "bearer", "name": "Admin", "username": "admin"}
    raise HTTPException(status_code=401, detail="Invalid username or password")


@app.post("/api/run-automation")
def manual_trigger_automation():
    # Trigger automation for demo
    from services.automation import check_inactive_patients
    check_inactive_patients()
    return {"status": "Automation check triggered manually"}
