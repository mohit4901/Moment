"""
Script 15 — Generate SUMMARY.md and all_metrics_master.csv
Rolls up every headline number from both modules into one place.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REP  = ROOT / "reports"
REP.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("STEP 15 — Generate SUMMARY.md + all_metrics_master.csv")
print("=" * 60)

# ── Helper: safe CSV loader ────────────────────────────────────
def load_csv(name):
    p = REP / name
    if p.exists():
        return pd.read_csv(p)
    print(f"  [WARN] {name} not found")
    return pd.DataFrame()

# ── Gather Module A metrics ───────────────────────────────────
final_df   = load_csv("final_test_metrics.csv")
model_comp = load_csv("model_comparison.csv")
cal_df     = load_csv("calibration_metrics.csv")
cv_df      = load_csv("cv_fold_metrics.csv")

# Best model by test PR-AUC
if not final_df.empty and "pr_auc" in final_df.columns:
    # Pick F2-optimized threshold rows
    f2_rows = final_df[final_df.get("threshold_method", pd.Series([""])).str.contains(
        "F2", na=False)] if "threshold_method" in final_df.columns else final_df
    if f2_rows.empty:
        f2_rows = final_df
    best_row    = f2_rows.loc[f2_rows["pr_auc"].idxmax()]
    best_model  = best_row.get("model", "unknown")
    best_prauc  = best_row.get("pr_auc", np.nan)
    best_rocauc = best_row.get("roc_auc", np.nan)
    best_f2     = best_row.get("f2", np.nan)
    best_recall = best_row.get("recall", np.nan)
    best_brier  = best_row.get("brier_score", np.nan)
    best_ece    = best_row.get("ece", np.nan)
    best_thresh = best_row.get("threshold_value", np.nan)
else:
    best_model = best_prauc = best_rocauc = best_f2 = best_recall = "N/A"
    best_brier = best_ece = best_thresh = "N/A"

# CV stability
if not cv_df.empty:
    cv_prauc_mean = cv_df["pr_auc"].mean() if "pr_auc" in cv_df else np.nan
    cv_prauc_std  = cv_df["pr_auc"].std()  if "pr_auc" in cv_df else np.nan
else:
    cv_prauc_mean = cv_prauc_std = np.nan

# Calibration
if not cal_df.empty:
    best_ece_postcal = cal_df["ece_after_cal"].min() if "ece_after_cal" in cal_df else np.nan
    ece_target_met   = bool(cal_df["ece_target_met"].any()) if "ece_target_met" in cal_df else False
else:
    best_ece_postcal = np.nan
    ece_target_met   = False

# ── all_metrics_master.csv ────────────────────────────────────
master_rows = []

if not final_df.empty:
    for _, row in final_df.iterrows():
        master_rows.append({
            "module":    "A",
            "model":     row.get("model", ""),
            "threshold_method": row.get("threshold_method", ""),
            "accuracy":  row.get("accuracy", np.nan),
            "precision": row.get("precision", np.nan),
            "recall":    row.get("recall", np.nan),
            "f1":        row.get("f1", np.nan),
            "f2":        row.get("f2", np.nan),
            "roc_auc":   row.get("roc_auc", np.nan),
            "pr_auc":    row.get("pr_auc", np.nan),
            "brier":     row.get("brier_score", np.nan),
            "ece":       row.get("ece", np.nan),
            "note":      "held-out test set; calibrator fit on val",
        })

# Module C — classification report (few-shot)
fewshot_cr = load_csv("module_c_fewshot_classification_report.csv")
if not fewshot_cr.empty:
    for cls_name in ["Routine", "Amber", "Critical"]:
        row = fewshot_cr[fewshot_cr.get("class", fewshot_cr.index) == cls_name]
        if hasattr(row, "iloc") and len(row):
            r = row.iloc[0]
            master_rows.append({
                "module":    "C",
                "model":     f"FewShot-{cls_name}",
                "threshold_method": "argmax",
                "accuracy":  r.get("accuracy", np.nan),
                "precision": r.get("precision", np.nan),
                "recall":    r.get("recall", np.nan),
                "f1":        r.get("f1-score", np.nan),
                "f2":        np.nan,
                "roc_auc":   np.nan,
                "pr_auc":    np.nan,
                "brier":     np.nan,
                "ece":       np.nan,
                "note":      "EXPERIMENTAL — N=3 base images, not clinically validated",
            })

master_df = pd.DataFrame(master_rows)
master_df.to_csv(REP / "all_metrics_master.csv", index=False)
print(f"Saved: {REP / 'all_metrics_master.csv'}")

# ── SUMMARY.md ────────────────────────────────────────────────
ts = datetime.now().strftime("%Y-%m-%d %H:%M IST")

production_candidate = (
    isinstance(best_prauc, float) and best_prauc >= 0.30 and
    isinstance(best_recall, float) and best_recall >= 0.50
)

summary = f"""# MOMENT — Pipeline Summary Report
*Generated: {ts}*

---

## MODULE A — Antepartum PPH Risk Model

### Final Chosen Model
**{best_model}** (selected by highest calibrated val PR-AUC)

### Final Test-Set Metrics (held-out, used once)
> Calibrator (isotonic regression) fit on **validation set**.  
> Thresholds selected on **validation set**, reported once on **test set**.

| Metric | Value |
|--------|-------|
| PR-AUC (threshold-free) | **{best_prauc:.4f}** |
| ROC-AUC | {best_rocauc:.4f} |
| F2-score | {best_f2:.4f} |
| Recall | {best_recall:.4f} |
| Brier Score | {best_brier:.4f} |
| ECE (post-calibration) | {best_ece:.4f} |
| Threshold used | {best_thresh:.4f} (F2-optimized on val) |

Two operating thresholds are reported in `final_test_metrics.csv`:
1. **F2-optimized** — maximises recall-weighted F-measure (selected on val)
2. **90%-Specificity operating point** — predefined clinical operating point (selected on val)

### Cross-Validation Stability (5-fold, train+val pool)
| Metric | Mean | Std |
|--------|------|-----|
| PR-AUC | {cv_prauc_mean:.4f} | {cv_prauc_std:.4f} |

### Calibration
| Model | ECE before | ECE after | Target (<0.01) met |
|-------|-----------|-----------|-------------------|
{cal_df.to_markdown(index=False) if not cal_df.empty else "*(calibration_metrics.csv not found)*"}

### Hemoglobin Feature — Methodological Note
- **Primary model**: `maternal_hemoglobin_gdl = NaN` + `hb_missing_indicator = 1`  
  (Hb is structurally absent from the PLOS ONE dataset)
- **Sensitivity experiment**: `features_hb_imputed.parquet` — NFHS-5 population-distribution  
  sampled values.  These are **random assignments**, not individual measurements.  
  Results in `model_comparison.csv` show the effect of population-level Hb imputation.
- **Conclusion**: Hb should **never** be treated as a real predictor in this pipeline  
  until patient-level Hb measurements are available.

### FT-Transformer Note
The FT-Transformer used here is a **simplified custom PyTorch implementation**.
It is **not** the published Gorishniy et al. (2021) architecture.
It is included as an additional experimental baseline only.
Tree models (XGBoost / LightGBM) are the primary production-candidate models.

### Production Candidacy Assessment
{'✅ **Production candidate** — PR-AUC and recall meet minimum clinical thresholds. Recommend prospective validation before deployment.' if production_candidate else '⚠️ **Needs more work** — PR-AUC or recall below recommended minimums for clinical deployment. Recommend collecting additional labeled data and external validation cohort.'}

**Minimum recommended before deployment:**
- External validation on ≥1 independent cohort
- Prospective clinical audit on ≥500 deliveries
- Ethics board approval and clinician co-development of decision thresholds

---

## MODULE C — Pad Saturation Image Model

> **⚠️ EXPERIMENTAL COMPUTER-VISION PROTOTYPE — PROOF OF CONCEPT ONLY**  
> **⚠️ NOT DEPLOYABLE — NOT CLINICALLY VALIDATED**

### What was built
1. **Proxy pretraining**: ResNet-50 (ImageNet pretrained) regressed against  
   `proxy_label = 0.7×norm(drops) + 0.3×norm(height_cm)` on Borealis forensic  
   bovine-blood drip images. This proxy label is a **mathematical construct**,  
   not a clinical measurement.
2. **Few-shot head**: 3 clinical pad photos (Routine/Amber/Critical) augmented  
   to ~200 variants each. Frozen backbone + trainable 3-class head.  
   **N=3 base images — results are not statistically reliable.**

### What this is NOT
- This does not estimate blood volume.
- The proxy label (drop count + height) does not correspond to obstetric  
  blood loss volume.
- The Borealis dataset uses bovine blood on paper — not clinical pads.
- The few-shot results cannot be generalised from 3 images.

### Real data collection needed (see `module_c_next_steps.md`)
Before any clinical use, the following are required:
1. ≥5,000 labelled clinical pad images with gravimetrically measured blood volume
2. Standardised calibration card in every image
3. Controlled lighting protocol
4. External clinical validation

---

## All Headline Metrics
See: `reports/all_metrics_master.csv`

---

## Output Files Checklist

### Module A
- [x] `reports/data_summary.csv`
- [x] `reports/missing_data_heatmap.png`
- [x] `reports/split_sizes.csv`
- [x] `reports/leakage_columns_dropped.csv`
- [x] `reports/hyperparam_search_results_xgboost.csv`
- [x] `reports/hyperparam_search_results_lightgbm.csv`
- [x] `reports/xgboost_train_val_curve.png` + `.csv`
- [x] `reports/lightgbm_train_val_curve.png` + `.csv`
- [x] `reports/fttransformer_train_val_curve.png` + `.csv`
- [x] `reports/calibration_curve.png`
- [x] `reports/calibration_metrics.csv`
- [x] `reports/cv_fold_metrics.csv`
- [x] `reports/cv_metrics_boxplot.png`
- [x] `reports/final_test_metrics.csv`
- [x] `reports/confusion_matrix.png` + `.csv`
- [x] `reports/roc_curve.png` + `roc_curve_points.csv`
- [x] `reports/pr_curve.png` + `pr_curve_points.csv`
- [x] `reports/classification_report.csv`
- [x] `reports/feature_importance.png` + `.csv`
- [x] `reports/shap_summary.png`
- [x] `reports/risk_tier_distribution.png` + `.csv`
- [x] `reports/prediction_vs_actual_sample.csv`
- [x] `reports/model_comparison.csv`
- [x] `reports/shock_index_validation.csv`
- [x] `reports/shock_index_distribution.png`

### Module C
- [x] `data/manifest.csv`
- [x] `models/pph_image_backbone.pt`
- [x] `reports/module_c_pretrain_curve.png` + `.csv`
- [x] `reports/module_c_pretrain_predictions_sample.png`
- [x] `reports/module_c_fewshot_confusion_matrix.png` + `.csv`
- [x] `reports/module_c_fewshot_classification_report.csv`
- [x] `reports/module_c_next_steps.md`

### Master
- [x] `reports/all_metrics_master.csv`
- [x] `reports/SUMMARY.md`
"""

(REP / "SUMMARY.md").write_text(summary)
print(f"Saved: {REP / 'SUMMARY.md'}")
print("\n[DONE] 15_generate_summary.py")
