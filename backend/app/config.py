from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
AI_DIR = ROOT_DIR / "ai"
MODELS_DIR = AI_DIR / "models"
DATA_DIR = AI_DIR / "data" / "processed"
REPORTS_DIR = AI_DIR / "reports"
PHOTOS_DIR = AI_DIR / "data" / "clinical_test_pad_photos"

# Automatically load root .env into os.environ
import os
env_file = ROOT_DIR / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

# Feature ordering expected by tabular models
FEATURE_NAMES = [
    "gravidity",
    "parity",
    "prenatal_visits",
    "prior_csections",
    "gestational_age",
    "multiple_births",
    "macrosomia",
    "placenta_previa",
    "placental_abruption",
    "hypertensive_disorders",
    "gestational_diabetes",
    "coagulation_disorders",
    "gravidity_parity_gap",
    "has_prior_loss",
    "has_prior_csection",
    "is_preterm",
    "maternal_hemoglobin_gdl",
    "hb_missing_indicator"
]

# Clinical Risk Tiers (Antepartum)
RISK_TIERS = {
    "ROUTINE": {
        "label": "Routine Monitoring",
        "threshold_max": 0.05,
        "color": "#10b981",  # Green
        "description": "Baseline expected hemorrhage risk (<5%). Standard protocol."
    },
    "ENHANCED": {
        "label": "Enhanced Vigilance",
        "threshold_min": 0.05,
        "threshold_max": 0.15,
        "color": "#f59e0b",  # Amber
        "description": "Elevated hemorrhage risk (5% - 15%). Active third-stage management recommended."
    },
    "ESCALATED": {
        "label": "Escalated Critical Care",
        "threshold_min": 0.15,
        "color": "#ef4444",  # Red
        "description": "High hemorrhage probability (≥15%). Senior obstetrician standby & blood crossmatch mandatory."
    }
}

# Shock Index Clinical Tiers (HR / SBP)
SHOCK_INDEX_TIERS = [
    {
        "name": "Normal",
        "min": 0.0,
        "max": 0.90,
        "color": "#10b981",
        "status": "Stable hemodynamics",
        "action": "Routine vitals monitoring every 15-30 minutes."
    },
    {
        "name": "Watch",
        "min": 0.90,
        "max": 1.40,
        "color": "#f59e0b",
        "status": "Impending hemodynamic decompensation",
        "action": "Increase vitals frequency to every 5 mins. Alert attending midwife & prepare IV access."
    },
    {
        "name": "Critical",
        "min": 1.40,
        "max": 1.70,
        "color": "#ea580c",
        "status": "Severe decompensation & hypovolemic shock",
        "action": "Trigger Obstetric Rapid Response Team. Rapid IV fluid bolus, prepare blood products."
    },
    {
        "name": "Severe Decompensation",
        "min": 1.70,
        "max": 99.0,
        "color": "#dc2626",
        "status": "Critical cardiovascular collapse / impending arrest",
        "action": "Immediate Massive Transfusion Protocol (MTP), apply NASG (Non-pneumatic Anti-Shock Garment), emergency surgical intervention."
    }
]

# Vision Classes for Pad Saturation
VISION_CLASSES = {
    0: {
        "name": "Routine",
        "color": "#10b981",
        "badge": "Routine Lochia",
        "action": "Normal physiological lochia. Continue routine postpartum checks."
    },
    1: {
        "name": "Amber",
        "color": "#f59e0b",
        "badge": "Elevated Bleeding (Watch)",
        "action": "Moderate saturation. Perform fundal uterine massage, check bladder emptying, assess oxytocin administration."
    },
    2: {
        "name": "Critical",
        "color": "#dc2626",
        "badge": "Severe Hemorrhage Alert",
        "action": "Heavy saturation indicative of active PPH. Initiate emergency medical/surgical uterotonic protocol immediately."
    }
}
