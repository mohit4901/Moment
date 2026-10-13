"""
Script 09 — Train LightGBM with Optuna HPO
- 50-trial Optuna study, 5-fold StratifiedKFold, optimizing PR-AUC
- Uses best hyperparameters found in HPO (Trial 35: lr=0.092, num_leaves=60, max_depth=11, etc.)
- Evaluates PR-AUC on validation set to find the true optimal boosting iteration
- Saves:
    models/lightgbm_model.txt
    reports/hyperparam_search_results_lightgbm.csv
    reports/lightgbm_train_val_curve.png + .csv
"""
import pandas as pd
import numpy as np
import lightgbm as lgb
import optuna
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import average_precision_score, log_loss
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
optuna.logging.set_verbosity(optuna.logging.WARNING)

print("=" * 60)
print("STEP 09 — LightGBM (Optuna HPO + PR-AUC Validation)")
print("=" * 60)

# ── Load data ─────────────────────────────────────────────────
X_train = pd.read_parquet(PROC / "X_train.parquet").astype("float32")
y_train = pd.read_parquet(PROC / "y_train.parquet")["pph_label"].astype(int)
X_val   = pd.read_parquet(PROC / "X_val.parquet").astype("float32")
y_val   = pd.read_parquet(PROC / "y_val.parquet")["pph_label"].astype(int)

col_medians = X_train.median().fillna(0.0)
X_train = X_train.fillna(col_medians)
X_val   = X_val.fillna(col_medians)

n_neg = int((y_train == 0).sum())
n_pos = int((y_train == 1).sum())
scale_pos_weight = n_neg / n_pos
print(f"scale_pos_weight = {scale_pos_weight:.2f}")

hpo_path = REP / "hyperparam_search_results_lightgbm.csv"

# ── Optuna HPO (run if not already cached) ─────────────────────
if hpo_path.exists():
    print(f"Loading existing HPO results from: {hpo_path}")
    hpo_df = pd.read_csv(hpo_path)
    best_row = hpo_df.loc[hpo_df["cv_pr_auc"].idxmax()]
    best_params = {
        "learning_rate":     float(best_row["learning_rate"]),
        "num_leaves":        int(best_row["num_leaves"]),
        "max_depth":         int(best_row["max_depth"]),
        "min_child_samples": int(best_row["min_child_samples"]),
        "subsample":         float(best_row["subsample"]),
        "colsample_bytree":  float(best_row["colsample_bytree"]),
        "reg_alpha":         float(best_row["reg_alpha"]),
        "reg_lambda":        float(best_row["reg_lambda"]),
        "scale_pos_weight":  float(best_row["scale_pos_weight"]),
    }
    best_cv = float(best_row["cv_pr_auc"])
    best_trial_num = int(best_row.get("trial", 0))
else:
    trial_rows = []
    def objective(trial):
        params = {
            "n_estimators":       1000,
            "learning_rate":      trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
            "num_leaves":         trial.suggest_int("num_leaves", 15, 255),
            "max_depth":          trial.suggest_int("max_depth", 3, 12),
            "min_child_samples":  trial.suggest_int("min_child_samples", 5, 100),
            "subsample":          trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree":   trial.suggest_float("colsample_bytree", 0.4, 1.0),
            "reg_alpha":          trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
            "reg_lambda":         trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
            "scale_pos_weight":   trial.suggest_float("scale_pos_weight",
                                                       scale_pos_weight * 0.5,
                                                       scale_pos_weight * 2.0),
            "objective":          "binary",
            "verbosity":          -1,
            "random_state":       SEED,
        }
        cv = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=SEED)
        scores = []
        for fold, (tr_idx, vl_idx) in enumerate(cv.split(X_train, y_train)):
            Xtr, ytr = X_train.iloc[tr_idx], y_train.iloc[tr_idx]
            Xvl, yvl = X_train.iloc[vl_idx], y_train.iloc[vl_idx]
            dtr = lgb.Dataset(Xtr, label=ytr)
            dvl = lgb.Dataset(Xvl, label=yvl, reference=dtr)
            def eval_pa(preds, ds):
                return "pr_auc", average_precision_score(ds.get_label(), preds), True
            bst = lgb.train(
                params, dtr, num_boost_round=100,
                valid_sets=[dvl],
                feval=eval_pa,
                callbacks=[lgb.early_stopping(30, first_metric_only=True, verbose=False)]
            )
            preds = bst.predict(Xvl, num_iteration=bst.best_iteration)
            scores.append(average_precision_score(yvl, preds))
        mean_score = float(np.mean(scores))
        trial_rows.append({"trial": trial.number, **params, "cv_pr_auc": mean_score})
        return mean_score

    study = optuna.create_study(direction="maximize",
                                 sampler=optuna.samplers.TPESampler(seed=SEED))
    print(f"Running Optuna HPO: {N_TRIALS} trials × {N_CV_FOLDS}-fold CV ...")
    study.optimize(objective, n_trials=N_TRIALS, show_progress_bar=True)
    best_params = study.best_params
    best_cv     = study.best_value
    best_trial_num = study.best_trial.number

    hpo_df = pd.DataFrame(trial_rows).sort_values("cv_pr_auc", ascending=False)
    hpo_df.to_csv(hpo_path, index=False)
    print(f"Saved: {hpo_path}")

print(f"\nBest HPO trial #{best_trial_num} CV PR-AUC: {best_cv:.4f}")
print("Final training parameters verified from HPO:")
for k, v in best_params.items():
    print(f"  {k}: {v}")

# ── Train final model ─────────────────────────────────────────
print("\nTraining final LightGBM booster with HPO params & tracking PR-AUC...")

lgb_train_data = lgb.Dataset(X_train, label=y_train)
lgb_val_data   = lgb.Dataset(X_val, label=y_val, reference=lgb_train_data)

final_params = {
    "boosting_type":     "gbdt",
    "objective":         "binary",
    "learning_rate":     best_params["learning_rate"],
    "num_leaves":        best_params["num_leaves"],
    "max_depth":         best_params["max_depth"],
    "min_child_samples": best_params["min_child_samples"],
    "subsample":         best_params["subsample"],
    "colsample_bytree":  best_params["colsample_bytree"],
    "reg_alpha":         best_params["reg_alpha"],
    "reg_lambda":        best_params["reg_lambda"],
    "scale_pos_weight":  best_params["scale_pos_weight"],
    "verbosity":         -1,
    "random_state":      SEED,
    "metric":            ["binary_logloss"],
}

def lgb_prauc_eval(y_pred, dataset):
    y_true = dataset.get_label()
    pa = average_precision_score(y_true, y_pred)
    return "pr_auc", pa, True

evals_result = {}
NUM_ROUNDS = 1000

print(f"\nTraining final LightGBM booster for full {NUM_ROUNDS} rounds...")
booster = lgb.train(
    final_params,
    lgb_train_data,
    num_boost_round=NUM_ROUNDS,
    valid_sets=[lgb_train_data, lgb_val_data],
    valid_names=["train", "val"],
    feval=lgb_prauc_eval,
    callbacks=[
        lgb.record_evaluation(evals_result),
    ]
)

val_prauc_history     = evals_result["val"]["pr_auc"]
train_prauc_history   = evals_result["train"]["pr_auc"]
val_logloss_history   = evals_result["val"]["binary_logloss"]
train_logloss_history = evals_result["train"]["binary_logloss"]

best_round = int(np.argmax(val_prauc_history)) + 1
best_val_prauc = val_prauc_history[best_round - 1]
print(f"\nCompleted {NUM_ROUNDS} boosting rounds.")
print(f"Peak Validation PR-AUC: {best_val_prauc:.5f} at iteration {best_round}")
print(f"Final round ({NUM_ROUNDS}) Validation PR-AUC: {val_prauc_history[-1]:.5f}")

# Set booster best_iteration
booster.best_iteration = best_round

# ── Save model ─────────────────────────────────────────────────
model_path = MDL / "lightgbm_model.txt"
booster.save_model(str(model_path))
print(f"Saved 1,000-tree booster model: {model_path} (num_trees={booster.num_trees()})")

# ── Training curves ───────────────────────────────────────────
rounds = list(range(1, NUM_ROUNDS + 1))
curve_df = pd.DataFrame({
    "round":         rounds,
    "train_logloss": train_logloss_history,
    "val_logloss":   val_logloss_history,
    "train_prauc":   train_prauc_history,
    "val_prauc":     val_prauc_history,
})
curve_path_csv = REP / "lightgbm_train_val_curve.csv"
curve_df.to_csv(curve_path_csv, index=False)
print(f"Saved: {curve_path_csv}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Log Loss plot
ax1.plot(rounds, train_logloss_history, label="Train LogLoss", color="#3b82f6", alpha=0.8)
ax1.plot(rounds, val_logloss_history,   label="Val LogLoss",   color="#ef4444", alpha=0.8)
ax1.axvline(best_round, color="#22c55e", linestyle="--",
            label=f"Optimal PR-AUC (round {best_round})")
ax1.set_xlabel("Boosting Round")
ax1.set_ylabel("Log Loss")
ax1.set_title("LightGBM — Log Loss (with scale_pos_weight)", fontweight="bold")
ax1.legend()
ax1.grid(alpha=0.3)

# PR-AUC plot
ax2.plot(rounds, train_prauc_history, label="Train PR-AUC", color="#3b82f6", alpha=0.8)
ax2.plot(rounds, val_prauc_history,   label="Val PR-AUC",   color="#ef4444", alpha=0.8)
ax2.axvline(best_round, color="#22c55e", linestyle="--",
            label=f"Peak Val PR-AUC ({best_val_prauc:.4f})")
ax2.set_xlabel("Boosting Round")
ax2.set_ylabel("PR-AUC")
ax2.set_title("LightGBM — PR-AUC Curve", fontweight="bold")
ax2.legend()
ax2.grid(alpha=0.3)

plt.suptitle("LightGBM Training Curves with HPO Best Hyperparameters (MOMENT Module A)", fontweight="bold")
plt.tight_layout()
curve_path_png = REP / "lightgbm_train_val_curve.png"
plt.savefig(curve_path_png, dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {curve_path_png}")

print("\n[DONE] 09_train_lightgbm.py completed successfully.")
