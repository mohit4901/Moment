"""
Script 05 — Feature Engineering

Primary model: maternal_hemoglobin_gdl = NaN (all missing).
  A binary hb_missing_indicator = 1 is added for the missing-indicator approach.
  Tree models handle NaN natively; FT-Transformer uses median imputation + indicator.

Sensitivity experiment (separate file): features_hb_imputed.parquet
  Uses NFHS-5 population-distribution sampled values.
  This secondary model is compared against the primary to quantify what effect
  population-level Hb imputation has on model performance — it is NOT claimed
  to represent individual patient measurements.

Derives:
  gravidity_parity_gap, has_prior_loss, has_prior_csection, is_preterm

Saves:
  data/processed/features.parquet           ← primary (Hb=NaN + indicator)
  data/processed/features_hb_imputed.parquet ← sensitivity (NFHS-5 sampled)
  data/processed/feature_list.txt
"""
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"

SEED = 42
rng  = np.random.default_rng(SEED)

print("=" * 60)
print("STEP 05 — Feature Engineering")
print("=" * 60)

# ── Load cleaned PLOS data ────────────────────────────────────
df = pd.read_parquet(PROC / "plos_cleaned.parquet")
print(f"Input shape: {df.shape}")

FEATURES = [
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
]
LABEL = "pph_label"

keep_cols = [c for c in ["record_id"] + FEATURES + [LABEL] if c in df.columns]
df = df[keep_cols].copy()
print(f"After feature selection: {df.shape}")

# ── Coerce numerics ───────────────────────────────────────────
for col in FEATURES:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")

# ── Derived features ──────────────────────────────────────────
df["gravidity_parity_gap"] = (df["gravidity"] - df["parity"]).clip(lower=0)
df["has_prior_loss"]       = (df["gravidity_parity_gap"] > 0).astype("float32")
df["has_prior_csection"]   = (df["prior_csections"].fillna(0) > 0).astype("float32")
df["is_preterm"]           = (df["gestational_age"] < 37).astype("float32")
print("  Derived: gravidity_parity_gap, has_prior_loss, has_prior_csection, is_preterm")

# ── PRIMARY: Hb = NaN + missing indicator ────────────────────
#
# Hemoglobin is NOT available in the PLOS ONE dataset.
# Primary model treats it as structurally missing.
# A binary hb_missing_indicator (=1 for every record) is included so that
# models capable of using indicator features can learn the population-level
# signal if any exists.
#
df["maternal_hemoglobin_gdl"] = np.nan          # structurally missing
df["hb_missing_indicator"]    = 1.0             # always 1 in PLOS dataset

print("\n  PRIMARY Hb approach: all NaN + hb_missing_indicator=1")

ALL_FEATURES_PRIMARY = FEATURES + [
    "gravidity_parity_gap",
    "has_prior_loss",
    "has_prior_csection",
    "is_preterm",
    "maternal_hemoglobin_gdl",
    "hb_missing_indicator",
]

# ── Save primary feature matrix ───────────────────────────────
out_primary = PROC / "features.parquet"
df.to_parquet(out_primary, index=False)
print(f"Saved (primary): {out_primary}  shape={df.shape}")

feat_list_path = PROC / "feature_list.txt"
feat_list_path.write_text("\n".join(ALL_FEATURES_PRIMARY))
print(f"Feature list saved: {feat_list_path}")

# ── SENSITIVITY: NFHS-5 population-distribution Hb imputation ─
#
# ⚠️  METHODOLOGICAL NOTE:
#     Values are sampled from NFHS-5 Indian maternal hemoglobin distribution.
#     This produces a RANDOM assignment; the imputed Hb is NOT correlated with
#     the individual patient's actual Hb. Use only as a sensitivity experiment
#     to quantify the effect of population-level imputation on model output.
#     Results from this model are NOT to be reported as clinical accuracy.
#
hb_cache = PROC / "nfhs5_hb_distribution.csv"
if hb_cache.exists():
    hb_dist = pd.read_csv(hb_cache)["hemoglobin_gdl"].dropna().values
    print(f"\n  SENSITIVITY Hb: sampling from NFHS-5 "
          f"(mean={hb_dist.mean():.2f}, std={hb_dist.std():.2f} g/dL)")
    df_sens = df.copy()
    sampled_hb = rng.choice(hb_dist, size=len(df_sens), replace=True).round(1)
    # Simulate ~10% missingness (realistic even in measured Hb datasets)
    miss_mask = rng.random(len(df_sens)) < 0.10
    sampled_hb[miss_mask] = np.nan
    df_sens["maternal_hemoglobin_gdl"] = sampled_hb.astype("float32")
    df_sens["hb_missing_indicator"]    = miss_mask.astype("float32")

    out_sens = PROC / "features_hb_imputed.parquet"
    df_sens.to_parquet(out_sens, index=False)
    print(f"  Saved (sensitivity): {out_sens}  shape={df_sens.shape}")
else:
    print("\n  [WARN] NFHS-5 Hb cache not found — sensitivity file skipped.")
    print("         Run 03_load_nfhs5_hb.py first, then re-run this script.")

# ── Summary ───────────────────────────────────────────────────
print(f"\nFinal feature set ({len(ALL_FEATURES_PRIMARY)} features):")
for f in ALL_FEATURES_PRIMARY:
    n_miss = df[f].isna().sum()
    print(f"  {f:<30}  missing={n_miss:>6,} ({n_miss/len(df)*100:.1f}%)")

print("\n[DONE] 05_feature_engineering.py")
