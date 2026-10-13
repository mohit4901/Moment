# MOMENT — Maternal Obstetric Monitoring & Hemorrhage Intelligence

> **A production-grade, clinical AI platform engineered to eliminate preventable maternal mortality from Postpartum Hemorrhage (PPH).**

---

## Overview

Postpartum Hemorrhage (PPH) is the leading cause of maternal mortality worldwide, responsible for 20% to 30% of maternal deaths in India. Most fatal hemorrhages occur during the "Fourth Stage of Labor" (the immediate 2 hours postpartum) due to uterine atony. Traditional hospital workflows rely on visual estimation of blood loss, which consistently underestimates blood loss by 30% to 50%, delaying life-saving clinical interventions.

**MOMENT** transforms obstetric decision support by unifying:
1. **Antepartum Admission Risk Stratification:** Non-leaking predictive scoring at admission time.
2. **Continuous Hemodynamic Shock Index Monitoring:** Real-time $SI = \frac{\text{Heart Rate}}{\text{Systolic BP}}$ surveillance.
3. **Objective Computer Vision Quantification:** Calibrated optical assessment of postpartum pad saturation.

---

## Repository Structure

```
Moment/
├── data/
│   ├── raw/                           # Immutable raw clinical datasets
│   │   ├── dhs_india/                 # NFHS-5 India 2019-21 (IAIR7EFL.DTA 4.8GB & survey archives)
│   │   ├── pone.0323190.s002.xlsx     # 56,014 multi-center obstetric cohort
│   │   ├── doi_10_7272_Q6MS3QNX...    # Dryad Obstetric Shock Index cohort (n=952)
│   │   ├── doi_10_7272_Q6VQ30X9...    # NASG Hemorrhage Intervention study
│   │   ├── doi_10_5061_dryad_...      # Dryad PPH validation cohorts
│   │   ├── maternal+health+risk.zip   # UCI Maternal Health Risk dataset
│   │   ├── PPH Butterfly.zip          # Clinical tamponade device data
│   │   └── 19029973.zip               # Clinical study cohort
│   └── clinical_test_pad_photos/      # Photographic validation pad suite
├── docs/
│   ├── PROJECT_SPECIFICATION_AND_PROBLEM_STATEMENT.md  # Exhaustive project & problem documentation
│   └── clinical_config.json                            # Verified clinical thresholds & formulas
└── README.md
```

---

## Detailed Clinical & Problem Documentation

For complete clinical specifications, mathematical formulations, feature boundaries, and deep learning training roadmaps, please consult:
- **[PROJECT_SPECIFICATION_AND_PROBLEM_STATEMENT.md](docs/PROJECT_SPECIFICATION_AND_PROBLEM_STATEMENT.md)**
- **[clinical_config.json](docs/clinical_config.json)**
