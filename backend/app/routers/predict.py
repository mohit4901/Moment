from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..schemas.patient import PatientInput
from ..schemas.prediction import PredictionResponse
from ..services.model_service import ModelService, get_model_service

router = APIRouter(prefix="/api/predict", tags=["Antepartum Risk Prediction"])

@router.post("/patient", response_model=PredictionResponse, summary="Predict PPH Risk for Single Patient")
def predict_single_patient(
    patient: PatientInput,
    model_service: ModelService = Depends(get_model_service)
) -> PredictionResponse:
    """
    Evaluates 18 admission-time maternal features through:
    1. XGBoost (High Recall)
    2. LightGBM (Fast Screening)
    3. FT-Transformer (Deep Self-Attention)
    4. Calibrated Unified Ensemble
    
    Returns calibrated probability, clinical risk tier, key drivers, and actionable protocols.
    """
    try:
        response = model_service.predict_patient(patient)
        
        tier_color = "\033[92m" if response.risk_tier == "ROUTINE" else ("\033[93m" if response.risk_tier == "WATCH" else "\033[91;1m")
        hb_str = f"{patient.maternal_hemoglobin_gdl} g/dL" if patient.maternal_hemoglobin_gdl is not None else "N/A"
        print(f"\n═══════════════════════════════════════════════════════════════════════════")
        print(f"🤖 \033[95;1m[AI ML INFERENCE COMPLETE]\033[0m Evaluated Patient: \033[1m{patient.name or 'Admitted Mother'}\033[0m (ID: {patient.patient_id or 'PT-98A7'})")
        print(f"   ↳ Input Biomarkers: Age: {patient.age}y | Gravidity: {patient.gravidity} | Parity: {patient.parity} | GA: {patient.gestational_age} wks | Prior C-Sec: {patient.prior_csections} | Hb: {hb_str}")
        print(f"   ↳ \033[94;1m[MULTI-MODEL CONSENSUS BREAKDOWN (56,014 Deliveries Trained Ensemble)]:\033[0m")
        if response.model_breakdown:
            for m_key, m_score in response.model_breakdown.items():
                print(f"      • {m_score.model_name:<38}: {m_score.calibrated_percent} (Raw: {m_score.raw_probability:.3f})")
        ratio_str = f" | Odds: ~{response.prevalence_ratio} ({response.relative_risk_fold})" if response.prevalence_ratio else ""
        range_str = f" | \033[1mPrediction Range: {response.risk_range}\033[0m" if response.risk_range else ""
        print(f"   ↳ Calibrated Unified Ensemble: {tier_color}{response.risk_percentage} ({response.risk_tier} RISK){ratio_str}{range_str}\033[0m")
        if response.confidence_interval:
            print(f"   ↳ Confidence Interval: \033[36;1m{response.confidence_interval}\033[0m (Empirical inter-model spread)")
        if response.key_risk_drivers:
            drivers = ", ".join(response.key_risk_drivers[:3])
            print(f"   ↳ Top AI Risk Drivers: \033[1m{drivers}\033[0m")
        
        # Clinical Reasoning & Pathophysiology log
        if response.clinical_analysis and response.clinical_analysis.get("ai_explanation"):
            exp = response.clinical_analysis["ai_explanation"]
            print(f"   ↳ \033[96;1m[CLINICAL REASONING & PATHOPHYSIOLOGY]\033[0m")
            if exp.get("pathophysiology_mechanisms"):
                patho_snippet = exp["pathophysiology_mechanisms"]
                if len(patho_snippet) > 160:
                    patho_snippet = patho_snippet[:160] + "..."
                print(f"      • Biomedical Mechanism: {patho_snippet}")
            if exp.get("summary_hindi"):
                print(f"      • Bedside Clinical Summary (Hindi): {exp['summary_hindi']}")
            if exp.get("who_emotive_checklist"):
                print(f"      • WHO 2025 E-MOTIVE First-Response: {exp['who_emotive_checklist'][0]} | {exp['who_emotive_checklist'][1]}")
        if response.postpartum_diet_plan:
            dp = response.postpartum_diet_plan
            print(f"   ↳ 🥣 \033[93;1m[POSTPARTUM ANEMIA RECOVERY DIET PLAN GENERATED]\033[0m")
            print(f"      • Stage: {dp.get('anemia_stage_en') or dp.get('anemia_stage_hi')}")
            print(f"      • Daily Targets: {dp.get('daily_targets', {}).get('iron', '30-35 mg')} Iron | {dp.get('daily_targets', {}).get('calories', '2400 kcal')}")
            print(f"      • Schedule: {len(dp.get('meal_schedule', []))} structured meals + Ayurvedic Sutika Paricharya rules")
        print(f"═══════════════════════════════════════════════════════════════════════════\n")
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@router.post("/batch", response_model=List[PredictionResponse], summary="Batch Predict PPH Risk for Multiple Patients")
def predict_batch_patients(
    patients: List[PatientInput],
    model_service: ModelService = Depends(get_model_service)
) -> List[PredictionResponse]:
    """Runs batch inference for a list of admitted obstetric patients."""
    try:
        return [model_service.predict_patient(p) for p in patients]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch inference error: {str(e)}")
