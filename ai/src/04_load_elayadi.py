"""
Script 04 — Load El Ayadi/Miller Shock Index Cohort
Extracts the obstetric hemorrhage dataset (n=958) for Shock Index validation.
Columns: pt_id, age, gravida, para, wks_preg, bl_est_ent, loc_ent, dx_cat,
         si (shock index), sys (SBP), dia (DBP), pul (HR/pulse), map, pulpres,
         died, smo, smo_ci
"""
import pandas as pd
import numpy as np
import zipfile
import tempfile
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW  = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
PROC.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("STEP 04 — Load El Ayadi/Miller Shock Index Cohort")
print("=" * 60)

ZIP_PATH = RAW / "elayadi_miller" / "ElAyadiMiller_PLoSOneSIPaper.dta"
ZIP_ORIG = RAW / "doi_10_7272_Q6MS3QNX__v20160201.zip"

if ZIP_PATH.exists():
    df = pd.read_stata(str(ZIP_PATH))
else:
    # Extract from zip
    print("Extracting from zip ...")
    with zipfile.ZipFile(ZIP_ORIG, "r") as zf:
        with zf.open("ElAyadiMiller_PLoSOneSIPaper.dta") as f:
            data = f.read()
    with tempfile.NamedTemporaryFile(suffix=".dta", delete=False) as tmp:
        tmp.write(data)
        tmppath = tmp.name
    df = pd.read_stata(tmppath)
    os.unlink(tmppath)

print(f"  Shape: {df.shape}")
print(f"  Columns: {list(df.columns)}")

# ── Compute / validate Shock Index ──────────────────────────
# The 'si' column is pre-computed. Validate against sys + pul.
df["si_computed"] = df["pul"] / df["sys"]
df["si_diff"] = (df["si"] - df["si_computed"]).abs()
print(f"\n  SI pre-computed vs. HR/SBP — mean abs diff: {df['si_diff'].mean():.4f}")

# ── Outcome: died (severe hemorrhage mortality) ───────────────
print(f"  Outcome 'died': {df['died'].value_counts().to_dict()}")

# Rename for clarity
df = df.rename(columns={
    "gravida":    "gravidity",
    "para":       "parity",
    "wks_preg":   "gestational_age",
    "bl_est_ent": "blood_loss_mL",
    "loc_ent":    "loc_on_entry",
    "dx_cat":     "diagnosis_category",
    "sys":        "sbp",
    "dia":        "dbp",
    "pul":        "heart_rate",
    "map":        "mean_arterial_pressure",
    "pulpres":    "pulse_pressure",
    "smo":        "shock_outcome",
    "smo_ci":     "shock_outcome_ci",
})

# Convert any categorical columns to string to avoid pyarrow serialization errors
for col in df.select_dtypes(include="category").columns:
    df[col] = df[col].astype(str)

# Save
out_path = PROC / "elayadi_miller.parquet"
df.to_parquet(out_path, index=False)
print(f"\nSaved: {out_path}")
print("\n[DONE] 04_load_elayadi.py")
