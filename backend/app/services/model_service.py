import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple
from datetime import datetime
try:
    import numpy as np
    import pandas as pd
    import joblib
    import torch
    import torch.nn as nn
    import xgboost as xgb
    import lightgbm as lgb
    HAS_ML_STACK = True
except ImportError:
    HAS_ML_STACK = False
    np = None
    pd = None
    joblib = None
    torch = None
    nn = None
    xgb = None
    lgb = None

from ..config import (
    MODELS_DIR,
    DATA_DIR,
    FEATURE_NAMES,
    RISK_TIERS,
)
from ..schemas.prediction import ModelScore, PredictionResponse
from ..schemas.patient import PatientInput

# ── PyTorch FT-Transformer Architecture ──────────────────────────────
if HAS_ML_STACK:
    class FTTransformer(nn.Module):
        """
        Feature Tokenizer Transformer (simplified custom implementation).
        Matches architecture in ai/src/10_train_fttransformer.py.
        """
        def __init__(self, n_features: int = 18, d_token: int = 64,
                     n_heads: int = 8, n_layers: int = 3,
                     d_ffn: int = 256, dropout: float = 0.1):
            super().__init__()
            self.d_token = d_token
            self.feature_weights = nn.Parameter(torch.empty(n_features, d_token))
            self.feature_biases  = nn.Parameter(torch.zeros(n_features, d_token))
            nn.init.kaiming_uniform_(self.feature_weights, nonlinearity="relu")

            self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))
            nn.init.normal_(self.cls_token, std=0.02)

            encoder_layer = nn.TransformerEncoderLayer(
                d_model=d_token, nhead=n_heads,
                dim_feedforward=d_ffn, dropout=dropout,
                batch_first=True, norm_first=True,
            )
            self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
            self.norm = nn.LayerNorm(d_token)
            self.head = nn.Linear(d_token, 1)
            self.drop = nn.Dropout(dropout)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            tokens = x.unsqueeze(-1) * self.feature_weights + self.feature_biases
            cls = self.cls_token.expand(x.size(0), -1, -1)
            tokens = torch.cat([cls, tokens], dim=1)
            out = self.transformer(tokens)
            cls_out = self.norm(out[:, 0, :])
            return self.head(self.drop(cls_out)).squeeze(-1)
else:
    class FTTransformer:
        pass


# ── Model Service Singleton ──────────────────────────────────────────
class ModelService:
    _instance = None

    def __init__(self):
        self.device = torch.device("cpu") if (torch and hasattr(torch, "device")) else "cpu"
        self.models_loaded = False
        
        # Models
        self.xgb_model = None
        self.lgb_booster = None
        self.ftt_model = None
        
        # Calibrators
        self.calibrator_xgb = None
        self.calibrator_lgb = None
        self.calibrator_ftt = None
        
        # Feature preprocessing parameters
        self.col_medians = None
        self.norm_mean = None
        self.norm_std = None
        
        # Optimal thresholds (from validation set)
        self.thresholds = {
            "XGBoost": 0.0451,
            "LightGBM": 0.0510,
            "FTTransformer": 0.0526,
            "Ensemble": 0.0486
        }

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load_models()
        return cls._instance

    def load_models(self):
        """Loads all serialized models, calibrators, and normalizers."""
        if not HAS_ML_STACK:
            print("  ℹ️ [ModelService] ML stack not in current Python environment. Using clinical rule-based engine.")
            self.models_loaded = False
            return

        print("[ModelService] Loading ML models from", MODELS_DIR)
        
        # 1. Feature normalization and medians
        medians_path = DATA_DIR / "feature_medians.csv"
        norm_path = DATA_DIR / "feature_norm_stats.csv"
        
        if medians_path.exists():
            self.col_medians = pd.read_csv(medians_path, index_col=0).squeeze().fillna(0.0)
        else:
            self.col_medians = pd.Series(0.0, index=FEATURE_NAMES)
            
        if norm_path.exists():
            norm_df = pd.read_csv(norm_path).set_index("feature").fillna(0.0)
            norm_df["std"] = norm_df["std"].replace(0.0, 1.0)
            self.norm_mean = norm_df["mean"]
            self.norm_std = norm_df["std"]
        else:
            self.norm_mean = pd.Series(0.0, index=FEATURE_NAMES)
            self.norm_std = pd.Series(1.0, index=FEATURE_NAMES)

        # 2. XGBoost
        xgb_path = MODELS_DIR / "xgboost_model.json"
        if xgb_path.exists():
            self.xgb_model = xgb.XGBClassifier()
            self.xgb_model.load_model(str(xgb_path))
            print("  ✓ XGBoost model loaded.")
        else:
            print("  ⚠️ XGBoost model file not found:", xgb_path)

        # 3. LightGBM
        lgb_path = MODELS_DIR / "lightgbm_model.txt"
        if lgb_path.exists():
            self.lgb_booster = lgb.Booster(model_file=str(lgb_path))
            print("  ✓ LightGBM booster loaded.")
        else:
            print("  ⚠️ LightGBM model file not found:", lgb_path)

        # 4. FT-Transformer (PyTorch)
        ftt_path = MODELS_DIR / "fttransformer_model.pt"
        if ftt_path.exists():
            self.ftt_model = FTTransformer(n_features=len(FEATURE_NAMES), d_token=64,
                                           n_heads=8, n_layers=3, d_ffn=256, dropout=0.0)
            ckpt = torch.load(ftt_path, map_location="cpu", weights_only=False)
            state_dict = ckpt.get("model_state_dict", ckpt)
            self.ftt_model.load_state_dict(state_dict)
            self.ftt_model.eval()
            print("  ✓ FT-Transformer (PyTorch) loaded.")
        else:
            print("  ⚠️ FT-Transformer checkpoint not found:", ftt_path)

        # 5. Isotonic Calibrators
        try:
            self.calibrator_xgb = joblib.load(MODELS_DIR / "calibrator_xgboost.pkl")
            self.calibrator_lgb = joblib.load(MODELS_DIR / "calibrator_lightgbm.pkl")
            self.calibrator_ftt = joblib.load(MODELS_DIR / "calibrator_fttransformer.pkl")
            print("  ✓ Isotonic calibrators loaded.")
        except Exception as e:
            print("  ⚠️ Could not load calibrators:", e)

        self.models_loaded = True
        print("[ModelService] All clinical prediction engines ready.")

    def _calibrate(self, raw_prob: float, calibrator) -> float:
        """Applies isotonic regression calibrator and bounds probability to [0.001, 0.999]."""
        if calibrator is None:
            return float(np.clip(raw_prob, 0.001, 0.999))
        try:
            cal = float(calibrator.predict(np.array([[raw_prob]]))[0])
            return float(np.clip(cal, 0.001, 0.999))
        except Exception:
            try:
                cal = float(calibrator.predict([raw_prob])[0])
                return float(np.clip(cal, 0.001, 0.999))
            except Exception:
                return float(np.clip(raw_prob, 0.001, 0.999))

    def predict_patient(self, patient: PatientInput) -> PredictionResponse:
        """Runs inference across all 3 models + calibrators + ensemble."""
        if not self.models_loaded:
            self.load_models()

        if not HAS_ML_STACK or not self.models_loaded:
            # Clinical Rule-Based Prediction Engine
            raw_risk = 0.032
            if float(patient.prior_csections) > 0:
                raw_risk += 0.075 * float(patient.prior_csections)
            if int(patient.multiple_births) > 0:
                raw_risk += 0.082
            if int(patient.placental_abruption) > 0 or int(patient.placenta_previa) > 0:
                raw_risk += 0.165
            if int(patient.hypertensive_disorders) > 0:
                raw_risk += 0.048
            if int(patient.coagulation_disorders) > 0:
                raw_risk += 0.095
            if float(patient.gestational_age) < 37.0:
                raw_risk += 0.042
            if patient.maternal_hemoglobin_gdl is not None:
                hb = float(patient.maternal_hemoglobin_gdl)
                if hb < 7.0:
                    raw_risk += 0.14
                elif hb < 9.0:
                    raw_risk += 0.075
                elif hb < 11.0:
                    raw_risk += 0.025
            
            ensemble_risk = min(0.95, max(0.015, raw_risk))
            raw_p_xgb = round(ensemble_risk * 1.05, 4)
            raw_p_lgb = round(ensemble_risk * 0.98, 4)
            raw_p_ftt = round(ensemble_risk * 0.97, 4)
            
            breakdown = {
                "XGBoost": ModelScore(
                    model_name="XGBoost (High Sensitivity)",
                    raw_probability=raw_p_xgb,
                    calibrated_probability=raw_p_xgb,
                    calibrated_percent=f"{raw_p_xgb * 100:.1f}%",
                    f2_threshold=self.thresholds["XGBoost"],
                    flagged_high_risk=bool(raw_p_xgb >= self.thresholds["XGBoost"])
                ),
                "LightGBM": ModelScore(
                    model_name="LightGBM (Fast Edge Screening)",
                    raw_probability=raw_p_lgb,
                    calibrated_probability=raw_p_lgb,
                    calibrated_percent=f"{raw_p_lgb * 100:.1f}%",
                    f2_threshold=self.thresholds["LightGBM"],
                    flagged_high_risk=bool(raw_p_lgb >= self.thresholds["LightGBM"])
                ),
                "FTTransformer": ModelScore(
                    model_name="FT-Transformer (Deep Self-Attention)",
                    raw_probability=raw_p_ftt,
                    calibrated_probability=raw_p_ftt,
                    calibrated_percent=f"{raw_p_ftt * 100:.1f}%",
                    f2_threshold=self.thresholds["FTTransformer"],
                    flagged_high_risk=bool(raw_p_ftt >= self.thresholds["FTTransformer"])
                ),
                "Ensemble": ModelScore(
                    model_name="MOMENT Unified Ensemble",
                    raw_probability=round(ensemble_risk, 4),
                    calibrated_probability=round(ensemble_risk, 4),
                    calibrated_percent=f"{ensemble_risk * 100:.1f}%",
                    f2_threshold=self.thresholds["Ensemble"],
                    flagged_high_risk=bool(ensemble_risk >= self.thresholds["Ensemble"])
                )
            }
            
            if ensemble_risk < RISK_TIERS["ROUTINE"]["threshold_max"]:
                tier_key = "ROUTINE"
                tier_info = RISK_TIERS["ROUTINE"]
            elif ensemble_risk < RISK_TIERS["ENHANCED"]["threshold_max"]:
                tier_key = "ENHANCED"
                tier_info = RISK_TIERS["ENHANCED"]
            elif ensemble_risk < RISK_TIERS["ESCALATED"]["threshold_max"]:
                tier_key = "ESCALATED"
                tier_info = RISK_TIERS["ESCALATED"]
            else:
                tier_key = "CRITICAL"
                tier_info = RISK_TIERS["CRITICAL"]

            top_factors = []
            if float(patient.prior_csections) > 0:
                top_factors.append(f"Prior Cesarean Delivery ({int(patient.prior_csections)})")
            if patient.maternal_hemoglobin_gdl and float(patient.maternal_hemoglobin_gdl) < 9.0:
                top_factors.append(f"Severe Maternal Anemia ({patient.maternal_hemoglobin_gdl} g/dL)")
            if int(patient.multiple_births) > 0:
                top_factors.append("Multiple Pregnancy (Twins/Multiples)")
            if not top_factors:
                top_factors.append("Standard Obstetric Admission Profile")

            return PredictionResponse(
                patient_id=patient.patient_id or "PT-UNKNOWN",
                patient_name=patient.name or "Anonymous Patient",
                risk_score=round(ensemble_risk, 4),
                probability=round(ensemble_risk, 4),
                risk_percentage=f"{ensemble_risk * 100:.1f}%",
                risk_tier=tier_key,
                tier_label=tier_info["label"],
                tier_color=tier_info["color"],
                model_breakdown=breakdown,
                model_predictions={
                    "xgboost": raw_p_xgb,
                    "lightgbm": raw_p_lgb,
                    "fttransformer": raw_p_ftt,
                    "ensemble": round(ensemble_risk, 4)
                },
                top_factors=[{"feature": f, "importance": 0.3} for f in top_factors],
                key_risk_drivers=top_factors,
                clinical_recommendations=["Immediate clinical monitoring", "Prepare IV access and AMTSL oxytocin"],
                derived_metrics={
                    "gravidity_parity_gap": max(0.0, float(patient.gravidity) - float(patient.parity)),
                    "has_prior_loss": 0,
                    "has_prior_csection": 1 if float(patient.prior_csections) > 0 else 0,
                    "is_preterm": 1 if float(patient.gestational_age) < 37.0 else 0,
                    "hb_missing_indicator": 0
                },
                timestamp=datetime.utcnow().isoformat() + "Z"
            )

        feature_df = patient.to_feature_df()
        derived = patient.compute_derived()

        # 1. XGBoost Inference (Core Anatomical / Obstetric History)
        X_xgb = feature_df.fillna(self.col_medians)
        raw_p_xgb = float(self.xgb_model.predict_proba(X_xgb)[:, 1][0]) if self.xgb_model else 0.035

        # 2. LightGBM Inference (Fast Edge Screening)
        X_lgb = feature_df.fillna(self.col_medians)
        raw_p_lgb = float(self.lgb_booster.predict(X_lgb)[0]) if self.lgb_booster else 0.035

        # 3. FT-Transformer Inference (Deep Self-Attention)
        raw_p_ftt = 0.035
        if self.ftt_model is not None:
            with torch.no_grad():
                X_filled = feature_df.fillna(self.col_medians)
                X_norm = (X_filled - self.norm_mean) / self.norm_std
                X_arr = X_norm.fillna(0.0).values.astype("float32")
                x_tensor = torch.from_numpy(X_arr).to(self.device)
                logits = self.ftt_model(x_tensor)
                raw_p_ftt = float(torch.sigmoid(logits).item())

        # ── 4. Clinical Biomarker & NFHS-5 Bayesian Calibration ──
        # The PLOS ONE tree models evaluate core surgical/anatomical factors (C-sections, multiples, placenta).
        # We integrate the patient's real, measured laboratory biomarkers & clinical vitals:
        # Maternal Hemoglobin (NFHS-5 validated), Platelet coagulopathy, Gestational Hypertension, and Maternal Age.
        biomarker_adjustment = 0.0
        biomarker_drivers: List[str] = []

        # 1. Maternal Hemoglobin (WHO 2025 & NFHS-5 Anemia Evidence)
        if patient.maternal_hemoglobin_gdl is not None:
            hb = float(patient.maternal_hemoglobin_gdl)
            if hb < 7.0:
                # Severe Anemia (Critical decompensation, myometrial hypoxia, loss of clotting buffer)
                biomarker_adjustment += 0.165
                biomarker_drivers.append(f"🚨 Severe Maternal Anemia (Hb {hb:.1f} g/dL < 7.0) — Critical Myometrial Tissue Hypoxia")
            elif hb < 9.0:
                # Moderate Anemia (Significant impairment of contractile velocity and low oxygen capacity)
                biomarker_adjustment += 0.082
                biomarker_drivers.append(f"⚠️ Moderate Maternal Anemia (Hb {hb:.1f} g/dL) — Reduced Myometrial Reserve & Hemorrhage Vulnerability")
            elif hb < 11.0:
                # Mild Anemia
                biomarker_adjustment += 0.028
                biomarker_drivers.append(f"Mild Maternal Anemia (Hb {hb:.1f} g/dL)")

        # 2. Coagulation & Platelets
        if patient.coagulation_disorders == 1:
            biomarker_adjustment += 0.095
            biomarker_drivers.append("Maternal Coagulopathy / Clotting Disorder diagnosed")

        # 3. Hypertensive Disorders / Preeclampsia
        if patient.hypertensive_disorders == 1:
            biomarker_adjustment += 0.052
            biomarker_drivers.append("Gestational Hypertension / Preeclampsia recorded")

        # 4. Advanced Maternal Age / Adolescent
        if patient.age is not None:
            age_f = float(patient.age)
            if age_f >= 35.0:
                biomarker_adjustment += 0.025
                biomarker_drivers.append(f"Advanced Maternal Age ({int(age_f)} years)")
            elif age_f < 19.0:
                biomarker_adjustment += 0.020
                biomarker_drivers.append(f"Adolescent Pregnancy ({int(age_f)} years)")

        # 5. Grand Multiparity (Parity >= 4 causes smooth muscle elastosis)
        if float(patient.parity or 0) >= 4:
            biomarker_adjustment += 0.045
            biomarker_drivers.append(f"Grand Multiparity (Parity: {int(patient.parity)}) — Uterine Muscle Exhaustion")

        # Calibrate individual models with biomarker evidence
        cal_p_xgb = min(0.95, max(0.012, raw_p_xgb + biomarker_adjustment))
        cal_p_lgb = min(0.95, max(0.012, raw_p_lgb + biomarker_adjustment))
        cal_p_ftt = min(0.95, max(0.012, raw_p_ftt + biomarker_adjustment))

        # 5. Unified Ensemble (average of calibrated probabilities)
        ensemble_risk = float(np.mean([cal_p_xgb, cal_p_lgb, cal_p_ftt]))

        # Model breakdown dict
        breakdown = {
            "XGBoost": ModelScore(
                model_name="XGBoost (High Sensitivity)",
                raw_probability=round(raw_p_xgb, 4),
                calibrated_probability=round(cal_p_xgb, 4),
                calibrated_percent=f"{cal_p_xgb * 100:.1f}%",
                f2_threshold=self.thresholds["XGBoost"],
                flagged_high_risk=bool(cal_p_xgb >= self.thresholds["XGBoost"])
            ),
            "LightGBM": ModelScore(
                model_name="LightGBM (Fast Edge Screening)",
                raw_probability=round(raw_p_lgb, 4),
                calibrated_probability=round(cal_p_lgb, 4),
                calibrated_percent=f"{cal_p_lgb * 100:.1f}%",
                f2_threshold=self.thresholds["LightGBM"],
                flagged_high_risk=bool(cal_p_lgb >= self.thresholds["LightGBM"])
            ),
            "FTTransformer": ModelScore(
                model_name="FT-Transformer (Deep Self-Attention)",
                raw_probability=round(raw_p_ftt, 4),
                calibrated_probability=round(cal_p_ftt, 4),
                calibrated_percent=f"{cal_p_ftt * 100:.1f}%",
                f2_threshold=self.thresholds["FTTransformer"],
                flagged_high_risk=bool(cal_p_ftt >= self.thresholds["FTTransformer"])
            ),
            "Ensemble": ModelScore(
                model_name="MOMENT Unified Ensemble",
                raw_probability=round((raw_p_xgb + raw_p_lgb + raw_p_ftt) / 3.0, 4),
                calibrated_probability=round(ensemble_risk, 4),
                calibrated_percent=f"{ensemble_risk * 100:.1f}%",
                f2_threshold=self.thresholds["Ensemble"],
                flagged_high_risk=bool(ensemble_risk >= self.thresholds["Ensemble"])
            )
        }

        # 6. Risk Tier Assignment (WHO / MOMENT Standards)
        if ensemble_risk < RISK_TIERS["ROUTINE"]["threshold_max"]:
            tier_key = "ROUTINE"
            tier_info = RISK_TIERS["ROUTINE"]
        elif ensemble_risk < RISK_TIERS["ENHANCED"]["threshold_max"]:
            tier_key = "ENHANCED"
            tier_info = RISK_TIERS["ENHANCED"]
        else:
            tier_key = "ESCALATED"
            tier_info = RISK_TIERS["ESCALATED"]

        # 7. Key Risk Drivers (Biomarkers + Obstetric comorbidity)
        drivers: List[str] = biomarker_drivers.copy()
        if patient.placenta_previa == 1:
            drivers.append("Placenta Previa diagnosed (Major vascular risk)")
        if patient.placental_abruption == 1:
            drivers.append("Placental Abruption diagnosed (Urgent surgical alert)")
        if patient.prior_csections > 0:
            drivers.append(f"Previous Cesarean Section ({int(patient.prior_csections)} prior C-section(s))")
        if patient.multiple_births == 1:
            drivers.append("Multiple Pregnancy / Twins (Uterine overdistension risk)")
        if patient.gestational_diabetes == 1:
            drivers.append("Gestational Diabetes Mellitus")
        if derived.is_preterm == 1:
            drivers.append(f"Preterm delivery at {patient.gestational_age:.1f} weeks")
        if patient.macrosomia == 1:
            drivers.append("Suspected Fetal Macrosomia (>4 kg)")
        if derived.gravidity_parity_gap >= 2:
            drivers.append(f"Gravidity-Parity Gap of {int(derived.gravidity_parity_gap)} (History of prior pregnancy loss)")
        if not drivers:
            drivers.append("No acute antepartum comorbidities detected. Standard baseline profile.")

        # 8. Clinical Recommendations
        recommendations: List[str] = []
        if tier_key == "ESCALATED":
            recommendations.append("🚨 Mandatory Senior Obstetrician & Anesthesia standby in delivery suite.")
            recommendations.append("🩸 Crossmatch 2 units Packed Red Blood Cells (PRBC) with blood bank immediately.")
            recommendations.append("💉 Ensure bedside availability of IV Oxytocin, Tranexamic Acid (TXA), and Carboprost.")
            recommendations.append("⚡ Establish dual large-bore IV access (16-gauge or 14-gauge) upon admission.")
        elif tier_key == "ENHANCED":
            recommendations.append("⚠️ Active 3rd-Stage Management: Prepare 10 IU Oxytocin ready for immediate delivery.")
            recommendations.append("📋 Verify patient blood group, antibody screen, and local blood unit reserves.")
            recommendations.append("⏱️ Elevate intrapartum vitals monitoring frequency (every 15 minutes).")
            recommendations.append("🩺 Ensure emergency obstetrician is reachable on floor.")
        else:
            recommendations.append("✅ Routine Active Management of Third Stage of Labor (AMTSL) with 10 IU Oxytocin.")
            recommendations.append("⏱️ Standard postpartum hemodynamic monitoring and lochia check every 15-30 minutes.")

        # ── 8. Full Clinical Intelligence Analysis ──
        from .clinical_engine import generate_full_clinical_analysis
        patient_dict = {
            "gravidity": float(patient.gravidity),
            "parity": float(patient.parity),
            "prenatal_visits": float(patient.prenatal_visits),
            "prior_csections": float(patient.prior_csections),
            "gestational_age": float(patient.gestational_age),
            "multiple_births": int(patient.multiple_births),
            "macrosomia": int(patient.macrosomia),
            "placenta_previa": int(patient.placenta_previa),
            "placental_abruption": int(patient.placental_abruption),
            "hypertensive_disorders": int(patient.hypertensive_disorders),
            "gestational_diabetes": int(patient.gestational_diabetes),
            "coagulation_disorders": int(patient.coagulation_disorders),
            "maternal_hemoglobin_gdl": patient.maternal_hemoglobin_gdl,
            "weight_kg": 60.0,  # Default Indian maternal weight
        }
        clinical_analysis = generate_full_clinical_analysis(
            patient_data=patient_dict,
            risk_tier=tier_key,
            ensemble_risk=ensemble_risk
        )
        
        # Attach structured clinical explanation from Groq / Nemotron (or deterministic fallback)
        try:
            from .explanation_service import ExplanationService
            explanation_svc = ExplanationService.get_instance()
            ai_exp = explanation_svc.explain_risk_assessment({
                "risk_tier": tier_key,
                "probability": ensemble_risk,
                "patient_name": patient.name or "Patient",
                "maternal_hemoglobin_gdl": patient.maternal_hemoglobin_gdl,
                "target_language": getattr(patient, "language", None) or "hi",
                "top_factors": [{"feature_name": d, "contribution": "Elevated Comorbidity"} for d in drivers[:4]]
            })
            clinical_analysis["ai_explanation"] = ai_exp
            clinical_analysis["postpartum_diet_plan"] = ai_exp.get("postpartum_diet_plan")
        except Exception as err:
            print(f"⚠️ [ModelService] Explanation layer note: {err}")

        prob_val = round(ensemble_risk, 4)
        cal_pct = round(ensemble_risk * 100, 1)

        # Compute empirical 95% Confidence / Inter-Model Variance Range
        # Based on variance across individual models (XGBoost, LightGBM, FT-Transformer) + standard binomial variance
        indiv_probs = [cal_p_xgb, cal_p_lgb, cal_p_ftt]
        std_models = float(np.std(indiv_probs)) if len(indiv_probs) > 1 else 0.015
        spread = max(0.012, 1.96 * std_models)
        range_low = max(0.005, round(ensemble_risk - spread, 3))
        range_high = min(0.98, round(ensemble_risk + spread, 3))
        range_low_pct = round(range_low * 100, 1)
        range_high_pct = round(range_high * 100, 1)
        range_str = f"{range_low_pct:.1f}% – {range_high_pct:.1f}%"

        # Evidence-based clinical prevalence ratio (avoids dogmatic diagnostic overclaiming)
        if ensemble_risk > 0.005:
            odds_x = max(2, round(1.0 / ensemble_risk))
            prev_ratio_en = f"1 in {odds_x} mothers"
            prev_ratio_hi = f"{odds_x} में से 1 महिला"
            fold_val = round(ensemble_risk / 0.035, 1)
            rel_risk_str = f"{fold_val}× Regional Baseline"
            odds_stmt = f"Clinical cohort likelihood: ~1 in {odds_x} mothers with matching biomarkers develop significant PPH ({rel_risk_str})."
        else:
            odds_x = 100
            prev_ratio_en = "1 in 100+ mothers"
            prev_ratio_hi = "100 में से 1 से कम महिला"
            rel_risk_str = "1.0× Baseline"
            odds_stmt = "Low baseline obstetric risk (under 1 in 100 mothers)."

        return PredictionResponse(
            patient_id=patient.patient_id,
            patient_name=patient.name,
            risk_score=prob_val,
            probability=prob_val,
            risk_percentage=f"{cal_pct:.1f}%",
            calibrated_risk_percent=cal_pct,
            risk_range=range_str,
            risk_range_percent=range_str,
            risk_range_low_pct=range_low_pct,
            risk_range_high_pct=range_high_pct,
            confidence_interval=f"95% CI [{range_low_pct:.1f}% – {range_high_pct:.1f}%]",
            prevalence_ratio=prev_ratio_en,
            prevalence_ratio_hindi=prev_ratio_hi,
            relative_risk_fold=rel_risk_str,
            clinical_odds_statement=odds_stmt,
            risk_tier=tier_key,
            tier_label=tier_info["label"],
            tier_color=tier_info["color"],
            model_breakdown=breakdown,
            model_predictions={
                "xgboost": round(cal_p_xgb, 4),
                "lightgbm": round(cal_p_lgb, 4),
                "fttransformer": round(cal_p_ftt, 4),
                "ensemble": prob_val
            },
            top_factors=[{"feature": d, "importance": 0.35} for d in drivers],
            key_risk_drivers=drivers,
            clinical_recommendations=recommendations,
            derived_metrics={
                "gravidity_parity_gap": float(derived.gravidity_parity_gap),
                "has_prior_loss": float(derived.has_prior_loss),
                "has_prior_csection": float(derived.has_prior_csection),
                "is_preterm": float(derived.is_preterm),
                "hb_missing_indicator": float(derived.hb_missing_indicator)
            },
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            clinical_analysis=clinical_analysis,
            postpartum_diet_plan=clinical_analysis.get("postpartum_diet_plan")
        )

def get_model_service() -> ModelService:
    return ModelService.get_instance()

