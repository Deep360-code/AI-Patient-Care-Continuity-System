from apscheduler.schedulers.background import BackgroundScheduler
from utils.auth import supabase
from services.openrouter import generate_reminder
from services.twilio import send_whatsapp_message
from services.local_db import (
    local_get_all_patients, local_add_alert, local_inactive_alert_exists
)
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)

def check_inactive_patients():
    logging.info("[AUTOMATION] Running daily check for inactive patients...")
    threshold_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    if supabase:
        # --- Supabase path ---
        try:
            patients = supabase.table("patients").select("*").lt("last_visit_date", threshold_date).execute()
            for p in patients.data:
                existing = supabase.table("alerts").select("id").eq("patient_id", p["id"]).eq("type", "inactive").eq("resolved", False).execute()
                if not existing.data:
                    _process_patient(p)
        except Exception as e:
            logging.error(f"[AUTOMATION ERR] Supabase: {e}")
    else:
        # --- Local file DB path ---
        patients = local_get_all_patients()
        for p in patients:
            last_visit = p.get("last_visit_date", "")
            if last_visit and last_visit < threshold_date:
                if not local_inactive_alert_exists(p["id"]):
                    _process_patient_local(p)

def _process_patient(p: dict):
    """Send WhatsApp reminder and log DB alert (Supabase mode)."""
    from utils.auth import supabase as sb
    name = p.get("name", "Patient")
    condition = p.get("condition", "general checkup")
    phone = p.get("phone", "")
    logging.info(f"[AUTOMATION] Processing inactive patient: {name}")
    msg = generate_reminder(name, condition)
    send_whatsapp_message(phone, msg)
    try:
        sb.table("alerts").insert({
            "doctor_id": p.get("doctor_id"),
            "patient_id": p["id"],
            "patient_name": name,
            "type": "inactive",
            "message": f"Sent WhatsApp follow-up reminder to {name} (no visit in 30+ days).",
        }).execute()
    except Exception as e:
        logging.error(f"[AUTOMATION] Alert insert failed: {e}")

def _process_patient_local(p: dict):
    """Send WhatsApp reminder and log local alert (dev mode)."""
    name = p.get("name", "Patient")
    condition = p.get("condition", "general checkup")
    phone = p.get("phone", "")
    logging.info(f"[AUTOMATION] Processing inactive patient (local): {name}")
    msg = generate_reminder(name, condition)
    send_whatsapp_message(phone, msg)
    local_add_alert(
        doctor_id=p.get("doctor_id", "dev-doctor"),
        patient_id=p["id"],
        patient_name=name,
        message=f"Sent WhatsApp follow-up reminder to {name} (no visit in 30+ days).",
        type="inactive",
    )

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_inactive_patients, "cron", hour=9, minute=0)
    scheduler.start()
    logging.info("[AUTOMATION] Scheduler started – runs daily at 9:00 AM")
