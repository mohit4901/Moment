"""
Script 12 — Shock Index Validation (El Ayadi/Miller Cohort)
Implements SI = Heart Rate / Systolic BP with 4 clinical tiers.
Validates against hemorrhage mortality outcome (died=1) as proxy
for severe hemorrhagic decompensation.

NOTE: The El Ayadi/Miller cohort records obstetric hemorrhage patients.
'died' = mortality from hemorrhage-related complications.
This is the closest available outcome to severe hemorrhagic shock.

Saves:
  reports/shock_index_validation.csv
  reports/shock_index_distribution.png
"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (confusion_matrix, classification_report,
                              roc_auc_score, average_precision_score)
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
REP.mkdir(parents=True, exist_ok=True)

print("=" * 60)
print("STEP 12 — Shock Index Validation")
print("=" * 60)

df = pd.read_parquet(PROC / "elayadi_miller.parquet")
print(f"Dataset: {df.shape}")

# ── Compute / validate SI ──────────────────────────────────────
# Use pre-computed 'si' column (validated against HR/SBP in script 04).
df["si"] = pd.to_numeric(df["si"], errors="coerce")
df["outcome"] = pd.to_numeric(df["died"], errors="coerce").fillna(0).astype(int)

# Drop rows with missing SI or blood pressure
df = df.dropna(subset=["si"])
print(f"After dropping missing SI: {len(df)} rows")
print(f"Outcome (died): {df['outcome'].value_counts().to_dict()}")

# ── Tier thresholds (as specified) ────────────────────────────
THRESHOLDS = [
    ("Normal",             0.00, 0.90),
    ("Watch",              0.90, 1.40),
    ("Critical",           1.40, 1.70),
    ("Severe Decomp.",     1.70, 99.9),
]

def assign_si_tier(si):
    for label, lo, hi in THRESHOLDS:
        if lo <= si < hi:
            return label
    return "Severe Decomp."

df["si_tier"] = df["si"].apply(assign_si_tier)
tier_order = ["Normal", "Watch", "Critical", "Severe Decomp."]

print("\nSI tier distribution:")
print(df["si_tier"].value_counts().reindex(tier_order))

# ── Per-threshold sensitivity / specificity / PPV / NPV ───────
rows = []
for label, lo, hi in THRESHOLDS:
    # Binary: SI >= lower bound of this tier → positive for ≥ this severity
    pred_bin = (df["si"] >= lo).astype(int)
    y        = df["outcome"].values
    TP = ((pred_bin == 1) & (y == 1)).sum()
    FP = ((pred_bin == 1) & (y == 0)).sum()
    TN = ((pred_bin == 0) & (y == 0)).sum()
    FN = ((pred_bin == 0) & (y == 1)).sum()
    sens = TP / (TP + FN) if (TP + FN) > 0 else np.nan
    spec = TN / (TN + FP) if (TN + FP) > 0 else np.nan
    ppv  = TP / (TP + FP) if (TP + FP) > 0 else np.nan
    npv  = TN / (TN + FN) if (TN + FN) > 0 else np.nan
    rows.append({
        "tier":           label,
        "si_threshold":   lo,
        "n_at_or_above":  int(pred_bin.sum()),
        "sensitivity":    round(float(sens), 4) if not np.isnan(sens) else np.nan,
        "specificity":    round(float(spec), 4) if not np.isnan(spec) else np.nan,
        "ppv":            round(float(ppv), 4) if not np.isnan(ppv) else np.nan,
        "npv":            round(float(npv), 4) if not np.isnan(npv) else np.nan,
        "outcome_note":   "died=1 (hemorrhage mortality) used as proxy for severe shock",
    })

val_df = pd.DataFrame(rows)
val_df.to_csv(REP / "shock_index_validation.csv", index=False)
print(f"\nSaved: {REP / 'shock_index_validation.csv'}")
print(val_df[["tier","si_threshold","sensitivity","specificity","ppv","npv"]].to_string(index=False))

# ── SI distribution plot ──────────────────────────────────────
tier_palette = {
    "Normal":        "#22c55e",
    "Watch":         "#f59e0b",
    "Critical":      "#f97316",
    "Severe Decomp.":"#ef4444",
}

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Left: SI histogram colored by tier
ax = axes[0]
for tier in tier_order:
    subset = df[df["si_tier"] == tier]["si"]
    ax.hist(subset, bins=30, alpha=0.7, label=f"{tier} (n={len(subset)})",
            color=tier_palette[tier], edgecolor="white", linewidth=0.5)
for _, lo, _ in THRESHOLDS[1:]:
    ax.axvline(lo, color="black", linestyle="--", alpha=0.5, linewidth=1)
ax.set_xlabel("Shock Index (HR / SBP)"); ax.set_ylabel("Count")
ax.set_title("Shock Index Distribution by Tier", fontweight="bold")
ax.legend(); ax.grid(alpha=0.3)

# Right: SI by outcome (died vs survived)
ax2 = axes[1]
for outcome_val, label, color in [(0, "Survived", "#3b82f6"), (1, "Died", "#ef4444")]:
    subset = df[df["outcome"] == outcome_val]["si"]
    ax2.hist(subset, bins=30, alpha=0.7, label=f"{label} (n={len(subset)})",
             color=color, edgecolor="white", linewidth=0.5)
for _, lo, _ in THRESHOLDS[1:]:
    ax2.axvline(lo, color="black", linestyle="--", alpha=0.5, linewidth=1)
ax2.set_xlabel("Shock Index (HR / SBP)"); ax2.set_ylabel("Count")
ax2.set_title("Shock Index Distribution by Outcome (died vs survived)", fontweight="bold")
ax2.legend(); ax2.grid(alpha=0.3)

plt.suptitle("MOMENT — Shock Index Validation (El Ayadi/Miller Cohort, n=958)",
             fontweight="bold")
plt.tight_layout()
plt.savefig(REP / "shock_index_distribution.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'shock_index_distribution.png'}")

print("\n[DONE] 12_shock_index.py")
