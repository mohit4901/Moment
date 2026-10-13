from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ModelScore(BaseModel):
    model_name: str
    raw_probability: float
    calibrated_probability: float
    calibrated_percent: str
    f2_threshold: float
    flagged_high_risk: bool

class PredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    risk_score: float
    probability: Optional[float] = None
    risk_percentage: str
    risk_tier: str
    tier_label: str
    tier_color: str
    model_breakdown: Dict[str, ModelScore]
    model_predictions: Optional[Dict[str, float]] = None
    top_factors: Optional[List[Any]] = None
    key_risk_drivers: List[str]
    clinical_recommendations: List[str]
    derived_metrics: Dict[str, float]
    timestamp: str
    prevalence_ratio: Optional[str] = None
    prevalence_ratio_hindi: Optional[str] = None
    relative_risk_fold: Optional[str] = None
    clinical_odds_statement: Optional[str] = None
    calibrated_risk_percent: Optional[float] = None
    # Clinical Prediction Range (Confidence Interval e.g., "5.2% – 8.1%")
    risk_range: Optional[str] = None
    risk_range_percent: Optional[str] = None
    risk_range_low_pct: Optional[float] = None
    risk_range_high_pct: Optional[float] = None
    confidence_interval: Optional[str] = None
    # Full clinical intelligence analysis (risk explanations, anemia, protocols, checklists)
    clinical_analysis: Optional[Dict[str, Any]] = None
    # Postpartum Anemia Recovery & Maternal Nutrition Diet Plan (NVIDIA Nemotron / MoHFW Ayush Layer)
    postpartum_diet_plan: Optional[Dict[str, Any]] = None


