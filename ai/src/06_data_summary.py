"""
Script 06 — Data Summary & Missing Value Visualization
Generates:
  - reports/data_summary.csv: per-column stats (N, missing%, positive rate)
  - reports/missing_data_heatmap.png: missingness pattern visualization
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import missingno as msno
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
REP.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("STEP 06 — Data Summary & Missing Value Analysis")
print("=" * 60)

df = pd.read_parquet(PROC / "features.parquet")
feat_list = (PROC / "feature_list.txt").read_text().strip().splitlines()

print(f"Dataset shape: {df.shape}")

# ── Per-column summary ────────────────────────────────────────
rows = []
for col in feat_list + ["pph_label"]:
    if col not in df.columns:
        continue
    series = df[col]
    n_total   = len(series)
    n_missing = series.isna().sum()
    pct_miss  = n_missing / n_total * 100

    # Positive rate (only meaningful for binary cols)
    if series.dropna().nunique() <= 2:
        pos_rate = series.dropna().mean()
    else:
        pos_rate = np.nan

    rows.append({
        "column":         col,
        "n_total":        n_total,
        "n_non_missing":  n_total - n_missing,
        "n_missing":      n_missing,
        "pct_missing":    round(pct_miss, 2),
        "dtype":          str(series.dtype),
        "mean":           round(series.mean(), 4) if pd.api.types.is_numeric_dtype(series) else np.nan,
        "std":            round(series.std(), 4) if pd.api.types.is_numeric_dtype(series) else np.nan,
        "min":            series.min() if pd.api.types.is_numeric_dtype(series) else np.nan,
        "max":            series.max() if pd.api.types.is_numeric_dtype(series) else np.nan,
        "positive_rate":  round(pos_rate, 4) if not np.isnan(pos_rate) else np.nan,
        "source":         "PLOS ONE (primary)",
    })

summary_df = pd.DataFrame(rows)
out_csv = REP / "data_summary.csv"
summary_df.to_csv(out_csv, index=False)
print(f"Saved: {out_csv}")
print(summary_df[["column", "n_missing", "pct_missing", "mean", "positive_rate"]].to_string())

# ── PPH class balance summary ─────────────────────────────────
n_pos  = int(df["pph_label"].sum())
n_neg  = len(df) - n_pos
pct_pos = n_pos / len(df) * 100
print(f"\nClass balance — PPH positive: {n_pos:,} ({pct_pos:.2f}%)")
print(f"              — PPH negative: {n_neg:,} ({100-pct_pos:.2f}%)")
print(f"              — scale_pos_weight ≈ {n_neg/n_pos:.1f}")

# ── Missing value heatmap ─────────────────────────────────────
feature_df = df[feat_list].copy()

fig, axes = plt.subplots(1, 2, figsize=(18, 8))

# Heatmap
msno.heatmap(feature_df, ax=axes[0], fontsize=10, cmap="RdYlGn")
axes[0].set_title("Feature Missingness Correlation Heatmap", fontsize=13, fontweight="bold")

# Bar chart of missing %
miss_pct = summary_df[summary_df["column"].isin(feat_list)][["column", "pct_missing"]]
miss_pct = miss_pct.sort_values("pct_missing", ascending=True)
colors = ["#ef4444" if p > 20 else "#f97316" if p > 5 else "#22c55e"
          for p in miss_pct["pct_missing"]]
axes[1].barh(miss_pct["column"], miss_pct["pct_missing"], color=colors)
axes[1].axvline(5, color="#f97316", linestyle="--", alpha=0.7, label="5% threshold")
axes[1].axvline(20, color="#ef4444", linestyle="--", alpha=0.7, label="20% threshold")
axes[1].set_xlabel("Missing %", fontsize=11)
axes[1].set_title("Missing Values per Feature", fontsize=13, fontweight="bold")
axes[1].legend(fontsize=9)
for i, (_, row) in enumerate(miss_pct.iterrows()):
    axes[1].text(row["pct_missing"] + 0.1, i, f"{row['pct_missing']:.1f}%",
                 va="center", fontsize=8)

plt.tight_layout()
fig.suptitle("MOMENT — Module A: Missing Data Analysis (PLOS ONE Cohort)",
             fontsize=14, fontweight="bold", y=1.01)

heatmap_path = REP / "missing_data_heatmap.png"
plt.savefig(heatmap_path, dpi=150, bbox_inches="tight")
plt.close()
print(f"\nSaved: {heatmap_path}")

print("\n[DONE] 06_data_summary.py")
