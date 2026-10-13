from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from ..services.clinical_engine import (
    assess_anemia,
    calculate_blood_volume_analysis,
    generate_emergency_protocol,
    generate_preparedness_checklist,
    generate_monitoring_schedule,
    build_risk_explanations,
    analyze_risk_interactions,
    RISK_FACTOR_ENCYCLOPEDIA,
)

router = APIRouter(prefix="/api/clinical", tags=["Clinical Intelligence Engine"])


class AnemiaRequest(BaseModel):
    hemoglobin_gdl: Optional[float] = Field(None, ge=3.0, le=20.0, description="Maternal hemoglobin in g/dL")

class BloodVolumeRequest(BaseModel):
    weight_kg: float = Field(default=60.0, ge=30.0, le=200.0, description="Maternal weight in kg")
    hemoglobin_gdl: Optional[float] = Field(None, ge=3.0, le=20.0, description="Maternal hemoglobin in g/dL")

class ProtocolRequest(BaseModel):
    risk_tier: str = Field(default="ROUTINE", description="ROUTINE, ENHANCED, or ESCALATED")
    has_coagulopathy: bool = False
    has_hypertension: bool = False

class ChecklistRequest(BaseModel):
    risk_tier: str = Field(default="ROUTINE")
    hemoglobin_gdl: Optional[float] = None
    has_placenta_previa: bool = False
    has_abruption: bool = False
    has_coagulopathy: bool = False
    prior_csections: int = 0

class RiskExplanationRequest(BaseModel):
    gravidity: float = 1
    parity: float = 0
    gestational_age: float = 39
    prior_csections: float = 0
    multiple_births: int = 0
    macrosomia: int = 0
    placenta_previa: int = 0
    placental_abruption: int = 0
    hypertensive_disorders: int = 0
    gestational_diabetes: int = 0
    coagulation_disorders: int = 0
    maternal_hemoglobin_gdl: Optional[float] = None


@router.post("/anemia-assessment", summary="Assess Maternal Anemia Severity (NFHS-5 Validated)")
def anemia_assessment(req: AnemiaRequest) -> Dict[str, Any]:
    """
    Classifies maternal anemia using WHO criteria and NFHS-5 India validated odds ratios.
    
    Provides:
    - Anemia severity classification (Normal / Mild / Moderate / Severe)
    - PPH vulnerability odds ratio from NFHS-5 national data (N=688,803)
    - Hemorrhage tolerance threshold (shock at ~250 mL vs. ~500 mL)
    - Clinical action (transfusion, iron, blood bank preparation)
    - Hindi clinical description for ANM/community health worker communication
    """
    return assess_anemia(req.hemoglobin_gdl)


@router.post("/blood-volume", summary="Calculate Estimated Blood Volume & Hemorrhage Classes")
def blood_volume_analysis(req: BloodVolumeRequest) -> Dict[str, Any]:
    """
    Computes:
    - Estimated Blood Volume at term pregnancy (EBV)
    - Maximum Allowable Blood Loss before transfusion trigger (MABL formula)
    - ATLS Hemorrhage Classification (Class I-IV) with mL thresholds
    - Obstetric-specific warning about masked shock in pregnancy
    """
    return calculate_blood_volume_analysis(req.weight_kg, req.hemoglobin_gdl)


@router.post("/emergency-protocol", summary="Generate WHO/FIGO PPH Emergency Treatment Protocol")
def emergency_protocol(req: ProtocolRequest) -> Dict[str, Any]:
    """
    Generates evidence-based stepwise WHO/FIGO PPH management protocol:
    
    - Four Ts Assessment (Tone, Trauma, Tissue, Thrombin)
    - Prevention: Active Management of Third Stage of Labor (AMTSL)
    - First-line: Uterine massage, IV fluids, Oxytocin, Tranexamic Acid
    - Second-line: Ergometrine/Carboprost/Misoprostol (contraindication-aware)
    - Third-line: Uterine Balloon Tamponade, NASG, Blood Products
    - Last resort: B-Lynch sutures, Arterial ligation, Hysterectomy
    """
    return generate_emergency_protocol(
        req.risk_tier,
        has_coagulopathy=req.has_coagulopathy,
        has_hypertension=req.has_hypertension
    )


@router.post("/preparedness-checklist", summary="Generate Dynamic Clinical Preparedness Checklist")
def preparedness_checklist(req: ChecklistRequest) -> Dict[str, Any]:
    """
    Generates a tier-aware, patient-specific clinical preparedness checklist:
    
    - Universal items (all deliveries)
    - Enhanced monitoring items (elevated risk)
    - Critical escalation items (high risk)
    - Patient-specific alerts (placenta previa, abruption, coagulopathy, severe anemia)
    """
    return generate_preparedness_checklist(
        req.risk_tier,
        hb_gdl=req.hemoglobin_gdl,
        has_previa=req.has_placenta_previa,
        has_abruption=req.has_abruption,
        has_coagulopathy=req.has_coagulopathy,
        prior_csections=req.prior_csections
    )


@router.get("/monitoring-schedule/{risk_tier}", summary="Get Postpartum Vitals Monitoring Schedule")
def monitoring_schedule(risk_tier: str) -> Dict[str, Any]:
    """
    Generates WHO/NHM Dakshata mandated postpartum monitoring schedule:
    
    - Fourth Stage of Labor vital sign check intervals
    - Tier-adjusted frequency (every 5 min for ESCALATED vs. 15 min for ROUTINE)
    - Escalation trigger criteria (when to sound the alarm)
    """
    tier = risk_tier.upper().strip()
    if tier not in ["ROUTINE", "ENHANCED", "ESCALATED"]:
        raise HTTPException(status_code=400, detail="Risk tier must be ROUTINE, ENHANCED, or ESCALATED")
    return generate_monitoring_schedule(tier)


@router.post("/risk-explanations", summary="Get Evidence-Based Risk Factor Explanations")
def risk_explanations(req: RiskExplanationRequest) -> Dict[str, Any]:
    """
    Analyzes patient's clinical features and returns detailed, evidence-based
    explanations for EVERY detected risk factor:
    
    - Pathophysiological mechanism (how it causes hemorrhage)
    - Clinical significance with odds ratios
    - Specific clinical actions required
    - Hindi translations for field-level communication
    - Dangerous risk factor INTERACTIONS (synergistic effects)
    """
    patient_dict = req.model_dump()
    explanations = build_risk_explanations(patient_dict)
    interactions = analyze_risk_interactions(patient_dict)
    
    return {
        "total_risk_factors_detected": len(explanations),
        "risk_factors": explanations,
        "dangerous_interactions": interactions,
        "total_interactions": len(interactions),
        "overall_risk_assessment": (
            "EXTREME COMPOUND RISK — Multiple synergistic hemorrhage pathways active"
            if len(interactions) >= 2
            else "ELEVATED COMPOUND RISK — Dangerous risk factor combination detected"
            if len(interactions) == 1
            else "STANDARD RISK PROFILE — No dangerous risk factor interactions detected"
            if len(explanations) <= 1
            else "MULTIPLE INDEPENDENT RISK FACTORS — Each factor independently increases hemorrhage probability"
        )
    }


@router.get("/risk-encyclopedia", summary="Get Complete PPH Risk Factor Medical Encyclopedia")
def risk_encyclopedia() -> Dict[str, Any]:
    """
    Returns the complete evidence-based PPH risk factor encyclopedia
    with mechanisms, odds ratios, clinical actions, and Hindi translations
    for all tracked maternal risk indicators.
    """
    return {
        "total_risk_factors": len(RISK_FACTOR_ENCYCLOPEDIA),
        "factors": RISK_FACTOR_ENCYCLOPEDIA,
        "source_note": "Odds ratios compiled from: RCOG, ACOG, WHO 2023, FIGO 2022, NFHS-5, and systematic reviews (Sebghati & Chandraharan 2017)"
    }
