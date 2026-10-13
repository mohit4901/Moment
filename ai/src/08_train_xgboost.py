"""
Script 08 — Train XGBoost for 1,000 Boosting Rounds
- Loads verified HPO best parameters from 50-trial search
- Trains full 1,000 boosting rounds (trees)
- Tracks train & val logloss and PR-AUC at every round (1 to 1,000)
- Saves:
    models/xgboost_model.json
    reports/xgboost_train_val_curve.png + .csv
"""
import pandas as pd
import numpy as np
import xgboost as xgb
import optuna
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import average_precision_score
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
MDL  = ROOT / "models"
REP.mkdir(parents=True, exist_ok=True)
MDL.mkdir(parents=True, exist_ok=True)

SEED       = 42
N_TRIALS   = 50
N_CV_FOLDS = 5

print("=" * 60)
print("STEP 08 — XGBoost (1,000 Boosting Rounds)")
print("=" * 60)

# ── Load data ─────────────────────────────────────────────────
X_train = pd.read_parquet(PROC / "X_train.parquet").astype("float32")
y_train = pd.read_parquet(PROC / "y_train.parquet")["pph_label"].astype(int)
X_val   = pd.read_parquet(PROC / "X_val.parquet").astype("float32")
y_val   = pd.read_parquet(PROC / "y_val.parquet")["pph_label"].astype(int)

col_medians = X_train.median().fillna(0.0)
X_train = X_train.fillna(col_medians)
X_val   = X_val.fillna(col_medians)

hpo_path = REP / "hyperparam_search_results_xgboost.csv"
if hpo_path.exists():
    print(f"Loading existing HPO best parameters from: {hpo_path}")
    hpo_df = pd.read_csv(hpo_path)
    best_row = hpo_df.loc[hpo_df["cv_pr_auc"].idxmax()]
    best_params = {
        "learning_rate":    float(best_row["learning_rate"]),
        "max_depth":        int(best_row["max_depth"]),
        "min_child_weight": int(best_row["min_child_weight"]),
        "subsample":        float(best_row["subsample"]),
        "colsample_bytree": float(best_row["colsample_bytree"]),
        "reg_alpha":        float(best_row["reg_alpha"]),
        "reg_lambda":       float(best_row["reg_lambda"]),
        "scale_pos_weight": float(best_row["scale_pos_weight"]),
    }
else:
    raise FileNotFoundError(f"HPO file not found: {hpo_path}")

print("Parameters being used for 1,000-round training:")
for k, v in best_params.items():
    print(f"  {k}: {v}")

# ── Train 1,000 boosting trees ────────────────────────────────
TOTAL_TREES = 1000
final_params = {
    "n_estimators":     TOTAL_TREES,
    "learning_rate":    best_params["learning_rate"],
    "max_depth":        best_params["max_depth"],
    "min_child_weight": best_params["min_child_weight"],
    "subsample":        best_params["subsample"],
    "colsample_bytree": best_params["colsample_bytree"],
    "reg_alpha":        best_params["reg_alpha"],
    "reg_lambda":       best_params["reg_lambda"],
    "scale_pos_weight": best_params["scale_pos_weight"],
    "tree_method":      "hist",
    "eval_metric":      ["logloss", "aucpr"],
    "use_label_encoder": False,
    "random_state":     SEED,
    "verbosity":        0,
}

print(f"\nTraining XGBoost for full {TOTAL_TREES} boosting rounds ...")
model = xgb.XGBClassifier(**final_params)
model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_val, y_val)],
    verbose=100,
)

evals = model.evals_result()
train_logloss = evals["validation_0"]["logloss"]
val_logloss   = evals["validation_1"]["logloss"]
train_prauc   = evals["validation_0"]["aucpr"]
val_prauc     = evals["validation_1"]["aucpr"]

best_round = int(np.argmax(val_prauc)) + 1
best_val_prauc = val_prauc[best_round - 1]
print(f"\nCompleted {TOTAL_TREES} rounds.")
print(f"Peak Validation PR-AUC: {best_val_prauc:.5f} at round {best_round}")
print(f"Final round ({TOTAL_TREES}) Validation PR-AUC: {val_prauc[-1]:.5f}")

# ── Save model ─────────────────────────────────────────────────
model_path = MDL / "xgboost_model.json"
model.save_model(str(model_path))
print(f"Saved 1,000-tree model: {model_path}")

# ── Training curve ─────────────────────────────────────────────
rounds = list(range(1, TOTAL_TREES + 1))
curve_df = pd.DataFrame({
    "round":         rounds,
    "train_logloss": train_logloss,
    "val_logloss":   val_logloss,
    "train_prauc":   train_prauc,
    "val_prauc":     val_prauc,
})
curve_path_csv = REP / "xgboost_train_val_curve.csv"
curve_df.to_csv(curve_path_csv, index=False)
print(f"Saved: {curve_path_csv} ({len(curve_df)} rounds)")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Log Loss plot
ax1.plot(rounds, train_logloss, label="Train LogLoss", color="#3b82f6", alpha=0.8)
ax1.plot(rounds, val_logloss,   label="Val LogLoss",   color="#ef4444", alpha=0.8)
ax1.axvline(best_round, color="#22c55e", linestyle="--",
            label=f"Peak PR-AUC (round {best_round})")
ax1.set_xlabel("Boosting Round")
ax1.set_ylabel("Log Loss")
ax1.set_title("XGBoost — Log Loss (1,000 Rounds)", fontweight="bold")
ax1.legend()
ax1.grid(alpha=0.3)

# PR-AUC plot
ax2.plot(rounds, train_prauc, label="Train PR-AUC", color="#3b82f6", alpha=0.8)
ax2.plot(rounds, val_prauc,   label="Val PR-AUC",   color="#ef4444", alpha=0.8)
ax2.axvline(best_round, color="#22c55e", linestyle="--",
            label=f"Peak ({best_val_prauc:.4f}) at #{best_round}")
ax2.set_xlabel("Boosting Round")
ax2.set_ylabel("PR-AUC")
ax2.set_title("XGBoost — PR-AUC (1,000 Rounds)", fontweight="bold")
ax2.legend()
ax2.grid(alpha=0.3)

plt.suptitle("XGBoost 1,000 Boosting Rounds Training Curves (MOMENT Module A)", fontweight="bold")
plt.tight_layout()
curve_path_png = REP / "xgboost_train_val_curve.png"
plt.savefig(curve_path_png, dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {curve_path_png}")

print("\n[DONE] 08_train_xgboost.py completed successfully.")
