from fastapi import APIRouter, Depends, HTTPException
from ..schemas.shock_index import VitalsInput, ShockIndexResponse
from ..services.shock_service import ShockIndexService, get_shock_service

router = APIRouter(prefix="/api/vitals", tags=["Hemodynamic Vitals & Shock Index"])

@router.post("/shock-index", response_model=ShockIndexResponse, summary="Calculate Obstetric Shock Index (HR / SBP)")
def calculate_shock_index(
    vitals: VitalsInput,
    shock_service: ShockIndexService = Depends(get_shock_service)
) -> ShockIndexResponse:
    """
    Computes Shock Index = Heart Rate / Systolic BP.
    Stratifies into 4 clinical decompensation tiers:
    - Normal (<0.90)
    - Watch (0.90 - 1.40)
    - Critical (1.40 - 1.70)
    - Severe Decompensation (≥1.70)
    """
    try:
        return shock_service.calculate(vitals)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shock Index calculation error: {str(e)}")
