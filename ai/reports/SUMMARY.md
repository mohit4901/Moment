# MOMENT — Pipeline Summary Report
*Generated: 2026-09-19 22:04 IST*

---

## MODULE A — Antepartum PPH Risk Model

### Final Chosen Model
**FTTransformer** (selected by highest calibrated val PR-AUC)

### Final Test-Set Metrics (held-out, used once)
> Calibrator (isotonic regression) fit on **validation set**.  
> Thresholds selected on **validation set**, reported once on **test set**.

| Metric | Value |
|--------|-------|
| PR-AUC (threshold-free) | **0.1222** |
| ROC-AUC | 0.6660 |
| F2-score | 0.2205 |
| Recall | 0.3234 |
| Brier Score | 0.0332 |
| ECE (post-calibration) | 0.0023 |
| Threshold used | 0.0526 (F2-optimized on val) |

Two operating thresholds are reported in `final_test_metrics.csv`:
1. **F2-optimized** — maximises recall-weighted F-measure (selected on val)
2. **90%-Specificity operating point** — predefined clinical operating point (selected on val)

### Cross-Validation Stability (5-fold, train+val pool)
| Metric | Mean | Std |
|--------|------|-----|
| PR-AUC | 0.1577 | 0.0085 |

### Calibration
| Model | ECE before | ECE after | Target (<0.01) met |
|-------|-----------|-----------|-------------------|
| model         |   brier_before_cal |   brier_after_cal |   ece_before_cal |   ece_after_cal | ece_target_met   | note                                             |
|:--------------|-------------------:|------------------:|-----------------:|----------------:|:-----------------|:-------------------------------------------------|
| XGBoost       |             0.1338 |            0.0333 |           0.2897 |          0.0033 | True             | Calibrator fit on val set; test set is held-out. |
| LightGBM      |             0.215  |            0.0336 |           0.375  |          0.0031 | True             | Calibrator fit on val set; test set is held-out. |
| FTTransformer |             0.1597 |            0.0332 |           0.3264 |          0.0023 | True             | Calibrator fit on val set; test set is held-out. |

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
⚠️ **Needs more work** — PR-AUC or recall below recommended minimums for clinical deployment. Recommend collecting additional labeled data and external validation cohort.

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
