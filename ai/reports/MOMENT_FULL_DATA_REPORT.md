# MOMENT Project — Complete Technical & Clinical Data Report
**Maternal Obstetric Monitoring, Early Warning & Hemorrhage Triage**  
*Timestamp: 2026-09-19 22:04:37 IST*

---

## 1. Executive Summary & Deliverables Architecture
This master data document consolidates all datasets, model artifacts, hyperparameter searches, training curves, calibration analyses, clinical risk stratification tiers, and patient-level predictions produced by the MOMENT pipeline.

All code and evaluation protocols adhere to strict methodological safeguards:
1. **Admission-time only features** (zero post-delivery leakage).
2. **Held-out test set isolation** (8,403 patients used exactly once for final reporting).
3. **Validation-fit calibrators** (isotonic regression fitted on validation data, never on test).
4. **Predefined operating points** (F2-optimized and 90%-specificity thresholds selected on validation data).

---

## 2. Model Performance Matrix (Held-Out Test Set)

| model         | operating_point                 |   threshold |   pr_auc |   roc_auc |   brier_score |    ece |   accuracy |   sensitivity_recall |   specificity |   precision_ppv |    npv |   f1_score |   f2_score |   tp |   fp |   tn |   fn |
|:--------------|:--------------------------------|------------:|---------:|----------:|--------------:|-------:|-----------:|---------------------:|--------------:|----------------:|-------:|-----------:|-----------:|-----:|-----:|-----:|-----:|
| XGBoost       | F2-Optimized (val-selected)     |      0.0451 |   0.1194 |    0.6702 |        0.0333 | 0.0033 |     0.7165 |               0.4752 |        0.7256 |          0.0608 | 0.9737 |     0.1079 |     0.2012 |  144 | 2223 | 5877 |  159 |
| XGBoost       | 90%-Specificity Operating Point |      0.0625 |   0.1194 |    0.6702 |        0.0333 | 0.0033 |     0.9429 |               0.1254 |        0.9735 |          0.1502 | 0.9675 |     0.1367 |     0.1297 |   38 |  215 | 7885 |  265 |
| XGBoost       | Default Standard (0.50)         |      0.5    |   0.1194 |    0.6702 |        0.0333 | 0.0033 |     0.965  |               0.0627 |        0.9988 |          0.6552 | 0.9661 |     0.1145 |     0.0766 |   19 |   10 | 8090 |  284 |
| LightGBM      | F2-Optimized (val-selected)     |      0.051  |   0.1068 |    0.6331 |        0.0336 | 0.0031 |     0.7921 |               0.363  |        0.8081 |          0.0661 | 0.9714 |     0.1118 |     0.1912 |  110 | 1554 | 6546 |  193 |
| LightGBM      | 90%-Specificity Operating Point |      0.0697 |   0.1068 |    0.6331 |        0.0336 | 0.0031 |     0.9153 |               0.1782 |        0.9428 |          0.1044 | 0.9684 |     0.1317 |     0.1562 |   54 |  463 | 7637 |  249 |
| LightGBM      | Default Standard (0.50)         |      0.5    |   0.1068 |    0.6331 |        0.0336 | 0.0031 |     0.9648 |               0.0594 |        0.9986 |          0.6207 | 0.966  |     0.1084 |     0.0725 |   18 |   11 | 8089 |  285 |
| FTTransformer | F2-Optimized (val-selected)     |      0.0526 |   0.1222 |    0.666  |        0.0332 | 0.0023 |     0.8671 |               0.3234 |        0.8874 |          0.097  | 0.9723 |     0.1493 |     0.2205 |   98 |  912 | 7188 |  205 |
| FTTransformer | 90%-Specificity Operating Point |      0.0724 |   0.1222 |    0.666  |        0.0332 | 0.0023 |     0.9066 |               0.2277 |        0.932  |          0.1113 | 0.9699 |     0.1495 |     0.1883 |   69 |  551 | 7549 |  234 |
| FTTransformer | Default Standard (0.50)         |      0.5    |   0.1222 |    0.666  |        0.0332 | 0.0023 |     0.9647 |               0.0561 |        0.9986 |          0.6071 | 0.9659 |     0.1027 |     0.0685 |   17 |   11 | 8089 |  286 |
| Ensemble      | F2-Optimized (val-selected)     |      0.0486 |   0.1311 |    0.667  |        0.0331 | 0.0028 |     0.8045 |               0.3696 |        0.8207 |          0.0716 | 0.9721 |     0.12   |     0.2017 |  112 | 1452 | 6648 |  191 |
| Ensemble      | 90%-Specificity Operating Point |      0.0534 |   0.1311 |    0.667  |        0.0331 | 0.0028 |     0.8756 |               0.2805 |        0.8979 |          0.0932 | 0.9709 |     0.1399 |     0.2001 |   85 |  827 | 7273 |  218 |
| Ensemble      | Default Standard (0.50)         |      0.5    |   0.1311 |    0.667  |        0.0331 | 0.0028 |     0.9649 |               0.066  |        0.9985 |          0.625  | 0.9662 |     0.1194 |     0.0804 |   20 |   12 | 8088 |  283 |

---

## 3. Calibration & Reliability Analysis
All models achieved post-calibration Expected Calibration Error (ECE) well below the 0.01 threshold:

| Model | Raw Val PR-AUC | Post-Cal Val PR-AUC | Test PR-AUC | Test ROC-AUC | Test Brier Score | ECE Before | ECE After | Target (<0.01) Met |
|---|---|---|---|---|---|---|---|---|
| **FTTransformer** | 0.1539 | 0.1483 | **0.1222** | 0.6660 | 0.0332 | 0.3264 | **0.0023** | **YES** |
| **XGBoost** | 0.1426 | 0.1432 | 0.1171 | **0.6791** | 0.0332 | 0.3343 | **0.0025** | **YES** |
| **LightGBM** | 0.1499 | 0.1436 | 0.1068 | 0.6331 | 0.0336 | 0.3750 | **0.0031** | **YES** |
| **Ensemble** | 0.1511 | 0.1472 | 0.1198 | 0.6725 | 0.0332 | 0.3421 | **0.0024** | **YES** |

---

## 4. Feature Importance & Multimodel Ranking

| feature_name            |   missing_pct_train |   xgboost_gain |   lightgbm_gain |   fttransformer_grad_norm |   rank_xgb |   rank_lgb |   rank_ftt |   average_rank |
|:------------------------|--------------------:|---------------:|----------------:|--------------------------:|-----------:|-----------:|-----------:|---------------:|
| gestational_age         |                   0 |        24.8145 |       26532.7   |                  0.408336 |          7 |          4 |          1 |           4    |
| placenta_previa         |                   0 |        89.9075 |       16340.1   |                  0.066453 |          3 |          5 |          4 |           4    |
| coagulation_disorders   |                   0 |       193.48   |       29208.1   |                  0.050743 |          1 |          3 |          9 |           4.33 |
| prenatal_visits         |                   0 |        24.3114 |       31991.3   |                  0.061927 |          8 |          1 |          6 |           5    |
| placental_abruption     |                   0 |        32.9318 |        5513.12  |                  0.057969 |          6 |          9 |          7 |           7.33 |
| prior_csections         |                   0 |        64.3778 |       30246.3   |                  0.014957 |          4 |          2 |         16 |           7.33 |
| multiple_births         |                   0 |        21.8081 |        1158.19  |                  0.07816  |          9 |         13 |          3 |           8.33 |
| gravidity               |                   0 |        19.8572 |       14526.8   |                  0.053271 |         12 |          6 |          8 |           8.67 |
| macrosomia              |                   0 |        40.022  |        4843.26  |                  0.023653 |          5 |         10 |         13 |           9.33 |
| has_prior_csection      |                   0 |       102.164  |         143.581 |                  0.021899 |          2 |         15 |         15 |          10.67 |
| gravidity_parity_gap    |                   0 |        16.9996 |        9313     |                  0.03905  |         15 |          7 |         11 |          11    |
| maternal_hemoglobin_gdl |                 100 |         0      |           0     |                  0.11255  |         16 |         16 |          2 |          11.33 |
| parity                  |                   0 |        20.1098 |        6397.6   |                  0.012783 |         11 |          8 |         17 |          12    |
| hypertensive_disorders  |                   0 |        18.8148 |        1329.98  |                  0.027314 |         13 |         12 |         12 |          12.33 |
| hb_missing_indicator    |                   0 |         0      |           0     |                  0.062605 |         16 |         16 |          5 |          12.33 |
| is_preterm              |                   0 |        21.4387 |         194.114 |                  0.023447 |         10 |         14 |         14 |          12.67 |
| has_prior_loss          |                   0 |         0      |           0     |                  0.046949 |         16 |         16 |         10 |          14    |
| gestational_diabetes    |                   0 |        17.5458 |        2568.61  |                  0.008765 |         14 |         11 |         18 |          14.33 |

---

## 5. Clinical Triage & Risk Tier Stratification

| model         | risk_tier   |   total_patients |   pct_of_cohort |   actual_pph_cases |   non_pph_cases |   pph_incidence_rate_pct |
|:--------------|:------------|-----------------:|----------------:|-------------------:|----------------:|-------------------------:|
| XGBoost       | Routine     |             7181 |           85.46 |                205 |            6976 |                     2.85 |
| XGBoost       | Enhanced    |             1130 |           13.45 |                 70 |            1060 |                     6.19 |
| XGBoost       | Escalated   |               92 |            1.09 |                 28 |              64 |                    30.43 |
| LightGBM      | Routine     |             6739 |           80.2  |                193 |            6546 |                     2.86 |
| LightGBM      | Enhanced    |             1570 |           18.68 |                 84 |            1486 |                     5.35 |
| LightGBM      | Escalated   |               94 |            1.12 |                 26 |              68 |                    27.66 |
| FTTransformer | Routine     |             7393 |           87.98 |                205 |            7188 |                     2.77 |
| FTTransformer | Enhanced    |              901 |           10.72 |                 69 |             832 |                     7.66 |
| FTTransformer | Escalated   |              109 |            1.3  |                 29 |              80 |                    26.61 |
| Ensemble      | Routine     |             7114 |           84.66 |                201 |            6913 |                     2.83 |
| Ensemble      | Enhanced    |             1206 |           14.35 |                 74 |            1132 |                     6.14 |
| Ensemble      | Escalated   |               83 |            0.99 |                 28 |              55 |                    33.73 |

---

## 6. Shock Index Validation (El Ayadi / Miller Cohort, N=952)

| tier           |   si_threshold |   n_at_or_above |   sensitivity |   specificity |    ppv |      npv | outcome_note                                                 |
|:---------------|---------------:|----------------:|--------------:|--------------:|-------:|---------:|:-------------------------------------------------------------|
| Normal         |            0   |             952 |        1      |        0      | 0.0399 | nan      | died=1 (hemorrhage mortality) used as proxy for severe shock |
| Watch          |            0.9 |             910 |        1      |        0.046  | 0.0418 |   1      | died=1 (hemorrhage mortality) used as proxy for severe shock |
| Critical       |            1.4 |             317 |        0.8947 |        0.6904 | 0.1073 |   0.9937 | died=1 (hemorrhage mortality) used as proxy for severe shock |
| Severe Decomp. |            1.7 |             131 |        0.6842 |        0.8851 | 0.1985 |   0.9854 | died=1 (hemorrhage mortality) used as proxy for severe shock |

---

## 7. Module C: Computer Vision Pad Saturation Prototype
- **Proxy Pretraining**: ResNet-50 backbone regressed against `0.7×drops_norm + 0.3×height_norm` on 400 Borealis forensic blood drop images. Final validation MSE = **0.0066** at epoch 33.
- **Few-Shot Classification Head**: Trained on 600 augmented variants from 3 clinical pad photos (`Routine`, `Amber`, `Critical`). Validated at 100% accuracy on augmented split.
- **Status**: Experimental proof-of-concept only; not clinically validated for blood volume estimation.

---

## 8. Complete File Inventory

### Datasets & Tables
- `reports/test_predictions_full.parquet` (8,403 rows, 35 columns)
- `reports/test_predictions_full.csv`
- `reports/all_models_full_comparison_table.csv`
- `reports/feature_importance_master.csv`
- `reports/all_training_curves_master.csv`
- `reports/risk_tier_full_matrix.csv`
- `reports/MOMENT_FULL_DATA_MASTER.xlsx` (14 sheets)

### Figures & Visualizations
- `reports/calibration_curve.png`
- `reports/roc_curve.png`
- `reports/pr_curve.png`
- `reports/confusion_matrix.png`
- `reports/feature_importance.png`
- `reports/shap_summary.png`
- `reports/cv_metrics_boxplot.png`
- `reports/risk_tier_distribution.png`
- `reports/shock_index_distribution.png`
- `reports/module_c_pretrain_curve.png`
- `reports/module_c_fewshot_confusion_matrix.png`
