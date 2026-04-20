"""
Local JSON file-based persistence layer.
Used when Supabase is not configured (dev mode).
All data is stored in the `data/` directory as JSON files.
"""
import json
import uuid
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

_lock = threading.Lock()

# ── Generic helpers ─────────────────────────────────────────────────

def _load(table: str) -> list:
    path = DATA_DIR / f"{table}.json"
    if not path.exists():
        return []
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []

def _save(table: str, records: list):
    path = DATA_DIR / f"{table}.json"
    with open(path, "w") as f:
        json.dump(records, f, indent=2, default=str)

def _insert(table: str, record: dict) -> dict:
    with _lock:
        records = _load(table)
        if "id" not in record:
            record["id"] = str(uuid.uuid4())
        if "created_at" not in record:
            record["created_at"] = datetime.now().isoformat()
        records.append(record)
        _save(table, records)
    return record

def _get_all(table: str, filters: Optional[dict] = None) -> list:
    records = _load(table)
    if filters:
        for key, val in filters.items():
            records = [r for r in records if r.get(key) == val]
    return records

def _get_one(table: str, id: str) -> Optional[dict]:
    for r in _load(table):
        if r.get("id") == id:
            return r
    return None

def _update(table: str, id: str, updates: dict) -> Optional[dict]:
    with _lock:
        records = _load(table)
        for r in records:
            if r.get("id") == id:
                r.update(updates)
                _save(table, records)
                return r
    return None

# ── Patient helpers ─────────────────────────────────────────────────

def local_add_patient(doctor_id: str, name: str, age: int, condition: str, phone: str) -> dict:
    return _insert("patients", {
        "doctor_id": doctor_id,
        "name": name,
        "age": age,
        "condition": condition,
        "phone": phone,
        "last_visit_date": datetime.now().strftime("%Y-%m-%d"),
    })

def local_get_patients(doctor_id: str) -> list:
    return _get_all("patients", {"doctor_id": doctor_id})

def local_get_all_patients() -> list:
    return _load("patients")

# ── Report helpers ──────────────────────────────────────────────────

def local_add_report(patient_id: str, file_url: str, extracted_text: str,
                     ai_summary: str, anomalies: str, ai_analysis: dict) -> dict:
    return _insert("reports", {
        "patient_id": patient_id,
        "file_url": file_url,
        "extracted_text": extracted_text[:3000],
        "ai_summary": ai_summary,
        "anomalies": anomalies,
        "ai_analysis": ai_analysis,
    })

def local_get_reports(patient_id: Optional[str] = None) -> list:
    if patient_id:
        return _get_all("reports", {"patient_id": patient_id})
    return _load("reports")

def local_get_report(report_id: str) -> Optional[dict]:
    return _get_one("reports", report_id)

# ── Alert helpers ───────────────────────────────────────────────────

def local_add_alert(doctor_id: str, patient_id: str, patient_name: str, message: str, type: str) -> dict:
    return _insert("alerts", {
        "doctor_id": doctor_id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "message": message,
        "type": type,
        "resolved": False,
    })

def local_get_alerts() -> list:
    return _get_all("alerts")

def local_resolve_alert(alert_id: str) -> bool:
    result = _update("alerts", alert_id, {"resolved": True})
    return result is not None

def local_inactive_alert_exists(patient_id: str) -> bool:
    alerts = _get_all("alerts", {"patient_id": patient_id, "type": "inactive", "resolved": False})
    return len(alerts) > 0

# ── Doctor / User helpers (multi-doctor auth) ───────────────────────

def local_register_doctor(name: str, username: str, hashed_password: str) -> dict:
    """Store a new doctor account. Raises ValueError if username taken."""
    existing = local_find_doctor(username)
    if existing:
        raise ValueError(f"Username '{username}' is already registered.")
    return _insert("doctors", {
        "name": name,
        "username": username,
        "hashed_password": hashed_password,
    })

def local_find_doctor(username: str) -> Optional[dict]:
    """Find a doctor record by username."""
    doctors = _load("doctors")
    for d in doctors:
        if d.get("username") == username:
            return d
    return None

def local_get_doctor(doctor_id: str) -> Optional[dict]:
    return _get_one("doctors", doctor_id)
