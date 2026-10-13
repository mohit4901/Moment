#!/usr/bin/env bash
# MOMENT — Full Pipeline Runner
# Run from project root: bash run_all.sh
set -e  # exit on first error

SCRIPT_DIR="$(cd "$(dirname "$0")/src" && pwd)"
LOG_DIR="$(cd "$(dirname "$0")" && pwd)/logs"
mkdir -p "$LOG_DIR"

echo "============================================================"
echo " MOMENT — Maternal Obstetric Monitoring ML Pipeline"
echo " Started: $(date)"
echo "============================================================"
echo ""

run_step() {
    local step="$1"
    local script="$2"
    echo "──────────────────────────────────────────────────────────"
    echo " Running: $step"
    echo "──────────────────────────────────────────────────────────"
    python3 "$SCRIPT_DIR/$script" 2>&1 | tee "$LOG_DIR/${script%.py}.log"
    echo ""
    echo " ✅  $step completed"
    echo ""
}

# ── MODULE A: Tabular PPH Risk Model ────────────────────────
run_step "01 Extract archives"                  "01_extract_data.py"
run_step "02 Load & clean PLOS ONE cohort"      "02_load_plos.py"
run_step "03 Load NFHS-5 Hb distribution"       "03_load_nfhs5_hb.py"
run_step "04 Load El Ayadi/Miller cohort"        "04_load_elayadi.py"
run_step "05 Feature engineering"               "05_feature_engineering.py"
run_step "06 Data summary & missingness"         "06_data_summary.py"
run_step "07 Train/val/test split"              "07_split.py"
run_step "08 Train XGBoost (Optuna HPO)"        "08_train_xgboost.py"
run_step "09 Train LightGBM (Optuna HPO)"       "09_train_lightgbm.py"
run_step "10 Train FT-Transformer"              "10_train_fttransformer.py"
run_step "11 Calibrate & evaluate all models"   "11_calibrate_evaluate.py"
run_step "12 Shock Index validation"            "12_shock_index.py"

# ── MODULE C: Image Pretraining Backbone ─────────────────────
run_step "13 Module C: ResNet-50 pretraining"  "13_module_c_pretrain.py"
run_step "14 Module C: Few-shot classifier"    "14_module_c_fewshot.py"

# ── Final summary ────────────────────────────────────────────
run_step "15 Generate SUMMARY.md & master CSV" "15_generate_summary.py"

echo "============================================================"
echo " Pipeline complete: $(date)"
echo " Reports:  $(cd "$(dirname "$0")" && pwd)/reports/"
echo " Models:   $(cd "$(dirname "$0")" && pwd)/models/"
echo " Logs:     $LOG_DIR/"
echo "============================================================"
