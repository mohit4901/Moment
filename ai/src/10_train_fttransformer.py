"""
Script 10 — Train FT-Transformer (Feature Tokenizer Transformer)
Custom PyTorch implementation of FT-Transformer for tabular data.
Architecture: each feature → independent d_token linear embedding →
              CLS + feature tokens → Transformer encoder → binary head.
- Early stopping on val PR-AUC (patience=20)
- Saves:
    models/fttransformer_model.pt
    reports/fttransformer_train_val_curve.png + .csv
"""
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import average_precision_score, log_loss
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
REP  = ROOT / "reports"
MDL  = ROOT / "models"
MDL.mkdir(parents=True, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

# Use MPS (Apple Silicon) if available, else CPU
DEVICE = (torch.device("mps") if torch.backends.mps.is_available()
          else torch.device("cuda") if torch.cuda.is_available()
          else torch.device("cpu"))
print("=" * 60)
print(f"STEP 10 — FT-Transformer  (device={DEVICE})")
print("=" * 60)

# ── Load data ─────────────────────────────────────────────────
X_train = pd.read_parquet(PROC / "X_train.parquet").astype("float32")
y_train = pd.read_parquet(PROC / "y_train.parquet")["pph_label"].astype("float32")
X_val   = pd.read_parquet(PROC / "X_val.parquet").astype("float32")
y_val   = pd.read_parquet(PROC / "y_val.parquet")["pph_label"].astype("float32")

# Impute NaNs with column median.
# IMPORTANT: maternal_hemoglobin_gdl is 100% NaN → median is NaN.
# Replace NaN medians with 0 so fillna() actually fills those columns.
col_medians = X_train.median().fillna(0.0)
X_train = X_train.fillna(col_medians)
X_val   = X_val.fillna(col_medians)

# Load or save medians (shared with script 11)
medians_path = PROC / "feature_medians.csv"
if not medians_path.exists():
    col_medians.to_csv(medians_path)
else:
    # Update in place so script 11 also gets 0 for the 100%-NaN column
    col_medians.to_csv(medians_path)

# Z-score normalise.
# - 100%-NaN columns have mean=0, std=0 after fillna(0) → both become 0, no scaling.
# - Other zero-variance columns (hb_missing_indicator) get std=1.
feat_list  = list(X_train.columns)
train_mean = X_train.mean().fillna(0.0)
train_std  = X_train.std().fillna(0.0).replace(0, 1)   # 0-var → no scaling
X_train_n  = (X_train - train_mean) / train_std
X_val_n    = (X_val   - train_mean) / train_std

# Safety: force-fill any residual NaN with 0 (should not be needed now)
X_train_n = X_train_n.fillna(0.0)
X_val_n   = X_val_n.fillna(0.0)

assert not X_train_n.isna().any().any(), "NaN in X_train_n after imputation!"
assert not X_val_n.isna().any().any(),   "NaN in X_val_n after imputation!"
print(f"  NaN check passed. Feature matrix shape: {X_train_n.shape}")

# Save normalisation stats (shared with script 11)
norm_path = PROC / "feature_norm_stats.csv"
norm_df = pd.DataFrame({"feature": feat_list,
                         "mean": train_mean.values,
                         "std":  train_std.values})
norm_df.to_csv(norm_path, index=False)

n_features = X_train_n.shape[1]
pos_weight = torch.tensor([(y_train == 0).sum() / (y_train == 1).sum()],
                           dtype=torch.float32).to(DEVICE)

# ── FT-Transformer model ──────────────────────────────────────
class FTTransformer(nn.Module):
    """
    Feature Tokenizer Transformer (simplified).
    Each input feature gets its own d_token-dimensional embedding via
    an independent linear projection. A learnable CLS token is prepended.
    The Transformer encoder processes all feature tokens jointly.
    The CLS token output feeds a binary classification head.
    """
    def __init__(self, n_features: int, d_token: int = 64,
                 n_heads: int = 8, n_layers: int = 3,
                 d_ffn: int = 256, dropout: float = 0.1):
        super().__init__()
        self.d_token = d_token
        # Independent W+b per feature (FT-style tokenizer)
        self.feature_weights = nn.Parameter(torch.empty(n_features, d_token))
        self.feature_biases  = nn.Parameter(torch.zeros(n_features, d_token))
        nn.init.kaiming_uniform_(self.feature_weights, nonlinearity="relu")

        self.cls_token = nn.Parameter(torch.zeros(1, 1, d_token))
        nn.init.normal_(self.cls_token, std=0.02)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_token, nhead=n_heads,
            dim_feedforward=d_ffn, dropout=dropout,
            batch_first=True, norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer,
                                                  num_layers=n_layers)
        self.norm = nn.LayerNorm(d_token)
        self.head = nn.Linear(d_token, 1)
        self.drop = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, F) — normalised features
        # Tokenize: each feature scalar → d_token vector
        # x.unsqueeze(-1): (B, F, 1)
        tokens = x.unsqueeze(-1) * self.feature_weights + self.feature_biases
        # tokens: (B, F, d_token)
        cls = self.cls_token.expand(x.size(0), -1, -1)  # (B, 1, d_token)
        tokens = torch.cat([cls, tokens], dim=1)          # (B, F+1, d_token)
        out    = self.transformer(tokens)                  # (B, F+1, d_token)
        cls_out = self.norm(out[:, 0, :])                  # (B, d_token)
        return self.head(self.drop(cls_out)).squeeze(-1)   # (B,)


# ── Dataloaders ───────────────────────────────────────────────
BATCH_SIZE = 512

def to_tensor(X, y):
    Xt = torch.tensor(X.values, dtype=torch.float32)
    yt = torch.tensor(y.values, dtype=torch.float32)
    return TensorDataset(Xt, yt)

train_ds = to_tensor(X_train_n, y_train)
val_ds   = to_tensor(X_val_n,   y_val)
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                          num_workers=0, pin_memory=False)
val_loader   = DataLoader(val_ds,   batch_size=1024, shuffle=False,
                          num_workers=0)

# ── Model, optimizer, scheduler ──────────────────────────────
model = FTTransformer(n_features=n_features, d_token=64,
                      n_heads=8, n_layers=3, d_ffn=256, dropout=0.1).to(DEVICE)
n_params = sum(p.numel() for p in model.parameters())
print(f"Model parameters: {n_params:,}")

optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
    optimizer, T_0=20, T_mult=2
)
criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

# ── Training loop with early stopping ────────────────────────
PATIENCE   = 1000
MAX_EPOCHS = 1000
best_val_prauc = -1.0
best_epoch     = 0
patience_counter = 0
best_state = None

history = {"epoch": [], "train_loss": [], "val_loss": [],
           "train_prauc": [], "val_prauc": []}

print(f"\nTraining FT-Transformer (max {MAX_EPOCHS} epochs, patience={PATIENCE}) ...")

for epoch in range(1, MAX_EPOCHS + 1):
    # ── Train ──
    model.train()
    train_losses, train_preds, train_labels = [], [], []
    for Xb, yb in train_loader:
        Xb, yb = Xb.to(DEVICE), yb.to(DEVICE)
        optimizer.zero_grad()
        logits = model(Xb)
        loss   = criterion(logits, yb)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        train_losses.append(loss.item() * len(yb))
        train_preds.extend(torch.sigmoid(logits).detach().cpu().numpy())
        train_labels.extend(yb.cpu().numpy())
    scheduler.step()

    train_loss   = sum(train_losses) / len(train_ds)
    train_prauc  = average_precision_score(train_labels, train_preds)

    # ── Validate ──
    model.eval()
    val_losses, val_preds, val_labels = [], [], []
    with torch.no_grad():
        for Xb, yb in val_loader:
            Xb, yb = Xb.to(DEVICE), yb.to(DEVICE)
            logits = model(Xb)
            loss   = criterion(logits, yb)
            val_losses.append(loss.item() * len(yb))
            val_preds.extend(torch.sigmoid(logits).cpu().numpy())
            val_labels.extend(yb.cpu().numpy())

    val_loss  = sum(val_losses) / len(val_ds)
    val_prauc = average_precision_score(val_labels, val_preds)

    history["epoch"].append(epoch)
    history["train_loss"].append(train_loss)
    history["val_loss"].append(val_loss)
    history["train_prauc"].append(train_prauc)
    history["val_prauc"].append(val_prauc)

    if epoch % 10 == 0 or epoch <= 5:
        print(f"  Epoch {epoch:>4} | train_loss={train_loss:.4f} "
              f"val_loss={val_loss:.4f} | "
              f"train_PR-AUC={train_prauc:.4f} val_PR-AUC={val_prauc:.4f}")

    # Early stopping
    if val_prauc > best_val_prauc:
        best_val_prauc   = val_prauc
        best_epoch       = epoch
        patience_counter = 0
        best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
    else:
        patience_counter += 1
        if patience_counter >= PATIENCE:
            print(f"\n  Early stopping at epoch {epoch} "
                  f"(best: epoch {best_epoch}, val PR-AUC={best_val_prauc:.4f})")
            break

# ── Restore best weights ──────────────────────────────────────
model.load_state_dict(best_state)
torch.save({
    "model_state_dict": best_state,
    "n_features":       n_features,
    "feat_list":        feat_list,
    "train_mean":       train_mean.to_dict(),
    "train_std":        train_std.to_dict(),
    "best_epoch":       best_epoch,
    "best_val_prauc":   best_val_prauc,
}, MDL / "fttransformer_model.pt")
print(f"Saved: {MDL / 'fttransformer_model.pt'}")

# ── Curves ────────────────────────────────────────────────────
hist_df = pd.DataFrame(history)
hist_df.to_csv(REP / "fttransformer_train_val_curve.csv", index=False)
print(f"Saved: {REP / 'fttransformer_train_val_curve.csv'}")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
for ax, metric, title in [
    (ax1, ("train_loss", "val_loss"), "BCE Loss"),
    (ax2, ("train_prauc", "val_prauc"), "PR-AUC"),
]:
    ax.plot(hist_df["epoch"], hist_df[metric[0]], label="Train",
            color="#3b82f6", alpha=0.8)
    ax.plot(hist_df["epoch"], hist_df[metric[1]], label="Val",
            color="#ef4444", alpha=0.8)
    ax.axvline(best_epoch, color="#22c55e", linestyle="--",
               label=f"Best (epoch {best_epoch})")
    ax.set_xlabel("Epoch"); ax.set_title(f"FT-Transformer — {title}", fontweight="bold")
    ax.legend(); ax.grid(alpha=0.3)

plt.suptitle("FT-Transformer Training Curves (MOMENT Module A)", fontweight="bold")
plt.tight_layout()
plt.savefig(REP / "fttransformer_train_val_curve.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'fttransformer_train_val_curve.png'}")

print(f"\nBest val PR-AUC: {best_val_prauc:.4f}  at epoch {best_epoch}")
print("\n[DONE] 10_train_fttransformer.py")
