import os
import uuid
import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from utils.auth import verify_token, supabase
from services.pdf_processor import extract_text_from_pdf, analyze_pdf_with_ai, answer_report_question
from services.local_db import local_add_report, local_get_reports, local_get_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Local uploads directory
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# ============================================================
# POST /api/reports/upload
# Upload PDF, extract text, run AI analysis, save to DB
# ============================================================
@router.post("/upload")
async def upload_report(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(verify_token)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # --- 1. Read file bytes ---
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File read failed: {e}")

    # --- 2. Save locally ---
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    save_path = UPLOADS_DIR / unique_name
    with open(save_path, "wb") as f:
        f.write(file_bytes)
    file_url = f"/uploads/{unique_name}"

    # --- 3. Extract text from PDF ---
    try:
        extracted_text = extract_text_from_pdf(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # --- 4. AI Analysis — returns {disease, medicines, summary, anomalies} ---
    try:
        ai_analysis = analyze_pdf_with_ai(extracted_text)
    except ValueError as e:
        logging.error(f"[REPORT] AI analysis error: {e}")
        ai_analysis = {"disease": "unknown", "medicines": [], "summary": "AI analysis failed.", "anomalies": "N/A"}

    ai_summary = ai_analysis.get("summary", "")
    anomalies  = ai_analysis.get("anomalies", "")
    
    # --- 5. Store in DB (local or Supabase) ---
    if supabase:
        try:
            result = supabase.table("reports").insert({
                "patient_id": patient_id,
                "file_url": file_url,
                "extracted_text": extracted_text[:3000],
                "ai_summary": ai_summary,
                "anomalies": anomalies,
            }).execute()
            report_record = result.data[0]
            report_record["ai_analysis"] = ai_analysis
        except Exception as e:
            logging.warning(f"[REPORT] DB save failed: {e}")
    else:
        # Persist to local JSON file
        report_record = local_add_report(
            patient_id=patient_id,
            file_url=file_url,
            extracted_text=extracted_text,
            ai_summary=ai_summary,
            anomalies=anomalies,
            ai_analysis=ai_analysis,
        )

    return {
        "message": "Report uploaded and analyzed successfully.",
        "report": report_record,
        "ai_analysis": ai_analysis,
    }


# ============================================================
# GET /api/reports/list
# List all reports for the logged-in doctor's patients
# ============================================================
@router.get("/list")
async def list_reports(patient_id: str = None, user=Depends(verify_token)):
    if supabase:
        try:
            q = supabase.table("reports").select("*")
            if patient_id:
                q = q.eq("patient_id", patient_id)
            result = q.execute()
            return result.data
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return local_get_reports(patient_id)


# ============================================================
# POST /api/reports/query
# Ask a question about a stored report using its extracted text
# ============================================================
class ReportQueryRequest(BaseModel):
    report_id: str
    question: str

@router.post("/query")
async def query_report(req: ReportQueryRequest, user=Depends(verify_token)):
    extracted_text = None

    if supabase:
        try:
            result = supabase.table("reports").select("extracted_text").eq("id", req.report_id).single().execute()
            extracted_text = result.data.get("extracted_text", "")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Report not found: {e}")
    else:
        extracted_text = "Demo report text: Patient has elevated blood glucose (7.2 mmol/L). Prescribed Metformin 500mg twice daily."

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No text content found in this report.")

    try:
        answer = answer_report_question(extracted_text, req.question)
        return {"report_id": req.report_id, "question": req.question, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
