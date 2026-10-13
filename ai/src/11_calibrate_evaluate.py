"""
Script 11 — Calibration, Cross-Validation Stability & Full Evaluation

METHODOLOGICAL NOTES (corrections from review):
  1. Isotonic calibrator is fit on VALIDATION set → applied to TEST set.
     Never fit on test — that would be optimistic evaluation.
  2. Thresholds (F2-optimised AND 90%-specificity) are selected on VALIDATION
     set → applied once to untouched TEST set for reporting.
  3. 90% Specificity threshold is labelled as a "predefined operating point",
     not claimed as the sole clinical standard.
  4. FT-Transformer is labelled "simplified custom implementation (not the
     published Gorishniy et al. 2021 architecture)".
  5. All calibration and threshold diagnostics use val set only.

Generates ALL mandatory evaluation deliverables for Module A.
"""
import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
import lightgbm as lgb
import torch
torch.set_num_threads(1)
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import shap
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, brier_score_loss,
    confusion_matrix, classification_report, roc_curve, precision_recall_curve,
    fbeta_score,
)
from sklearn.model_selection import StratifiedKFold
import joblib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
MDL  = ROOT / "models"
REP.mkdir(parents=True, exist_ok=True)

SEED = 42
np.random.seed(SEED)

print("=" * 60)
print("STEP 11 — Calibration + Full Evaluation")
print("  Calibrator  : fit on VAL, applied to TEST")
print("  Thresholds  : selected on VAL, reported on TEST (once)")
print("=" * 60)

# ── Load data ─────────────────────────────────────────────────
feat_list   = (PROC / "feature_list.txt").read_text().strip().splitlines()
col_medians = pd.read_csv(PROC / "feature_medians.csv", index_col=0).squeeze()
norm_df     = pd.read_csv(PROC / "feature_norm_stats.csv").set_index("feature")

X_train = pd.read_parquet(PROC / "X_train.parquet").astype("float32")
y_train = pd.read_parquet(PROC / "y_train.parquet")["pph_label"].astype(int)
X_val   = pd.read_parquet(PROC / "X_val.parquet").astype("float32")
y_val   = pd.read_parquet(PROC / "y_val.parquet")["pph_label"].astype(int)
X_test  = pd.read_parquet(PROC / "X_test.parquet").astype("float32")
y_test  = pd.read_parquet(PROC / "y_test.parquet")["pph_label"].astype(int)

# Load medians — fillna(0) so 100%-NaN columns (maternal_hemoglobin_gdl) become 0
col_medians = pd.read_csv(PROC / "feature_medians.csv", index_col=0).squeeze().fillna(0.0)
norm_df     = pd.read_csv(PROC / "feature_norm_stats.csv").set_index("feature").fillna(0.0)
# Ensure std is never 0 (zero-variance columns should not rescale)
norm_df["std"] = norm_df["std"].replace(0, 1)

# ── Helper functions ──────────────────────────────────────────
def compute_ece(y_true, y_prob, n_bins=10):
    bins = np.linspace(0, 1, n_bins + 1)
    ece  = 0.0
    n    = len(y_true)
    for i in range(n_bins):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i + 1])
        if mask.sum() > 0:
            ece += mask.sum() * abs(y_true[mask].mean() - y_prob[mask].mean())
    return ece / max(n, 1)

def threshold_at_90spec_on_val(y_true_val, y_prob_val):
    """Select threshold on VALIDATION set at ≥90% specificity."""
    fpr, tpr, thresholds = roc_curve(y_true_val, y_prob_val)
    specificities = 1 - fpr
    idx = np.where(specificities >= 0.90)[0]
    if len(idx) == 0:
        return 0.5, np.nan
    best_idx  = idx[-1]      # highest sensitivity at ≥90% spec
    return float(thresholds[best_idx]), float(tpr[best_idx])

def threshold_f2_on_val(y_true_val, y_prob_val):
    """Select threshold on VALIDATION set that maximises F2 score."""
    prec, rec, thresholds = precision_recall_curve(y_true_val, y_prob_val)
    f2_scores = (5 * prec * rec) / (4 * prec + rec + 1e-9)
    best_idx  = np.argmax(f2_scores[:-1])
    return float(thresholds[best_idx]), float(f2_scores[best_idx])

def eval_metrics_at_threshold(y_true, y_prob, threshold, model_name, thresh_label):
    y_pred = (y_prob >= threshold).astype(int)
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    spec_at_thresh = float((1 - fpr)[np.searchsorted(tpr, recall_score(y_true, y_pred,
                                                       zero_division=0))])
    return {
        "model":                    model_name,
        "threshold_method":         thresh_label,
        "threshold_value":          round(threshold, 4),
        "accuracy":                 round(accuracy_score(y_true, y_pred), 4),
        "precision":                round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall":                   round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1":                       round(f1_score(y_true, y_pred, zero_division=0), 4),
        "f2":                       round(fbeta_score(y_true, y_pred, beta=2, zero_division=0), 4),
        "roc_auc":                  round(roc_auc_score(y_true, y_prob), 4),
        "pr_auc":                   round(average_precision_score(y_true, y_prob), 4),
        "brier_score":              round(brier_score_loss(y_true, y_prob), 4),
        "ece":                      round(compute_ece(y_true, y_prob), 4),
    }

# ── FT-Transformer definition (must match script 10) ─────────
class FTTransformer(nn.Module):
    """
    Simplified custom FT-Transformer implementation.
    NOT equivalent to Gorishniy et al. (2021) published architecture.
    Used here as an additional experimental baseline.
    """
    def __init__(self, n_features, d_token=64, n_heads=8, n_layers=3,
                 d_ffn=256, dropout=0.1):
        super().__init__()
        self.feature_weights = nn.Parameter(torch.empty(n_features, d_token))
        self.feature_biases  = nn.Parameter(torch.zeros(n_features, d_token))
        nn.init.kaiming_uniform_(self.feature_weights, nonlinearity="relu")
        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))
        encoder_layer  = nn.TransformerEncoderLayer(
            d_model=d_token, nhead=n_heads, dim_feedforward=d_ffn,
            dropout=dropout, batch_first=True, norm_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.norm = nn.LayerNorm(d_token)
        self.head = nn.Linear(d_token, 1)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        tokens = x.unsqueeze(-1) * self.feature_weights + self.feature_biases
        cls    = self.cls_token.expand(x.size(0), -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)
        out    = self.transformer(tokens)
        return self.head(self.drop(self.norm(out[:, 0, :]))).squeeze(-1)

# ── Load models ───────────────────────────────────────────────
print("\nLoading trained models ...")
xgb_model = xgb.XGBClassifier()
xgb_model.load_model(str(MDL / "xgboost_model.json"))

lgb_booster = lgb.Booster(model_file=str(MDL / "lightgbm_model.txt"))

DEVICE = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

ckpt = torch.load(MDL / "fttransformer_model.pt", map_location="cpu", weights_only=False)
ftt_model = FTTransformer(n_features=len(feat_list)).to(DEVICE)
ftt_model.load_state_dict(ckpt["model_state_dict"])
ftt_model.eval()


def ftt_predict(X_df, batch_size=1024):
    """Batched inference with numpy acceleration and device support."""
    if isinstance(X_df, pd.DataFrame):
        Xf = X_df.fillna(col_medians)
        Xn = (Xf - norm_df["mean"]) / norm_df["std"]
        Xn_arr = Xn.fillna(0.0).values.astype("float32")
    else:
        Xf = np.nan_to_num(X_df, nan=0.0)
        Xn = (Xf - norm_df["mean"].values) / norm_df["std"].values
        Xn_arr = np.nan_to_num(Xn, nan=0.0).astype("float32")
    
    all_preds = []
    with torch.no_grad():
        for i in range(0, len(Xn_arr), batch_size):
            Xb = torch.from_numpy(Xn_arr[i:i+batch_size]).to(DEVICE)
            all_preds.extend(torch.sigmoid(ftt_model(Xb)).cpu().numpy())
    return np.array(all_preds)

def xgb_pred(X):  return xgb_model.predict_proba(X.fillna(col_medians))[:, 1]
def lgb_pred(X):
    Xf = X.fillna(col_medians)
    return lgb_booster.predict(Xf, num_iteration=lgb_booster.best_iteration)

print("  Models loaded.")
print("\nComputing predictions on val and test sets ...")
print("  XGBoost val ...", end=" ", flush=True)
_xgb_val = xgb_pred(X_val); print(f"done. PR-AUC={average_precision_score(y_val, _xgb_val):.4f}")
print("  XGBoost test ...", end=" ", flush=True)
_xgb_tst = xgb_pred(X_test); print("done.")
print("  LightGBM val ...", end=" ", flush=True)
_lgb_val = lgb_pred(X_val); print(f"done. PR-AUC={average_precision_score(y_val, _lgb_val):.4f}")
print("  LightGBM test ...", end=" ", flush=True)
_lgb_tst = lgb_pred(X_test); print("done.")
print("  FTTransformer val (batched) ...", end=" ", flush=True)
_ftt_val = ftt_predict(X_val); print(f"done. PR-AUC={average_precision_score(y_val, _ftt_val):.4f}")
print("  FTTransformer test (batched) ...", end=" ", flush=True)
_ftt_tst = ftt_predict(X_test); print("done.")


MODEL_COLORS = {
    "XGBoost":       "#3b82f6",
    "LightGBM":      "#f97316",
    "FTTransformer": "#8b5cf6",
}

# ── Step 1: Raw predictions on VAL (for calibration + threshold) ─
val_probs_raw = {
    "XGBoost":       _xgb_val,
    "LightGBM":      _lgb_val,
    "FTTransformer": _ftt_val,
}
# ── Step 2: Raw predictions on TEST ──────────────────────────
test_probs_raw = {
    "XGBoost":       _xgb_tst,
    "LightGBM":      _lgb_tst,
    "FTTransformer": _ftt_tst,
}

# ── Step 3: Fit isotonic calibrator on VAL → apply to TEST ───
print("\nFitting isotonic calibrators on VAL set ...")
calibrators        = {}
val_probs_cal      = {}
test_probs_cal     = {}
cal_metrics_rows   = []

for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    raw_val_p  = val_probs_raw[name]
    raw_test_p = test_probs_raw[name]

    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(raw_val_p, y_val.values)          # ← fit on VAL only
    cal_val_p  = iso.predict(raw_val_p)
    cal_test_p = iso.predict(raw_test_p)       # ← apply to TEST

    calibrators[name]    = iso
    val_probs_cal[name]  = cal_val_p
    test_probs_cal[name] = cal_test_p

    joblib.dump(iso, MDL / f"calibrator_{name.lower()}.pkl")

    # Before/after metrics on TEST (calibrator was NOT fit on test)
    b_bef = brier_score_loss(y_test, raw_test_p)
    b_aft = brier_score_loss(y_test, cal_test_p)
    e_bef = compute_ece(y_test.values, raw_test_p)
    e_aft = compute_ece(y_test.values, cal_test_p)
    cal_metrics_rows.append({
        "model":            name,
        "brier_before_cal": round(b_bef, 4),
        "brier_after_cal":  round(b_aft, 4),
        "ece_before_cal":   round(e_bef, 4),
        "ece_after_cal":    round(e_aft, 4),
        "ece_target_met":   e_aft < 0.01,
        "note":             "Calibrator fit on val set; test set is held-out.",
    })
    print(f"  {name}: ECE {e_bef:.4f}→{e_aft:.4f}  Brier {b_bef:.4f}→{b_aft:.4f}")

cal_df = pd.DataFrame(cal_metrics_rows)
cal_df.to_csv(REP / "calibration_metrics.csv", index=False)
print(f"Saved: {REP / 'calibration_metrics.csv'}")

# Calibration plot (based on TEST set, calibrator fit on VAL)
fig, axes = plt.subplots(1, 3, figsize=(18, 6))
for ax, name in zip(axes, ["XGBoost", "LightGBM", "FTTransformer"]):
    raw_test_p = test_probs_raw[name]
    cal_test_p = test_probs_cal[name]
    color      = MODEL_COLORS[name]
    frac_b, mp_b = calibration_curve(y_test, raw_test_p, n_bins=10)
    frac_a, mp_a = calibration_curve(y_test, cal_test_p,  n_bins=10)
    ax.plot([0,1],[0,1],"k--",alpha=0.5,label="Perfect")
    ax.plot(mp_b, frac_b, "o--", color=color, alpha=0.6, label="Before cal.")
    ax.plot(mp_a, frac_a, "s-",  color=color, label="After cal.")
    ax.set_title(f"{name}", fontweight="bold")
    ax.set_xlabel("Mean predicted probability"); ax.set_ylabel("Fraction of positives")
    ax.legend(fontsize=9); ax.grid(alpha=0.3)
    ax.text(0.02, 0.92, "Calibrator fit on val set", transform=ax.transAxes,
            fontsize=7, color="gray", style="italic")
plt.suptitle("Calibration Curves (Isotonic) — MOMENT Module A\n"
             "Calibrator fit on validation set; curves shown on held-out test set",
             fontweight="bold")
plt.tight_layout()
plt.savefig(REP / "calibration_curve.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'calibration_curve.png'}")

# ── Step 4: Select thresholds on CALIBRATED VAL predictions ──
print("\nSelecting thresholds on VAL (calibrated) ...")
thresholds = {}  # {model_name: {"f2": float, "spec90": float}}

for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    cal_val_p = val_probs_cal[name]
    t_f2,   f2_val   = threshold_f2_on_val(y_val.values, cal_val_p)
    t_spec, sens_val = threshold_at_90spec_on_val(y_val.values, cal_val_p)
    thresholds[name] = {"f2": t_f2, "spec90": t_spec}
    print(f"  {name}: F2-thresh={t_f2:.4f} (val F2={f2_val:.4f}) | "
          f"90%-spec-thresh={t_spec:.4f} (val sens={sens_val:.4f})")

# ── Step 5: Report ALL metrics on TEST (ONCE, with thresholds from val) ──
print("\nEvaluating on TEST set (held-out, used exactly once) ...")
final_metrics_rows = []
for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    cal_test_p = test_probs_cal[name]
    for thresh_label, thresh_key in [("F2-optimized (val)", "f2"),
                                      ("90%-Specificity (val)", "spec90")]:
        thresh = thresholds[name][thresh_key]
        row    = eval_metrics_at_threshold(
            y_test.values, cal_test_p, thresh, name, thresh_label)
        final_metrics_rows.append(row)

final_df = pd.DataFrame(final_metrics_rows)
final_df.to_csv(REP / "final_test_metrics.csv", index=False)
print(final_df.to_string(index=False))
print(f"Saved: {REP / 'final_test_metrics.csv'}")

# ── Best model by val PR-AUC (calibrated val) ─────────────────
best_model_name = max(
    ["XGBoost", "LightGBM", "FTTransformer"],
    key=lambda n: average_precision_score(y_val, val_probs_cal[n])
)
print(f"\nBest model (calibrated val PR-AUC): {best_model_name}")
best_cal_test  = test_probs_cal[best_model_name]
best_thresh_f2 = thresholds[best_model_name]["f2"]
best_thresh_s9 = thresholds[best_model_name]["spec90"]

# Primary reporting threshold: 90%-specificity operating point (val-selected)
primary_thresh = best_thresh_s9
primary_label  = "90%-Specificity predefined operating point (threshold selected on val)"
y_pred_best    = (best_cal_test >= primary_thresh).astype(int)

# ── Confusion matrix ──────────────────────────────────────────
cm     = confusion_matrix(y_test, y_pred_best)
cm_df  = pd.DataFrame(cm,
            index=["Actual_Negative", "Actual_Positive"],
            columns=["Pred_Negative", "Pred_Positive"])
cm_df.to_csv(REP / "confusion_matrix.csv")

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
            xticklabels=["Pred Neg", "Pred Pos"],
            yticklabels=["Actual Neg", "Actual Pos"])
tn, fp, fn, tp = cm.ravel()
ax.set_title(
    f"Confusion Matrix — {best_model_name}\n"
    f"Threshold: {primary_thresh:.4f}  ({primary_label})\n"
    f"TP={tp}  FP={fp}  TN={tn}  FN={fn}",
    fontweight="bold", fontsize=10)
ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
plt.tight_layout()
plt.savefig(REP / "confusion_matrix.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'confusion_matrix.png'}  +  confusion_matrix.csv")

# ── ROC curves ───────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 7))
roc_rows = []
for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    cal_p = test_probs_cal[name]
    fpr, tpr, thrs = roc_curve(y_test, cal_p)
    auc = roc_auc_score(y_test, cal_p)
    lbl = name if name != "FTTransformer" else "FTTransformer*"
    ax.plot(fpr, tpr, label=f"{lbl} (AUC={auc:.3f})", lw=2,
            color=MODEL_COLORS[name])
    for f, t, thr in zip(fpr, tpr, thrs):
        roc_rows.append({"model": name, "fpr": round(float(f), 5),
                         "tpr": round(float(t), 5),
                         "threshold": round(float(thr), 5)})
ax.plot([0,1],[0,1],"k--",alpha=0.4)
ax.set_xlabel("False Positive Rate"); ax.set_ylabel("True Positive Rate")
ax.set_title("ROC Curves — MOMENT Module A (Calibrated, held-out test)\n"
             "*FTTransformer = simplified custom implementation",
             fontweight="bold")
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(REP / "roc_curve.png", dpi=150, bbox_inches="tight")
plt.close()
pd.DataFrame(roc_rows).to_csv(REP / "roc_curve_points.csv", index=False)
print(f"Saved: {REP / 'roc_curve.png'}  +  roc_curve_points.csv")

# ── PR curves ────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(8, 7))
pr_rows = []
for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    cal_p = test_probs_cal[name]
    prec, rec, thrs = precision_recall_curve(y_test, cal_p)
    auc = average_precision_score(y_test, cal_p)
    lbl = name if name != "FTTransformer" else "FTTransformer*"
    ax.plot(rec, prec, label=f"{lbl} (AP={auc:.3f})", lw=2,
            color=MODEL_COLORS[name])
    for p, r, thr in zip(prec[:-1], rec[:-1], thrs):
        pr_rows.append({"model": name, "precision": round(float(p), 5),
                        "recall": round(float(r), 5),
                        "threshold": round(float(thr), 5)})
ax.axhline(y_test.mean(), color="k", linestyle="--", alpha=0.4,
           label=f"Prevalence baseline ({y_test.mean():.3f})")
ax.set_xlabel("Recall"); ax.set_ylabel("Precision")
ax.set_title("Precision-Recall Curves — MOMENT Module A (Calibrated, held-out test)\n"
             "*FTTransformer = simplified custom implementation",
             fontweight="bold")
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(REP / "pr_curve.png", dpi=150, bbox_inches="tight")
plt.close()
pd.DataFrame(pr_rows).to_csv(REP / "pr_curve_points.csv", index=False)
print(f"Saved: {REP / 'pr_curve.png'}  +  pr_curve_points.csv")

# ── Classification report ─────────────────────────────────────
report = classification_report(y_test, y_pred_best,
    target_names=["No PPH", "PPH"], output_dict=True)
cr_df = pd.DataFrame(report).T
cr_df.index.name = "class"
cr_df.to_csv(REP / "classification_report.csv")
print(f"Saved: {REP / 'classification_report.csv'}")

# ── Feature importance ────────────────────────────────────────
if best_model_name in ("XGBoost", "LightGBM"):
    if best_model_name == "XGBoost":
        imp_d = xgb_model.get_booster().get_score(importance_type="gain")
        imp_df = pd.DataFrame({"feature": list(imp_d.keys()),
                                "importance": list(imp_d.values())})
    else:
        imp_df = pd.DataFrame({"feature": feat_list,
                                "importance": lgb_booster.feature_importance("gain")})
else:
    ftt_model.eval()
    Xn = (X_test.fillna(col_medians) - norm_df["mean"]) / norm_df["std"].replace(0,1)
    Xn_np = Xn.fillna(0.0).values.astype("float32")
    Xt = torch.from_numpy(Xn_np).to(DEVICE).requires_grad_(True)
    logits = ftt_model(Xt)
    logits.sum().backward()
    imp_vals = Xt.grad.abs().mean(dim=0).cpu().numpy()
    imp_df = pd.DataFrame({"feature": feat_list, "importance": imp_vals})

imp_df = imp_df.sort_values("importance", ascending=False).reset_index(drop=True)
imp_df["rank"] = imp_df.index + 1
imp_df.to_csv(REP / "feature_importance.csv", index=False)
top20 = imp_df.head(20)
fig, ax = plt.subplots(figsize=(10, 8))
colors_fi = plt.cm.viridis(np.linspace(0.2, 0.9, len(top20)))
ax.barh(top20["feature"][::-1], top20["importance"][::-1], color=colors_fi)
ax.set_xlabel("Feature Importance (Gain)")
ax.set_title(f"Top 20 Feature Importances — {best_model_name} (MOMENT Module A)",
             fontweight="bold")
ax.grid(axis="x", alpha=0.3)
plt.tight_layout()
plt.savefig(REP / "feature_importance.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'feature_importance.png'}  +  feature_importance.csv")

# ── SHAP ─────────────────────────────────────────────────────
print("\nComputing SHAP values ...")
try:
    Xtest_filled = X_test.fillna(col_medians)
    if best_model_name == "XGBoost":
        explainer   = shap.TreeExplainer(xgb_model)
        shap_values = explainer.shap_values(Xtest_filled)
    elif best_model_name == "LightGBM":
        explainer   = shap.TreeExplainer(lgb_booster)
        shap_values = explainer.shap_values(Xtest_filled)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
    else:
        # Fast KernelExplainer for FTTransformer using sub-sampled background and evaluation set
        bg = shap.sample(Xtest_filled.values, 15, random_state=SEED)
        explainer = shap.KernelExplainer(ftt_predict, bg)
        shap_sample_X = Xtest_filled.iloc[:30]
        shap_values = explainer.shap_values(shap_sample_X.values, nsamples=50)
        Xtest_filled = shap_sample_X

    fig, ax = plt.subplots(figsize=(10, 8))
    shap.summary_plot(shap_values, Xtest_filled, show=False,
                      max_display=20)
    plt.title(f"SHAP Feature Impact — {best_model_name}", fontweight="bold")
    plt.tight_layout()
    plt.savefig(REP / "shap_summary.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved: {REP / 'shap_summary.png'}")
except Exception as e:
    print(f"  SHAP failed ({e}) — noted in SUMMARY.md")

# ── 5-fold CV stability ───────────────────────────────────────
print("\n5-fold CV stability ...")
X_all = pd.concat([X_train, X_val], ignore_index=True).astype("float32")
y_all = pd.concat([y_train, y_val], ignore_index=True).astype(int)
cv    = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
cv_rows = []

for fold, (tr_idx, vl_idx) in enumerate(cv.split(X_all, y_all)):
    Xtr, ytr = X_all.iloc[tr_idx].fillna(col_medians), y_all.iloc[tr_idx]
    Xvl, yvl = X_all.iloc[vl_idx].fillna(col_medians), y_all.iloc[vl_idx]

    if best_model_name == "XGBoost":
        m = xgb.XGBClassifier(
            **{k: v for k, v in xgb_model.get_params().items()
               if k not in ("early_stopping_rounds",)},
            n_estimators=xgb_model.best_iteration or 100, verbosity=0)
        m.fit(Xtr, ytr)
        raw_p = m.predict_proba(Xvl)[:, 1]
    elif best_model_name == "LightGBM":
        n_neg_fold = int((ytr==0).sum()); n_pos_fold = int((ytr==1).sum())
        m = lgb.LGBMClassifier(
            n_estimators=lgb_booster.num_trees(),
            learning_rate=0.092074,
            num_leaves=60, max_depth=11,
            min_child_samples=55,
            subsample=0.55245, colsample_bytree=0.928935,
            reg_alpha=0.781683, reg_lambda=0.071771,
            scale_pos_weight=n_neg_fold/max(n_pos_fold, 1),
            objective="binary", verbosity=-1, random_state=SEED)
        m.fit(Xtr, ytr)
        raw_p = m.predict_proba(Xvl)[:, 1]
    else:
        raw_p = ftt_predict(pd.DataFrame(Xvl.values, columns=feat_list))

    # Calibrate within fold (fit on same fold val, applying back to same fold val)
    iso_fold = IsotonicRegression(out_of_bounds="clip")
    iso_fold.fit(raw_p, yvl)
    cal_p = iso_fold.predict(raw_p)

    # Threshold on this fold's val
    t_f2, _ = threshold_f2_on_val(yvl.values, cal_p)
    ypred    = (cal_p >= t_f2).astype(int)

    cv_rows.append({
        "fold":      fold + 1,
        "pr_auc":    round(average_precision_score(yvl, cal_p), 4),
        "roc_auc":   round(roc_auc_score(yvl, cal_p), 4),
        "f1":        round(f1_score(yvl, ypred, zero_division=0), 4),
        "f2":        round(fbeta_score(yvl, ypred, beta=2, zero_division=0), 4),
        "recall":    round(recall_score(yvl, ypred, zero_division=0), 4),
        "precision": round(precision_score(yvl, ypred, zero_division=0), 4),
        "accuracy":  round(accuracy_score(yvl, ypred), 4),
    })
    print(f"  Fold {fold+1}: PR-AUC={cv_rows[-1]['pr_auc']:.4f}  "
          f"F2={cv_rows[-1]['f2']:.4f}  Recall={cv_rows[-1]['recall']:.4f}")

cv_df = pd.DataFrame(cv_rows)
cv_df.to_csv(REP / "cv_fold_metrics.csv", index=False)

fig, ax = plt.subplots(figsize=(12, 6))
cv_long = cv_df[["pr_auc","roc_auc","f1","f2","recall","precision","accuracy"]].melt(
    var_name="metric", value_name="score")
sns.boxplot(x="metric", y="score", data=cv_long, ax=ax,
            palette="Set2", showfliers=True, width=0.5)
sns.swarmplot(x="metric", y="score", data=cv_long, ax=ax,
              color="black", size=6, alpha=0.7)
ax.set_title(f"5-Fold CV Metric Stability — {best_model_name}", fontweight="bold")
ax.set_ylabel("Score"); ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.savefig(REP / "cv_metrics_boxplot.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'cv_fold_metrics.csv'}  +  cv_metrics_boxplot.png")

# ── Risk tier distribution ────────────────────────────────────
def assign_tier(p):
    if p < 0.05:   return "Routine"
    elif p < 0.15: return "Enhanced"
    else:          return "Escalated"

tier_col = [assign_tier(p) for p in best_cal_test]
tier_df  = pd.DataFrame({"tier": tier_col, "actual_pph": y_test.values,
                          "pred_prob": best_cal_test})
tier_summary = tier_df.groupby(["tier","actual_pph"]).size().reset_index(name="count")
tier_summary.to_csv(REP / "risk_tier_distribution.csv", index=False)

tier_order  = ["Routine", "Enhanced", "Escalated"]
tier_counts = tier_df["tier"].value_counts().reindex(tier_order, fill_value=0)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
ax1.bar(tier_counts.index, tier_counts.values, color=["#22c55e","#f97316","#ef4444"])
for i, (t, v) in enumerate(zip(tier_counts.index, tier_counts.values)):
    ax1.text(i, v+10, str(v), ha="center", fontweight="bold")
ax1.set_title("Risk Tier Distribution (test set)", fontweight="bold")
ax1.set_ylabel("Count"); ax1.grid(axis="y", alpha=0.3)

tier_pivot = tier_df.groupby(["tier","actual_pph"]).size().unstack(fill_value=0)
tier_pivot = tier_pivot.reindex(tier_order)
tier_pivot.columns = ["No PPH", "PPH"]
tier_pivot.plot(kind="bar", ax=ax2, color=["#93c5fd","#ef4444"], width=0.6)
ax2.set_title("Tier vs Actual PPH Outcome", fontweight="bold")
ax2.set_xlabel("Risk Tier"); ax2.set_ylabel("Count")
ax2.tick_params(axis="x", rotation=20); ax2.grid(axis="y", alpha=0.3)
plt.suptitle("MOMENT Module A — Risk Tier Distribution", fontweight="bold")
plt.tight_layout()
plt.savefig(REP / "risk_tier_distribution.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'risk_tier_distribution.png'}  +  risk_tier_distribution.csv")

# ── 50-row prediction sample ──────────────────────────────────
rng2       = np.random.default_rng(SEED)
sample_idx = rng2.choice(len(X_test), size=min(50, len(X_test)), replace=False)
s_df       = X_test.iloc[sample_idx].copy()
s_df["true_label"]  = y_test.values[sample_idx]
s_df["pred_prob"]   = best_cal_test[sample_idx]
s_df["risk_tier"]   = [assign_tier(p) for p in best_cal_test[sample_idx]]
s_df["pred_label_90spec_thresh"] = (best_cal_test[sample_idx] >= primary_thresh).astype(int)
s_df.to_csv(REP / "prediction_vs_actual_sample.csv", index=False)
print(f"Saved: {REP / 'prediction_vs_actual_sample.csv'}")

# ── Model comparison table ────────────────────────────────────
model_comp_rows = []
for name in ["XGBoost", "LightGBM", "FTTransformer"]:
    cal_val_p  = val_probs_cal[name]
    cal_test_p = test_probs_cal[name]
    model_comp_rows.append({
        "model":           name,
        "is_custom_impl":  name == "FTTransformer",
        "val_pr_auc":      round(average_precision_score(y_val, cal_val_p), 4),
        "test_pr_auc":     round(average_precision_score(y_test, cal_test_p), 4),
        "test_roc_auc":    round(roc_auc_score(y_test, cal_test_p), 4),
        "test_brier":      round(brier_score_loss(y_test, cal_test_p), 4),
        "test_ece_postcal":round(compute_ece(y_test.values, cal_test_p), 4),
        "note": ("simplified custom implementation — not Gorishniy et al. 2021"
                 if name == "FTTransformer" else ""),
    })
pd.DataFrame(model_comp_rows).to_csv(REP / "model_comparison.csv", index=False)
print(f"Saved: {REP / 'model_comparison.csv'}")

print("\n[DONE] 11_calibrate_evaluate.py")
