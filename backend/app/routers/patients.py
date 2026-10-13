from fastapi import APIRouter
from typing import List, Dict, Any
from ..services.samples_service import get_sample_patients

router = APIRouter(prefix="/api/patients", tags=["Clinical Patient Profiles"])

@router.get("/samples", response_model=List[Dict[str, Any]], summary="Get Preset Clinical Demo Patient Cases")
def get_preset_patients() -> List[Dict[str, Any]]:
    """
    Returns curated clinical sample cases spanning:
    1. Low-Risk Routine Primigravida
    2. Moderate-Risk Multipara with Twins & Prior C-Section
    3. High-Risk Emergency Placenta Previa with Preeclampsia
    4. Acute Placental Abruption with Coagulopathy
    """
    return get_sample_patients()
