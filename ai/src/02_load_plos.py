"""
Script 02 — Load & Clean PLOS ONE Cohort
Primary labeled dataset: 56,014 deliveries, 2,016 PPH cases (3.60% incidence).
- Drops all leakage columns immediately and logs them.
- Renames columns to canonical spec names.
- Saves cleaned data to data/processed/plos_cleaned.parquet
- Saves reports/leakage_columns_dropped.csv
"""
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW  = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
PROC.mkdir(parents=True, exist_ok=True)
REP.mkdir(parents=True, exist_ok=True)

SEED = 42

print("=" * 60)
print("STEP 02 — Load & Clean PLOS ONE Obstetric Cohort")
print("=" * 60)

# ── Load raw data ────────────────────────────────────────────
xlsx_path = RAW / "pone.0323190.s002.xlsx"
print(f"Loading {xlsx_path.name} ...")
df_raw = pd.read_excel(xlsx_path)
print(f"  Raw shape: {df_raw.shape}")

# ── Column mapping from PLOS names → canonical spec names ────
COL_MAP = {
    "Number of pregnancies":               "gravidity",
    "Parity":                               "parity",
    "Number of prenatal checkups":          "prenatal_visits",
    "Number of previous cesarean sections": "prior_csections",
    " history of cesarean section":         "_history_cs",   # aux
    "Gestational age":                      "gestational_age",
    "Whether multiple births":              "multiple_births",
    "Macrosomia":                           "macrosomia",
    "Placenta previa":                      "placenta_previa",
    "Placental abruption":                  "placental_abruption",
    "hypertensive disorders of pregnancy":  "hypertensive_disorders",
    "gestational diabetes":                 "gestational_diabetes",
    "Coagulation disorders":                "coagulation_disorders",
    "Postpartum hemorrhage":                "pph_label",
    # Leakage columns (will be dropped BEFORE any processing)
    "Uterine atony":                        "LEAKAGE_uterine_atony",
    "Retained placenta":                    "LEAKAGE_retained_placenta",
    "Soft birth canal laceration":          "LEAKAGE_soft_canal_laceration",
    "Maternal Near-Miss":                   "LEAKAGE_maternal_near_miss",
    # Other columns kept for reference
    "Id":                                   "record_id",
    "Year":                                 "year",
    "Education level":                      "education_level",
    "Location of termination of pregnancy": "delivery_location",
    "Mode of delivery":                     "mode_of_delivery",
    "Number of fetuses":                    "n_fetuses",
    "Uterine rupture":                      "uterine_rupture",
    "pregnancy-associated cardiac diseases":"cardiac_disease",
    "embolism":                             "embolism",
    "Thromboembolism":                      "thromboembolism",
    "Amniotic fluid embolism":              "afe",
    "Air embolism":                         "air_embolism",
    "pregnancy-associated liver diseases":  "liver_disease",
    "Maternal vital status at discharge":   "maternal_vital_status",
}

# Rename what we have
rename_existing = {k: v for k, v in COL_MAP.items() if k in df_raw.columns}
df = df_raw.rename(columns=rename_existing)

# ── Drop LEAKAGE columns IMMEDIATELY ─────────────────────────
leakage_cols = [c for c in df.columns if c.startswith("LEAKAGE_")]
leakage_orig = [k for k, v in COL_MAP.items() if v.startswith("LEAKAGE_") and k in df_raw.columns]

print(f"\nLeakage columns found ({len(leakage_cols)}): {leakage_cols}")
df.drop(columns=leakage_cols, inplace=True)

# Save leakage log
leakage_df = pd.DataFrame({
    "original_column_name": leakage_orig,
    "canonical_name":        leakage_cols,
    "reason":                "outcome leakage — would not be known at admission time",
})
leakage_path = REP / "leakage_columns_dropped.csv"
leakage_df.to_csv(leakage_path, index=False)
print(f"Saved: {leakage_path}")

# ── Drop newborn-level columns (not antepartum) ───────────────
nb_cols = [c for c in df.columns if "newborn" in c.lower() or "apgar" in c.lower()
           or "birth status" in c.lower() or "health status of newborn" in c.lower()]
df.drop(columns=[c for c in nb_cols if c in df.columns], inplace=True, errors="ignore")

# ── Clean / coerce key feature columns ───────────────────────
# gestational_age: keep as numeric weeks
df["gestational_age"] = pd.to_numeric(df["gestational_age"], errors="coerce")

# gravidity, parity — ensure integer
for col in ["gravidity", "parity", "prenatal_visits", "prior_csections"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Binary columns: ensure 0/1
binary_cols = [
    "multiple_births", "macrosomia", "placenta_previa", "placental_abruption",
    "hypertensive_disorders", "gestational_diabetes", "coagulation_disorders",
    "pph_label"
]
for col in binary_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int8")

# ── Log outcome balance ───────────────────────────────────────
n_total = len(df)
n_pph   = int(df["pph_label"].sum())
pct_pph = n_pph / n_total * 100
print(f"\nDataset: {n_total:,} rows | PPH positives: {n_pph:,} ({pct_pph:.2f}%)")

# ── Save ──────────────────────────────────────────────────────
out_path = PROC / "plos_cleaned.parquet"
df.to_parquet(out_path, index=False)
print(f"Saved: {out_path}  shape={df.shape}")

print("\n[DONE] 02_load_plos.py")
