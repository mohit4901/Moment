"""
Script 07 — Train / Validation / Test Split
Stratified 70 / 15 / 15 split by PPH label.
Saves:
  - data/processed/X_train.parquet, y_train.parquet
  - data/processed/X_val.parquet,   y_val.parquet
  - data/processed/X_test.parquet,  y_test.parquet
  - reports/split_sizes.csv (row counts + class balance per split)
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
REP.mkdir(parents=True, exist_ok=True)

SEED = 42

print("=" * 60)
print("STEP 07 — Train / Val / Test Split  (70 / 15 / 15, stratified)")
print("=" * 60)

df = pd.read_parquet(PROC / "features.parquet")
feat_list = (PROC / "feature_list.txt").read_text().strip().splitlines()

X = df[feat_list].copy()
y = df["pph_label"].astype(int)

# Convert Int8 → float32 for model compatibility
for col in X.columns:
    X[col] = pd.to_numeric(X[col], errors="coerce").astype("float32")

print(f"Total: {len(X):,} samples  |  PPH+: {y.sum():,} ({y.mean()*100:.2f}%)")

# Step 1: 70 / 30 split (train vs temp)
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.30, random_state=SEED, stratify=y
)

# Step 2: 50 / 50 split of temp → val / test  (15% + 15% of total)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.50, random_state=SEED, stratify=y_temp
)

# ── Save parquets ─────────────────────────────────────────────
for name, Xd, yd in [("train", X_train, y_train),
                     ("val",   X_val,   y_val),
                     ("test",  X_test,  y_test)]:
    Xd.to_parquet(PROC / f"X_{name}.parquet", index=False)
    yd.to_frame("pph_label").to_parquet(PROC / f"y_{name}.parquet", index=False)

# ── Split sizes report ────────────────────────────────────────
def split_stats(name, Xd, yd):
    n = len(yd)
    pos = int(yd.sum())
    return {
        "split":         name,
        "n_samples":     n,
        "n_pph_positive": pos,
        "n_pph_negative": n - pos,
        "pph_positive_rate": round(pos / n, 4),
        "pct_of_total":  round(n / len(y) * 100, 1),
    }

split_df = pd.DataFrame([
    split_stats("train", X_train, y_train),
    split_stats("val",   X_val,   y_val),
    split_stats("test",  X_test,  y_test),
])
split_path = REP / "split_sizes.csv"
split_df.to_csv(split_path, index=False)
print(f"\nSaved: {split_path}")
print(split_df.to_string(index=False))

print("\n[DONE] 07_split.py")
