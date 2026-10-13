from pydantic import BaseModel, Field
from typing import Optional

class VitalsInput(BaseModel):
    patient_id: Optional[str] = Field(default="PT-1001", description="Patient identifier")
    heart_rate: float = Field(..., ge=30.0, le=240.0, description="Maternal heart rate (pulse) in beats per minute")
    systolic_bp: float = Field(..., ge=40.0, le=260.0, description="Systolic blood pressure in mmHg")
    diastolic_bp: Optional[float] = Field(default=None, ge=20.0, le=180.0, description="Diastolic blood pressure in mmHg")

class ShockIndexResponse(BaseModel):
    patient_id: Optional[str]
    heart_rate: float
    systolic_bp: float
    diastolic_bp: Optional[float]
    shock_index: float
    tier: str
    status_color: str
    clinical_status: str
    recommended_action: str
    is_decompensating: bool
