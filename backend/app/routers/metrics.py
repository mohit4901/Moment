import csv
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from ..config import REPORTS_DIR

router = APIRouter(prefix="/api/metrics", tags=["Model Evaluation & Benchmark Metrics"])

@router.get("/summary", response_model=List[Dict[str, Any]], summary="Get Full Model Comparison Table")
def get_model_summary() -> List[Dict[str, Any]]:
    """
    Returns full evaluation metrics for all models on the held-out test cohort:
    - XGBoost, LightGBM, FT-Transformer, Ensemble
    - Operating points: F2-optimized, 90%-specificity, Default standard
    - PR-AUC, ROC-AUC, ECE, Brier score, Sensitivity/Recall, Specificity, F1, F2
    """
    csv_path = REPORTS_DIR / "all_models_full_comparison_table.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Comparison table report not found on disk.")

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return list(reader)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics table: {str(e)}")


@router.get("/feature-importance", response_model=List[Dict[str, Any]], summary="Get Ranked Clinical Feature Importances")
def get_feature_importances() -> List[Dict[str, Any]]:
    """Returns ranked list of clinical features and their relative importance weights."""
    csv_path = REPORTS_DIR / "feature_importance.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Feature importance report not found.")

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return list(reader)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read feature importances: {str(e)}")

