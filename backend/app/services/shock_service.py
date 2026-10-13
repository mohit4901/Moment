from typing import Dict, Any
from ..schemas.shock_index import VitalsInput, ShockIndexResponse
from ..config import SHOCK_INDEX_TIERS

class ShockIndexService:
    _instance = None

    @classmethod
    def get_instance(cls) -> "ShockIndexService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def calculate(self, vitals: VitalsInput) -> ShockIndexResponse:
        hr = vitals.heart_rate
        sbp = max(1.0, vitals.systolic_bp)  # Prevent division by zero
        
        si = round(hr / sbp, 2)
        
        # Match tier
        selected_tier = SHOCK_INDEX_TIERS[-1]  # Default to highest
        for tier in SHOCK_INDEX_TIERS:
            if tier["min"] <= si < tier["max"]:
                selected_tier = tier
                break

        is_decompensating = si >= 0.90

        return ShockIndexResponse(
            patient_id=vitals.patient_id,
            heart_rate=round(hr, 1),
            systolic_bp=round(sbp, 1),
            diastolic_bp=round(vitals.diastolic_bp, 1) if vitals.diastolic_bp else None,
            shock_index=si,
            tier=selected_tier["name"],
            status_color=selected_tier["color"],
            clinical_status=selected_tier["status"],
            recommended_action=selected_tier["action"],
            is_decompensating=is_decompensating
        )

def get_shock_service() -> ShockIndexService:
    return ShockIndexService.get_instance()
