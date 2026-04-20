from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from utils.auth import verify_token, supabase
from services.openrouter import call_openrouter, analyze_report, explain_medicine
from models import MedicineQuery
import uuid

router = APIRouter(prefix="/api/ai", tags=["ai"])

CONCISE_SYSTEM = "You are a clinical assistant. Respond in 2-3 sentences max. Be concise, medically relevant, and actionable."

# ------------------------------------------------------------------
# In-memory fallback chat store (dev mode — no Supabase)
# ------------------------------------------------------------------
_dev_chat_history: dict[str, list] = {}  # keyed by patient_id

def _get_history_from_db(patient_id: str, limit: int = 8) -> list:
    if not supabase:
        return _dev_chat_history.get(patient_id, [])[-limit:]
    try:
        result = (
            supabase.table("chat_history")
            .select("role,content")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(reversed(result.data))   # chronological order
    except Exception:
        return []

def _save_message(patient_id: str, role: str, content: str):
    if not supabase:
        if patient_id not in _dev_chat_history:
            _dev_chat_history[patient_id] = []
        _dev_chat_history[patient_id].append({"role": role, "content": content})
        return
    try:
        supabase.table("chat_history").insert({
            "patient_id": patient_id,
            "role": role,
            "content": content,
        }).execute()
    except Exception:
        pass  # non-fatal

# ------------------------------------------------------------------
# Report Analysis
# ------------------------------------------------------------------
class ReportAnalysisRequest(BaseModel):
    report_id: str
    extracted_text: str

@router.post("/analyze-report")
async def api_analyze_report(req: ReportAnalysisRequest, user=Depends(verify_token)):
    try:
        summary = analyze_report(req.extracted_text)
        if supabase:
            supabase.table("reports").update({
                "extracted_text": req.extracted_text,
                "ai_summary": summary
            }).eq("id", req.report_id).execute()
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# Medicine Query
# ------------------------------------------------------------------
@router.post("/medicine-query")
async def api_medicine_query(req: MedicineQuery, user=Depends(verify_token)):
    try:
        explanation = explain_medicine(req.medicine_name, req.side_effects)
        if req.side_effects and supabase:
            uid = getattr(user, "id", user.get("id") if isinstance(user, dict) else "mock-id")
            supabase.table("alerts").insert({
                "doctor_id": uid,
                "type": "side_effect",
                "message": f"Side effect for {req.medicine_name}: {req.side_effects}",
            }).execute()
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# Chat with memory
# ------------------------------------------------------------------
class ChatRequest(BaseModel):
    patient_id: str
    message: str

@router.post("/chat")
async def chat_with_memory(req: ChatRequest, user=Depends(verify_token)):
    """Chat endpoint with persistent 8-message rolling memory per patient."""
    # 1. Load prior conversation
    history = _get_history_from_db(req.patient_id)

    # 2. Build messages array  
    messages = [
        {"role": "system", "content": CONCISE_SYSTEM},
        *history,
        {"role": "user", "content": req.message},
    ]

    # 3. Call LLM with full context
    try:
        import os, requests as req_lib
        OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
        if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "YOUR_OPENROUTER_API_KEY":
            reply = f"[Mock] Responding to: {req.message[:60]}..."
        else:
            response = req_lib.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "AI Patient Care System",
                    "Content-Type": "application/json",
                },
                json={"model": "meta-llama/llama-3-8b-instruct", "messages": messages},
            )
            reply = response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 4. Persist both turns
    _save_message(req.patient_id, "user", req.message)
    _save_message(req.patient_id, "assistant", reply)

    return {"reply": reply, "patient_id": req.patient_id}


# ------------------------------------------------------------------
# Chat history retrieval
# ------------------------------------------------------------------
@router.get("/chat/{patient_id}/history")
async def get_chat_history(patient_id: str, user=Depends(verify_token)):
    history = _get_history_from_db(patient_id, limit=30)
    return {"patient_id": patient_id, "history": history}
