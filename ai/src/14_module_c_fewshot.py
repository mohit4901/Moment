"""
Script 14 — Module C: Few-Shot Classifier Head
================================================
⚠️  EXPERIMENTAL PROOF-OF-CONCEPT — NOT STATISTICALLY RELIABLE
⚠️  N=3 base images per class — results are not generalisable
⚠️  Labeled "proxy_pretraining — not clinically validated" throughout
================================================

Pipeline:
  1. Load 3 clinical reference pad photos (Routine / Amber / Critical)
  2. Augment each to ~200 variants (heavy augmentation)
  3. Freeze pretrained backbone (from script 13)
  4. Train small 3-class softmax head with early stopping on val accuracy
  5. Evaluate on held-out augmented val split

Saves:
  models/fewshot_head.pt
  reports/module_c_fewshot_confusion_matrix.png + .csv
  reports/module_c_fewshot_classification_report.csv
"""
import numpy as np
import pandas as pd
from pathlib import Path
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, TensorDataset
from torchvision import models, transforms
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (confusion_matrix, classification_report,
                              accuracy_score)

ROOT  = Path(__file__).resolve().parent.parent
DATA  = ROOT / "data"
REP   = ROOT / "reports"
MDL   = ROOT / "models"
PHOTO = DATA / "clinical_test_pad_photos"
REP.mkdir(parents=True, exist_ok=True)

SEED  = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

PROXY_LABEL   = "proxy_pretraining — not clinically validated"
N_AUGMENTS    = 200          # variants per base image
IMG_SIZE      = 224
BATCH_SIZE    = 32
MAX_EPOCHS    = 1000
PATIENCE      = 1000

CLASSES = {
    0: "Routine",
    1: "Amber",
    2: "Critical",
}
# Map filenames to class indices
PHOTO_MAP = {
    "01_ROUTINE_LOCHIA_LIGHT.jpg": 0,
    "02_AMBER_WATCH_MODERATE.jpg": 1,
    "03_CRITICAL_PPH_HEAVY.jpg":   2,
}

DEVICE = (torch.device("mps") if torch.backends.mps.is_available()
          else torch.device("cuda") if torch.cuda.is_available()
          else torch.device("cpu"))

print("=" * 60)
print("STEP 14 — Module C: Few-Shot Classifier Head")
print(f"          {PROXY_LABEL}")
print(f"          N=3 base images — proof-of-concept only")
print(f"          device={DEVICE}")
print("=" * 60)

# ── Augmentation pipeline (heavy, to maximise diversity from 3 images) ──
augment = transforms.Compose([
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.5, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(45),
    transforms.ColorJitter(brightness=0.5, contrast=0.5,
                           saturation=0.4, hue=0.1),
    transforms.RandomGrayscale(p=0.05),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.3, scale=(0.02, 0.20)),
])
val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Step 1: Load and augment base images ─────────────────────
all_tensors = []
all_labels  = []

for fname, class_idx in PHOTO_MAP.items():
    fpath = PHOTO / fname
    if not fpath.exists():
        print(f"  [WARN] Reference photo not found: {fpath}")
        # Create a solid-color placeholder
        base_img = Image.new("RGB", (512, 512),
                             color=[(180, 230, 180), (230, 200, 150), (220, 150, 150)][class_idx])
    else:
        base_img = Image.open(fpath).convert("RGB")
        print(f"  Loaded: {fname}  class={CLASSES[class_idx]}")

    # Generate N_AUGMENTS augmented variants
    for _ in range(N_AUGMENTS):
        t = augment(base_img)
        all_tensors.append(t)
        all_labels.append(class_idx)

X_all = torch.stack(all_tensors)   # (3*N_AUGMENTS, 3, 224, 224)
y_all = torch.tensor(all_labels, dtype=torch.long)
print(f"\nTotal augmented samples: {len(X_all)}  "
      f"({N_AUGMENTS} per class × 3 classes)")

# ── Step 2: Stratified 80/20 train/val split ─────────────────
from sklearn.model_selection import train_test_split
idx      = np.arange(len(X_all))
tr_idx, vl_idx = train_test_split(idx, test_size=0.20, random_state=SEED,
                                   stratify=y_all.numpy())

X_train, y_train = X_all[tr_idx], y_all[tr_idx]
X_val,   y_val   = X_all[vl_idx], y_all[vl_idx]

train_ld = DataLoader(TensorDataset(X_train, y_train),
                      batch_size=BATCH_SIZE, shuffle=True)
val_ld   = DataLoader(TensorDataset(X_val, y_val),
                      batch_size=64, shuffle=False)
print(f"Train: {len(X_train)}  Val: {len(X_val)}")

# ── Step 3: Load frozen backbone ─────────────────────────────
backbone_ckpt = MDL / "pph_image_backbone.pt"
backbone      = models.resnet50(weights=None)
in_features   = backbone.fc.in_features
backbone.fc   = nn.Identity()      # remove original head

if backbone_ckpt.exists():
    ckpt = torch.load(backbone_ckpt, map_location="cpu", weights_only=False)
    state = ckpt.get("backbone_state_dict", ckpt)
    # Filter keys that match backbone (no fc.)
    state_filtered = {k: v for k, v in state.items()
                      if not k.startswith("fc.")}
    missing, unexpected = backbone.load_state_dict(state_filtered, strict=False)
    print(f"  Backbone loaded. Missing={len(missing)} Unexpected={len(unexpected)}")
else:
    print("  [WARN] Backbone checkpoint not found — using random init.")

# Freeze all backbone parameters
for param in backbone.parameters():
    param.requires_grad = False
backbone.eval()
backbone = backbone.to(DEVICE)

# ── Step 4: Small classifier head (trainable only) ───────────
classifier = nn.Sequential(
    nn.Linear(in_features, 128),
    nn.ReLU(),
    nn.Dropout(0.4),
    nn.Linear(128, 3),          # 3 classes
).to(DEVICE)

optimizer = torch.optim.Adam(classifier.parameters(), lr=3e-4)
criterion = nn.CrossEntropyLoss()

# ── Pre-extract frozen backbone features once ───────────────
print("Pre-extracting features through frozen backbone...", flush=True)
backbone.eval()
def extract_feats(loader):
    all_f, all_y = [], []
    with torch.no_grad():
        for Xb, yb in loader:
            Xb = Xb.to(DEVICE)
            feats = backbone(Xb)
            all_f.append(feats.cpu())
            all_y.append(yb)
    return torch.cat(all_f), torch.cat(all_y)

tr_feats, tr_labels = extract_feats(train_ld)
vl_feats, vl_labels = extract_feats(val_ld)

feat_train_ld = DataLoader(TensorDataset(tr_feats, tr_labels), batch_size=BATCH_SIZE, shuffle=True)
feat_val_ld   = DataLoader(TensorDataset(vl_feats, vl_labels), batch_size=BATCH_SIZE, shuffle=False)

# ── Step 5: Training with early stopping ─────────────────────
best_val_acc   = -1.0
best_epoch     = 0
patience_ctr   = 0
best_head_state = None
history        = {"epoch": [], "train_loss": [], "val_loss": [],
                  "train_acc": [], "val_acc": []}

print(f"\nTraining classifier head (max {MAX_EPOCHS} epochs, patience={PATIENCE}) ...", flush=True)

for epoch in range(1, MAX_EPOCHS + 1):
    # Train
    classifier.train()
    tr_loss, tr_correct = 0.0, 0
    for feats, yb in feat_train_ld:
        feats, yb = feats.to(DEVICE), yb.to(DEVICE)
        optimizer.zero_grad()
        logits = classifier(feats)
        loss   = criterion(logits, yb)
        loss.backward()
        optimizer.step()
        tr_loss    += loss.item() * len(yb)
        tr_correct += (logits.argmax(1) == yb).sum().item()

    tr_loss /= len(X_train)
    tr_acc   = tr_correct / len(X_train)

    # Validate
    classifier.eval()
    vl_loss, vl_correct = 0.0, 0
    all_preds, all_true = [], []
    with torch.no_grad():
        for feats, yb in feat_val_ld:
            feats, yb = feats.to(DEVICE), yb.to(DEVICE)
            logits = classifier(feats)
            loss   = criterion(logits, yb)
            vl_loss    += loss.item() * len(yb)
            vl_correct += (logits.argmax(1) == yb).sum().item()
            all_preds.extend(logits.argmax(1).cpu().numpy())
            all_true.extend(yb.cpu().numpy())

    vl_loss /= len(X_val)
    vl_acc   = vl_correct / len(X_val)

    history["epoch"].append(epoch)
    history["train_loss"].append(tr_loss)
    history["val_loss"].append(vl_loss)
    history["train_acc"].append(tr_acc)
    history["val_acc"].append(vl_acc)

    if epoch % 100 == 0 or epoch <= 3:
        print(f"  Epoch {epoch:>4} | loss={tr_loss:.4f}/{vl_loss:.4f}  "
              f"acc={tr_acc:.3f}/{vl_acc:.3f}", flush=True)

    if vl_acc > best_val_acc:
        best_val_acc    = vl_acc
        best_epoch      = epoch
        patience_ctr    = 0
        best_head_state = {k: v.cpu().clone()
                           for k, v in classifier.state_dict().items()}
        best_preds      = list(all_preds)
        best_true       = list(all_true)
    else:
        patience_ctr += 1
        if patience_ctr >= PATIENCE:
            print(f"\n  Completed at epoch {epoch} "
                  f"(best epoch={best_epoch}, val acc={best_val_acc:.3f})")
            break

print(f"\nFinished full {MAX_EPOCHS} epochs (best epoch={best_epoch}, val acc={best_val_acc:.3f})")

classifier.load_state_dict(best_head_state)
torch.save({
    "head_state_dict": best_head_state,
    "classes":         CLASSES,
    "best_epoch":      best_epoch,
    "best_val_acc":    best_val_acc,
    "note":            f"N=3 base images. {PROXY_LABEL}",
}, MDL / "fewshot_head.pt")
print(f"Saved: {MDL / 'fewshot_head.pt'}")

# ── Step 6: Evaluation outputs ────────────────────────────────
class_names = [CLASSES[i] for i in range(3)]

# Confusion matrix
cm     = confusion_matrix(best_true, best_preds)
cm_df  = pd.DataFrame(cm, index=class_names, columns=class_names)
cm_df.to_csv(REP / "module_c_fewshot_confusion_matrix.csv")

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt="d", cmap="Purples", ax=ax,
            xticklabels=class_names, yticklabels=class_names)
ax.set_title(
    f"Module C Few-Shot Confusion Matrix\n"
    f"⚠️  N=3 base images — not statistically reliable — proof-of-concept only\n"
    f"Val acc={best_val_acc:.3f}  (best epoch={best_epoch})",
    fontweight="bold", fontsize=10)
ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
plt.tight_layout()
plt.savefig(REP / "module_c_fewshot_confusion_matrix.png", dpi=150, bbox_inches="tight")
plt.close()
print(f"Saved: {REP / 'module_c_fewshot_confusion_matrix.png'}  +  .csv")

# Classification report
report = classification_report(best_true, best_preds,
    target_names=class_names, output_dict=True)
cr_df  = pd.DataFrame(report).T
cr_df.index.name = "class"
cr_df["note"] = "N=3 base images, not statistically reliable, proof-of-concept only"
cr_df.to_csv(REP / "module_c_fewshot_classification_report.csv")
print(f"Saved: {REP / 'module_c_fewshot_classification_report.csv'}")

print(classification_report(best_true, best_preds, target_names=class_names))
print("\n⚠️  REMINDER: N=3 base images, not statistically reliable, proof-of-concept only.")
print("\n[DONE] 14_module_c_fewshot.py")
