"""
Script 01 — Extract Data
Unzips all raw archives into structured directories.
"""
import zipfile
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
BOREALIS = ROOT / "data" / "borealis"

PROCESSED.mkdir(parents=True, exist_ok=True)
BOREALIS.mkdir(parents=True, exist_ok=True)

def extract(zip_path: Path, dest: Path, overwrite: bool = False):
    if not zip_path.exists():
        print(f"  [SKIP] Not found: {zip_path.name}")
        return
    done_marker = dest / f".extracted_{zip_path.stem}"
    if done_marker.exists() and not overwrite:
        print(f"  [SKIP] Already extracted: {zip_path.name}")
        return
    print(f"  [EXTRACT] {zip_path.name} → {dest}")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)
    done_marker.touch()
    print(f"  [DONE] {zip_path.name}")

print("=" * 60)
print("STEP 01 — Extract all raw archives")
print("=" * 60)

# Module A — tabular data
extract(RAW / "PPH Butterfly.zip",                               RAW / "pph_butterfly")
extract(RAW / "19029973.zip",                                    RAW / "bakri_spss")
extract(RAW / "doi_10_7272_Q6MS3QNX__v20160201.zip",            RAW / "elayadi_miller")
extract(RAW / "doi_10_7272_Q6VQ30X9__v20220421.zip",            RAW / "fis_births")
extract(RAW / "doi_10_5061_dryad_1c59zw44t__v20241124.zip",     RAW / "pregnancy_clalit")
extract(RAW / "doi_10_5061_dryad_wh70rxwz3__v20251120.zip",     RAW / "pontis_study")
extract(RAW / "maternal+health+risk.zip",                        RAW / "maternal_health_risk")

# Module C — Borealis forensic blood drip images
for height in [25, 50, 75, 100]:
    z = ROOT / "data" / f"paper{height}cm.zip"
    dest = BOREALIS / f"paper{height}cm"
    dest.mkdir(exist_ok=True)
    extract(z, dest)

print("\n[DONE] All extractions complete.")
print(f"Processed dir: {PROCESSED}")
print(f"Borealis dir:  {BOREALIS}")
