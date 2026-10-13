"""
Script 03 — Load NFHS-5 Hemoglobin Distribution
Extracts column v456 (hemoglobin adjusted for altitude, g/dL × 10) from the
large DHS Individual Recode file. Saves the empirical distribution for
population-level imputation of hemoglobin in the PLOS ONE dataset.

NOTE: This column is population-imputed (not patient-specific measurements).
All downstream outputs clearly flag this.
"""
import pandas as pd
import numpy as np
import pyreadstat
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DHS  = ROOT / "data" / "raw" / "dhs_india" / "IAIR7EFL.DTA"
PROC = ROOT / "data" / "processed"
PROC.mkdir(parents=True, exist_ok=True)

CACHE = PROC / "nfhs5_hb_distribution.csv"

print("=" * 60)
print("STEP 03 — Load NFHS-5 Hemoglobin Distribution")
print("=" * 60)

if CACHE.exists():
    print(f"[CACHE HIT] Loading from {CACHE}")
    hb_df = pd.read_csv(CACHE)
else:
    print(f"Loading v456 from {DHS}  (large file — may take 2–5 min) ...")
    df, meta = pyreadstat.read_dta(
        str(DHS),
        usecols=["v456", "v457"],   # Hb adjusted + anemia level
        disable_datetime_conversion=True,
    )
    print(f"  Loaded {len(df):,} rows")

    # v456 stores Hb in g/dL × 10 (e.g. 120 → 12.0 g/dL)
    # Values ≥ 998 are missing codes
    hb = df["v456"].copy()
    hb = pd.to_numeric(hb, errors="coerce")
    hb[hb >= 998] = np.nan
    hb_gdl = hb / 10.0   # convert to g/dL

    # Keep only plausible values (5–20 g/dL)
    hb_gdl = hb_gdl[(hb_gdl >= 5.0) & (hb_gdl <= 20.0)]

    # Save the empirical distribution as a column of values
    hb_df = pd.DataFrame({"hemoglobin_gdl": hb_gdl.dropna().reset_index(drop=True)})
    hb_df.to_csv(CACHE, index=False)
    print(f"  Saved distribution ({len(hb_df):,} valid values) → {CACHE}")

# Summary stats
vals = hb_df["hemoglobin_gdl"].values
print(f"\nHemoglobin distribution (g/dL):")
print(f"  n      = {len(vals):,}")
print(f"  mean   = {vals.mean():.2f}")
print(f"  std    = {vals.std():.2f}")
print(f"  median = {np.median(vals):.2f}")
print(f"  range  = {vals.min():.1f}–{vals.max():.1f}")
print(f"  <11 g/dL (anemia): {(vals < 11).mean()*100:.1f}%")

print("\n[DONE] 03_load_nfhs5_hb.py")
