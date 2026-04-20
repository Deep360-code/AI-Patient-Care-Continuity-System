from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "YOUR_SUPABASE_URL":
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as _e:
        import logging
        logging.warning(f"[AUTH] Supabase init failed ({_e}). Falling back to dev-JWT mode.")
        supabase = None
else:
    supabase = None

# ------------------------------------------------------------------
# Dev / local JWT config — used when Supabase is not configured
# ------------------------------------------------------------------
DEV_SECRET_KEY = os.environ.get("DEV_SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

def create_dev_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, DEV_SECRET_KEY, algorithm=ALGORITHM)

def decode_dev_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, DEV_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

# ------------------------------------------------------------------
# Shared bearer dependency
# ------------------------------------------------------------------
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    if not supabase:
        # --- DEV MODE: validate against our local JWT secret ---
        if token == "mock-token":
            return {"id": "mock-doctor-uuid", "email": "mock@doctor.com"}
        return decode_dev_token(token)   # raises 401 if bad

    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
