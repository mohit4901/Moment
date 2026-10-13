"""
Script 13 — Module C: ResNet-50 Proxy Pretraining
=====================================================
⚠️  EXPERIMENTAL COMPUTER-VISION PROTOTYPE — PROOF OF CONCEPT ONLY
⚠️  All outputs are labeled "proxy_pretraining — not clinically validated"
⚠️  Borealis forensic bovine-blood drip patterns ≠ clinical obstetric blood loss
⚠️  proxy_label is a mathematical construct, NOT a clinical measurement
=====================================================

Pipeline:
  1. Extract Borealis zip files (paper25/50/75/100cm)
  2. Parse filenames → drops (1-10) + height_cm (25/50/75/100)
  3. proxy_label = 0.7*norm(drops) + 0.3*norm(height_cm)
  4. Save data/manifest.csv
  5. ResNet-50 (ImageNet pretrained) + regression head
  6. Heavy augmentation, early stopping on val MSE (patience=10)
  7. Save models/pph_image_backbone.pt (backbone weights only)
  8. reports/module_c_pretrain_curve.png + .csv
  9. reports/module_c_pretrain_predictions_sample.png (12-image grid)
"""
import os, re, zipfile
os.environ["OMP_NUM_THREADS"] = "1"
import pandas as pd
import numpy as np
from pathlib import Path
import torch
torch.set_num_threads(1)
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from torchvision.transforms import functional as F
from PIL import Image, UnidentifiedImageError
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

ROOT    = Path(__file__).resolve().parent.parent
DATA    = ROOT / "data"
BORIS   = DATA / "borealis"
PROC    = DATA / "processed"
REP     = ROOT / "reports"
MDL     = ROOT / "models"
REP.mkdir(parents=True, exist_ok=True)
MDL.mkdir(parents=True, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

DEVICE = (torch.device("mps") if torch.backends.mps.is_available()
          else torch.device("cuda") if torch.cuda.is_available()
          else torch.device("cpu"))

PROXY_LABEL = "proxy_pretraining — not clinically validated"

print("=" * 60)
print(f"STEP 13 — Module C: ResNet-50 Proxy Pretraining")
print(f"          {PROXY_LABEL}")
print(f"          device={DEVICE}")
print("=" * 60)

# ── Step 1: Extract Borealis zips if not already done ─────────
for height in [25, 50, 75, 100]:
    zip_path = DATA / f"paper{height}cm.zip"
    dest_dir = BORIS / f"paper{height}cm"
    dest_dir.mkdir(parents=True, exist_ok=True)
    marker = dest_dir / ".extracted"
    if not marker.exists() and zip_path.exists():
        print(f"  Extracting {zip_path.name} → {dest_dir} ...")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(dest_dir)
        marker.touch()
        print(f"  Done.")
    elif not zip_path.exists():
        print(f"  [SKIP] {zip_path.name} not found")

# ── Step 2: Build manifest ─────────────────────────────────────
IMG_EXTS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}

# Folder structure: paper{H}cm / {D}-{rep} / {D}-{rep}edit.jpg or similar
# Drop count D is the first integer in the subfolder name.
# Height is extracted from the parent folder name.

records = []
for height in [25, 50, 75, 100]:
    height_dir = BORIS / f"paper{height}cm" / f"paper{height}cm"
    if not height_dir.exists():
        # Try without the double nesting
        height_dir = BORIS / f"paper{height}cm"
    for sub in sorted(height_dir.iterdir()):
        if not sub.is_dir():
            continue
        # Parse drop count from subfolder name e.g. "1-3" → drops=1
        match = re.match(r"(\d+)", sub.name)
        if not match:
            continue
        drops = int(match.group(1))
        if not (1 <= drops <= 10):
            continue
        # Find primary image (prefer *edit.jpg, else first jpg)
        imgs = [f for f in sub.iterdir() if f.suffix in IMG_EXTS
                and "RedChannel" not in f.name]
        if not imgs:
            continue
        # Prefer edit images
        edit_imgs = [f for f in imgs if "edit" in f.name.lower()]
        img_path = edit_imgs[0] if edit_imgs else imgs[0]
        records.append({
            "image_path": str(img_path),
            "drops":      drops,
            "height_cm":  height,
        })

if not records:
    print("[WARN] No images found in Borealis dirs — check extraction.")
else:
    print(f"Found {len(records)} images across 4 height folders.")

manifest = pd.DataFrame(records)

# ── proxy_label = 0.7*norm(drops) + 0.3*norm(height) ─────────
if len(manifest) > 0:
    manifest["drops_norm"]  = (manifest["drops"]     - 1)  / (10 - 1)
    manifest["height_norm"] = (manifest["height_cm"] - 25) / (100 - 25)
    manifest["proxy_label"] = (0.7 * manifest["drops_norm"] +
                               0.3 * manifest["height_norm"]).round(4)
    manifest["proxy_note"]  = PROXY_LABEL

    manifest_path = DATA / "manifest.csv"
    manifest.to_csv(manifest_path, index=False)
    print(f"Saved: {manifest_path}")
    print(f"  proxy_label range: "
          f"{manifest['proxy_label'].min():.3f} – {manifest['proxy_label'].max():.3f}")

# ── Step 3: Dataset + DataLoader ──────────────────────────────
IMG_SIZE = 224

augment_train = transforms.Compose([
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.6, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.ColorJitter(brightness=0.4, contrast=0.4,
                           saturation=0.3, hue=0.05),
    transforms.RandomRotation(30),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.2, scale=(0.02, 0.15)),
])
augment_val = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

base_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

class BorealisDataset(Dataset):
    def __init__(self, df, is_train=False):
        self.df       = df.reset_index(drop=True)
        self.is_train = is_train
        tensors = []
        labels  = []
        for idx in range(len(self.df)):
            row = self.df.iloc[idx]
            try:
                img = Image.open(row["image_path"]).convert("RGB")
            except (FileNotFoundError, UnidentifiedImageError):
                img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), color=(200, 180, 180))
            tensors.append(base_transform(img))
            labels.append(float(row["proxy_label"]))
        self.X = torch.stack(tensors)
        self.y = torch.tensor(labels, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        x = self.X[idx]
        if self.is_train:
            if torch.rand(1).item() > 0.5:
                x = torch.flip(x, [2])
            if torch.rand(1).item() > 0.5:
                x = torch.flip(x, [1])
        return x, self.y[idx]

if len(manifest) > 0:
    train_df, val_df = train_test_split(manifest, test_size=0.2,
                                         random_state=SEED,
                                         stratify=manifest["drops"])
    train_ds = BorealisDataset(train_df, is_train=True)
    val_ds   = BorealisDataset(val_df,   is_train=False)
    train_ld = DataLoader(train_ds, batch_size=64, shuffle=True,  num_workers=0)
    val_ld   = DataLoader(val_ds,   batch_size=64, shuffle=False, num_workers=0)
    print(f"\nTrain: {len(train_ds)}  Val: {len(val_ds)} images", flush=True)
else:
    print("[WARN] No images — creating placeholder model only.")
    train_ld = val_ld = []

# ── Step 4: ResNet-50 + regression head ──────────────────────
backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
in_features = backbone.fc.in_features
backbone.fc = nn.Sequential(
    nn.Dropout(0.3),
    nn.Linear(in_features, 256),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(256, 1),
    nn.Sigmoid(),      # output in [0,1]
)
backbone = backbone.to(DEVICE)
print(f"ResNet-50 params: {sum(p.numel() for p in backbone.parameters()):,}")

# Unfreeze all; ImageNet pretrained provides good features even for domain shift
optimizer = torch.optim.Adam(backbone.parameters(), lr=1e-4, weight_decay=1e-5)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min",
                                                         factor=0.5, patience=5)
criterion = nn.MSELoss()

# ── Step 5: Training with early stopping ─────────────────────
PATIENCE   = 1000
MAX_EPOCHS = 1000
best_val_loss = float("inf")
best_epoch    = 0
patience_ctr  = 0
best_state    = None
history       = {"epoch": [], "train_loss": [], "val_loss": []}

if len(manifest) == 0:
    print("[SKIP] No images — skipping training.")
else:
    print(f"\nTraining ResNet-50 (max {MAX_EPOCHS} epochs, patience={PATIENCE}) ...")
    for epoch in range(1, MAX_EPOCHS + 1):
        # Train
        backbone.train()
        tr_losses = []
        for imgs, labels in train_ld:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            preds = backbone(imgs).squeeze(-1)
            loss  = criterion(preds, labels)
            loss.backward()
            optimizer.step()
            tr_losses.append(loss.item() * len(labels))
        tr_loss = sum(tr_losses) / len(train_ds)

        # Validate
        backbone.eval()
        vl_losses = []
        with torch.no_grad():
            for imgs, labels in val_ld:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                preds = backbone(imgs).squeeze(-1)
                vl_losses.append(criterion(preds, labels).item() * len(labels))
        vl_loss = sum(vl_losses) / len(val_ds)

        scheduler.step(vl_loss)
        history["epoch"].append(epoch)
        history["train_loss"].append(tr_loss)
        history["val_loss"].append(vl_loss)

        if epoch % 25 == 0 or epoch <= 5:
            print(f"  Epoch {epoch:>4} | train_mse={tr_loss:.4f}  val_mse={vl_loss:.4f}", flush=True)

        if vl_loss < best_val_loss:
            best_val_loss = vl_loss
            best_epoch    = epoch
            patience_ctr  = 0
            best_state    = {k: v.cpu().clone()
                             for k, v in backbone.state_dict().items()}
        else:
            patience_ctr += 1
            if patience_ctr >= PATIENCE:
                print(f"\n  Early stopping at epoch {epoch} "
                      f"(best epoch={best_epoch}, val_mse={best_val_loss:.4f})")
                break

    backbone.load_state_dict(best_state)

# ── Step 6: Save backbone weights only ────────────────────────
backbone_state = {
    k: v for k, v in backbone.state_dict().items()
    if not k.startswith("fc.")            # exclude regression head
}
torch.save({
    "backbone_state_dict": backbone_state,
    "arch":                "resnet50",
    "pretrain_note":       PROXY_LABEL,
    "best_epoch":          best_epoch if len(manifest) > 0 else None,
    "best_val_mse":        best_val_loss if len(manifest) > 0 else None,
}, MDL / "pph_image_backbone.pt")
print(f"Saved backbone: {MDL / 'pph_image_backbone.pt'}")

# ── Step 7: Training curve ────────────────────────────────────
if history["epoch"]:
    hist_df = pd.DataFrame(history)
    hist_df.to_csv(REP / "module_c_pretrain_curve.csv", index=False)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(hist_df["epoch"], hist_df["train_loss"], label="Train MSE",
            color="#3b82f6")
    ax.plot(hist_df["epoch"], hist_df["val_loss"],   label="Val MSE",
            color="#ef4444")
    ax.axvline(best_epoch, color="#22c55e", linestyle="--",
               label=f"Best (epoch {best_epoch})")
    ax.set_xlabel("Epoch"); ax.set_ylabel("MSE")
    ax.set_title(f"Module C ResNet-50 Training — {PROXY_LABEL}", fontweight="bold")
    ax.legend(); ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(REP / "module_c_pretrain_curve.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved: {REP / 'module_c_pretrain_curve.png'}  +  .csv")

# ── Step 8: 12-image prediction grid ─────────────────────────
if len(manifest) > 0 and best_state is not None:
    backbone.eval()
    sample_rows = val_df.sample(min(12, len(val_df)), random_state=SEED)
    fig, axes   = plt.subplots(3, 4, figsize=(16, 12))
    axes_flat   = axes.flatten()
    for i, (_, row) in enumerate(sample_rows.iterrows()):
        try:
            img_raw = Image.open(row["image_path"]).convert("RGB")
        except Exception:
            img_raw = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (200, 180, 180))
        img_t   = augment_val(img_raw).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            pred = float(backbone(img_t).squeeze())
        img_disp = img_raw.resize((IMG_SIZE, IMG_SIZE))
        axes_flat[i].imshow(img_disp)
        axes_flat[i].axis("off")
        true_l  = row["proxy_label"]
        color   = "#22c55e" if abs(pred - true_l) < 0.1 else "#ef4444"
        axes_flat[i].set_title(
            f"True={true_l:.3f}  Pred={pred:.3f}\n"
            f"drops={row['drops']}  h={row['height_cm']}cm",
            fontsize=9, color=color, fontweight="bold")

    plt.suptitle(
        f"Module C: ResNet-50 Sample Predictions\n"
        f"⚠️  {PROXY_LABEL}",
        fontweight="bold", fontsize=12)
    plt.tight_layout()
    plt.savefig(REP / "module_c_pretrain_predictions_sample.png",
                dpi=120, bbox_inches="tight")
    plt.close()
    print(f"Saved: {REP / 'module_c_pretrain_predictions_sample.png'}")

print("\n[DONE] 13_module_c_pretrain.py")
