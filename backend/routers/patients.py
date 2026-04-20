from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from utils.auth import verify_token, supabase
from services.local_db import (
    local_add_patient, local_get_patients, local_get_reports
)
from services.openrouter import call_openrouter
from services.twilio import send_whatsapp_message
from models import PatientCreate

router = APIRouter(prefix="/patients", tags=["patients"])

CONCISE_SYSTEM = "You are a clinical assistant. Respond in 2-3 sentences max. Be concise, medically relevant, and actionable."

def _doctor_id(user) -> str:
    return getattr(user, "id", user.get("id") if isinstance(user, dict) else "dev-doctor")

# ── GET /patients ────────────────────────────────────────────────────
@router.get("/")
async def get_patients(user=Depends(verify_token)):
    doctor_id = _doctor_id(user)
    if supabase:
        try:
            data = supabase.table("patients").select("*").eq("doctor_id", doctor_id).execute()
            return data.data
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return local_get_patients(doctor_id)

# ── POST /patients ───────────────────────────────────────────────────
@router.post("/")
async def add_patient(patient: PatientCreate, user=Depends(verify_token)):
    doctor_id = _doctor_id(user)
    if supabase:
        try:
            data = supabase.table("patients").insert({
                "doctor_id": doctor_id,
                "name": patient.name,
                "age": patient.age,
                "condition": patient.condition,
                "phone": patient.phone,
            }).execute()
            return data.data[0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return local_add_patient(doctor_id, patient.name, patient.age, patient.condition or "", patient.phone)

# ── POST /patients/{patient_id}/send-summary ─────────────────────────
class SummaryRequest(BaseModel):
    custom_note: str = ""

@router.post("/{patient_id}/send-summary")
async def send_patient_summary(patient_id: str, req: SummaryRequest, user=Depends(verify_token)):
    """
    Generate an AI health summary for a patient using their reports
    and send it to their WhatsApp phone number.
    """
    # 1. Load patient record
    patients = local_get_patients(_doctor_id(user))
    patient = next((p for p in patients if p["id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Load their most recent reports (up to 3)
    reports = local_get_reports(patient_id)
    report_context = ""
    for r in reports[-3:]:
        summary = r.get("ai_summary") or r.get("anomalies") or ""
        if summary:
            report_context += f"- {summary}\n"

    # 3. Build AI prompt
    prompt = (
        f"Patient: {patient['name']}, Age: {patient.get('age', 'N/A')}, "
        f"Condition: {patient.get('condition', 'general')}\n"
        f"Recent report highlights:\n{report_context or 'No reports available.'}\n"
        f"{'Doctor note: ' + req.custom_note if req.custom_note else ''}\n\n"
        "Write a short, friendly WhatsApp health summary for this patient. "
        "Max 3 sentences. No diagnosis. Encourage follow-up if needed."
    )
    summary_message = call_openrouter(prompt, system_prompt=CONCISE_SYSTEM)

    # 4. Send via WhatsApp
    phone = patient.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Patient has no phone number on record")

    result = send_whatsapp_message(phone, summary_message)

    return {
        "patient_name": patient["name"],
        "phone": phone,
        "message_sent": summary_message,
        "whatsapp_status": result.get("status"),
    }
