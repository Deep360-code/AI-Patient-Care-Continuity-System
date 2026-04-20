from pydantic import BaseModel
from typing import Optional

class PatientCreate(BaseModel):
    name: str
    age: int
    condition: Optional[str] = None
    phone: str

class MedicineQuery(BaseModel):
    medicine_name: str
    side_effects: Optional[str] = None
