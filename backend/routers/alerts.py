from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from utils.auth import verify_token, supabase
from services.twilio import send_whatsapp_message
from services.openrouter import call_openrouter
from services.local_db import (
    local_add_alert, local_get_alerts, local_resolve_alert
)
import uuid

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

CONCISE_SYSTEM = "You are a clinical assistant. Respond in 2-3 lines max. Be concise, medically relevant, and actionable."

def _doctor_id(user) -> str:
    return getattr(user, "id", user.get("id") if isinstance(user, dict) else "dev-doctor")

class AlertCreate(BaseModel):
    patient_id: str
    patient_name: str
    patient_phone: str
    message: str
    type: str = "custom"

class SendAlertRequest(BaseModel):
    patient_phone: str
    patient_name: str
    message: str

class GenerateAlertRequest(BaseModel):
    patient_name: str
    condition: str
    patient_phone: str
    patient_id: Optional[str] = None

class ResolveRequest(BaseModel):
    alert_id: str

# GET /api/alerts
@router.get("/")
async def list_alerts(user=Depends(verify_token)):
    if supabase:
        try:
            result = supabase.table("alerts").select("*").order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return local_get_alerts()

# POST /api/alerts
@router.post("/")
async def create_alert(alert: AlertCreate, user=Depends(verify_token)):
    doctor_id = _doctor_id(user)
    if supabase:
        try:
            result = supabase.table("alerts").insert({
                "doctor_id": doctor_id,
                "patient_id": alert.patient_id,
                "patient_name": alert.patient_name,
                "message": alert.message,
                "type": alert.type,
            }).execute()
            return result.data[0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return local_add_alert(doctor_id, alert.patient_id, alert.patient_name, alert.message, alert.type)

# POST /api/alerts/resolve
@router.post("/resolve")
async def resolve_alert(req: ResolveRequest, user=Depends(verify_token)):
    if supabase:
        try:
            supabase.table("alerts").update({"resolved": True}).eq("id", req.alert_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        local_resolve_alert(req.alert_id)
    return {"resolved": True, "alert_id": req.alert_id}

# POST /api/alerts/send
@router.post("/send")
async def send_alert(req: SendAlertRequest, user=Depends(verify_token)):
    formatted_msg = f"Patient: {req.patient_name} | Alert: {req.message}"
    result = send_whatsapp_message(req.patient_phone, formatted_msg)
    return {"status": result.get("status"), "message": formatted_msg}

# POST /api/alerts/generate
@router.post("/generate")
async def generate_ai_alert(req: GenerateAlertRequest, user=Depends(verify_token)):
    prompt = (
        f"Write a single short WhatsApp reminder for patient {req.patient_name} who has {req.condition}. "
        f"Max 2 sentences. No diagnosis. Friendly, professional tone."
    )
    message = call_openrouter(prompt, system_prompt=CONCISE_SYSTEM)
    return {"patient_name": req.patient_name, "generated_message": message}
