# MOMENT: Maternal Obstetric Monitoring, Early Warning & Hemorrhage Triage

## Comprehensive Project Specification & Problem Statement

---

## 1. Executive Summary

**MOMENT** is a production-grade, multi-modal clinical intelligence platform engineered to eliminate preventable maternal deaths from **Postpartum Hemorrhage (PPH)** and obstetric complications. 

By combining:
1. **Antepartum Clinical Risk Stratification** (admission-time risk scoring),
2. **Continuous Intrapartum & Postpartum Hemodynamic Monitoring** (real-time Shock Index tracking), and
3. **Computer Vision Blood Saturation Quantification** (objective pad assessment),

MOMENT transforms subjective, reactive obstetric care into an automated, objective, and proactive clinical early-warning system.

---

## 2. The Clinical Problem Statement

### 2.1 The Global & National Crisis
- **Leading Cause of Maternal Death:** Postpartum Hemorrhage is the single largest direct cause of maternal mortality worldwide, responsible for approximately 27% of all maternal deaths globally.
- **Crisis in India & Low-Resource Environments:** In India, PPH accounts for **20% to 30%** of all maternal deaths (over 25,000 mothers lost annually). Despite high rates of institutional delivery (>88% under the Janani Suraksha Yojana / NHM initiatives), maternal mortality remains elevated in rural and district-level health centers.
- **The "Fourth Stage of Labor" & The Golden Hour:**
  - The immediate **2 hours postpartum** (the 4th stage of labor) is the most critical window. 
  - Over **70% to 80%** of primary PPH deaths occur within this window.
  - The leading cause is **Uterine Atony** (inability of the myometrium to contract down on spiral arteries following placental expulsion), responsible for nearly 80% of primary PPH.

### 2.2 Why Current Hospital Workflows Fail
1. **Subjective Visual Estimation:** In labor rooms worldwide, clinicians visually estimate blood loss. Peer-reviewed literature proves visual estimation underestimates actual blood loss by **30% to 50%**, delaying life-saving interventions until the patient is in decompensated hypovolemic shock.
2. **Delayed Hemodynamic Triage:** In low-resource peripheral delivery rooms (PHCs, CHCs), continuous electronic monitors are absent. Vital signs are taken infrequently. Isolated blood pressure readings give a false sense of security because compensatory vasoconstriction maintains systolic blood pressure until maternal cardiac output drops precipitously.
3. **High Clinician-to-Patient Ratios:** Midwives and staff nurses in overburdened labor wards manage multiple deliveries simultaneously, making manual 15-minute postpartum monitoring protocols (mandated by NHM Dakshata and WHO) difficult to execute reliably without automated decision support.

---

## 3. MOMENT AI System Modules

```
                              ┌──────────────────────────────────────────────────────────┐
                              │                    PATIENT WORKFLOW                      │
                              └──────────────────────────┬───────────────────────────────┘
                                                         │
                     ┌───────────────────────────────────┼───────────────────────────────────┐
                     ▼                                   ▼                                   ▼
        ┌─────────────────────────┐         ┌─────────────────────────┐         ┌─────────────────────────┐
        │        MODULE A         │         │        MODULE B         │         │        MODULE C         │
        │    Antepartum Triage    │         │  Hemodynamic Monitoring │         │  Visual Blood Analysis  │
        │    (Admission Risk)     │         │   (Shock Index & Vitals)│         │ (Pad Saturation / Flow) │
        └────────────┬────────────┘         └────────────┬────────────┘         └────────────┬────────────┘
                     │                                   │                                   │
                     └───────────────────────────────────┼───────────────────────────────────┘
                                                         │
                                                         ▼
                                      ┌─────────────────────────────────────┐
                                      │   INTEGRATED CLINICAL DECISION      │
                                      │              ENGINE                 │
                                      │  (Tiered WHO/FIGO Action Bundles)   │
                                      └─────────────────────────────────────┘
```

### Module A: Antepartum Admission Risk Stratification
- **Objective:** Stratify every pregnant woman into clinical preparedness tiers upon admission to the labor room *before* active labor or delivery begins.
- **Output:** Calibrated PPH probability score ($P \in [0.0, 1.0]$) mapping to:
  - **Routine Preparedness** ($P < 0.05$): Standard Active Management of the Third Stage of Labor (AMTSL).
  - **Enhanced Monitoring** ($0.05 \le P < 0.15$): Proactive IV line, baseline blood sample, secondary uterotonics on standby.
  - **Escalated Response** ($P \ge 0.15$): Rapid response team alert, blood crossmatch, Uterine Balloon Tamponade (Bakri) bedside readiness.

### Module B: Real-Time Hemodynamic Monitoring (Shock Index)
- **Objective:** Detect occult hypovolemia before maternal blood pressure collapses.
- **Core Clinical Metric:** **Shock Index (SI)**
  $$\text{Shock Index (SI)} = \frac{\text{Heart Rate (beats/min)}}{\text{Systolic Blood Pressure (mmHg)}}$$
- **Thresholds (Validated on Dryad Obstetric Cohort $n=952$):**
  - $\text{SI} < 0.90$: **Normal / Stable**
  - $0.90 \le \text{SI} < 1.40$: **Watch / Early Hemodynamic Stress** (100% Sensitivity for adverse outcomes)
  - $\text{SI} \ge 1.40$: **Critical Shock** (89.5% Sensitivity, 99.4% NPV for urgent surgical/transfusion intervention)
  - $\text{SI} \ge 1.70$: **Severe Decompensation** (Impending cardiac arrest)

### Module C: Objective Visual Blood Saturation Quantification
- **Objective:** Provide a rapid, non-invasive assessment of surface pad saturation and blood clot counts to trigger immediate bedside vital rechecks.
- **Reference Pad Metrics:**
  - Surface Coverage $< 20\%$: **Routine Lochia**
  - Surface Coverage $20\% - 55\%$: **Amber Watch** (Mandates vitals check within 15 min)
  - Surface Coverage $\ge 55\%$ or Multiple Clots: **Critical Trigger** (Immediate bedside intervention)

---

## 4. Strict Leak-Free Feature Taxonomy

To ensure true clinical utility, the antepartum admission risk model adheres to a strict temporal boundary:

| Status | Feature Name | Clinical Rationale |
|---|---|---|
| **PERMITTED** | `gravidity` | Total prior pregnancies known at triage |
| **PERMITTED** | `parity` | Prior live births known at triage |
| **PERMITTED** | `prenatal_visits` | Antenatal checkup count from maternal card |
| **PERMITTED** | `prior_csections` | Prior uterine surgical scars |
| **PERMITTED** | `gestational_age` | Ultrasound / LMP dating at admission |
| **PERMITTED** | `multiple_births` | Twin / triplet gestation |
| **PERMITTED** | `macrosomia` | Estimated fetal weight $> 4000\text{g}$ |
| **PERMITTED** | `placenta_previa` | Antepartum ultrasound diagnosis |
| **PERMITTED** | `placental_abruption` | Clinical presentation at admission |
| **PERMITTED** | `hypertensive_disorders` | Chronic / gestational hypertension, preeclampsia |
| **PERMITTED** | `gestational_diabetes` | Antepartum GDM diagnosis |
| **PERMITTED** | `coagulation_disorders` | Known platelet / clotting factor deficiency |
| **PERMITTED** | `gravidity_parity_gap` | Derived: gravidity minus parity (prior pregnancy loss) |
| **PERMITTED** | `has_prior_loss` | Derived: gap $> 0$ |
| **PERMITTED** | `has_prior_csection` | Derived: prior c-sections $> 0$ |
| **PERMITTED** | `is_preterm` | Derived: gestational age $< 37$ weeks |
| **EXCLUDED** | `uterine_atony` | **LEAKAGE**: Occurs post-delivery after delivery of placenta |
| **EXCLUDED** | `retained_placenta` | **LEAKAGE**: Third stage complication |
| **EXCLUDED** | `soft_canal_laceration`| **LEAKAGE**: Intrapartum delivery trauma |
| **EXCLUDED** | `maternal_near_miss` | **LEAKAGE**: ICU admission / end-stage outcome |

---

## 5. Mathematical Foundations & Clinical Thresholds

### 5.1 WHO & FIGO Blood Loss Definitions
- **Postpartum Hemorrhage (PPH):** Cumulative blood loss $\ge 500\text{ mL}$ within 24 hours postpartum.
- **Severe PPH:** Cumulative blood loss $\ge 1000\text{ mL}$ within 24 hours postpartum.
- **Bleeding Velocity:** Persistent blood loss $> 20\text{ mL/min}$ indicates active refractory hemorrhage outstripping normal clotting cascades.

### 5.2 NFHS-5 India Anemia Odds Ratios
Extracted and validated on the **169,334 delivery birth cohort** of the National Family Health Survey (NFHS-5 India 2019-21):
- Continuous effect: Each $1\text{ g/dL}$ drop in maternal Hemoglobin increases PPH vulnerability by **2.07%** ($OR = 1.0207$).
- **Mild Anemia** ($10.0 - 10.9\text{ g/dL}$): $OR = 1.0252$
- **Moderate Anemia** ($7.0 - 9.9\text{ g/dL}$): $OR = 1.0602$
- **Severe Anemia** ($< 7.0\text{ g/dL}$): $OR = 1.1216$

---

## 6. Raw Datasets Catalog

All raw datasets are permanently maintained in `data/raw/`:

| Dataset Identifier | Format / Size | Description & Origin | Key Variables / Cohort Size |
|---|---|---|---|
| **NFHS-5 India** (`data/raw/dhs_india/`) | `.DTA` (4.8 GB) + `.ZIP` (960 MB) | National Family Health Survey 2019-21 (`IAIR7EFL.DTA`, `IAHR7EDT.zip`, `IAIR7EDT.zip`, `IABR7EDT.zip`) | 169,334 maternal delivery records with linked anemia, parity, ANC, and delivery setting |
| **PLOS ONE Cohort** (`data/raw/pone.0323190.s002.xlsx`) | `.XLSX` (12 MB) | Multi-center obstetric delivery cohort | 56,014 deliveries, 2,016 PPH cases (3.60% incidence), antepartum + intrapartum features |
| **El Ayadi / Miller Shock Cohort** (`data/raw/doi_10_7272_Q6MS3QNX__v20160201.zip`) | `.ZIP` (121 KB) | Active low-resource obstetric hemorrhage cohort (Dryad) | 952 active PPH cases with serial vitals, shock index, and critical maternal outcomes |
| **NASG Study** (`data/raw/doi_10_7272_Q6VQ30X9__v20220421.zip`) | `.ZIP` (90 KB) | Non-pneumatic anti-shock garment clinical trial (Dryad) | Hemodynamic trajectories under severe obstetric hemorrhage |
| **Dryad PPH Cohorts** (`doi_10_5061_dryad_...`) | `.ZIP` (23.3 MB) | Independent obstetric cohorts | External validation cohorts for bleeding outcomes |
| **UCI Maternal Health Risk** (`data/raw/maternal+health+risk.zip`) | `.ZIP` (3.3 KB) | Clinical vital signs & maternal risk categories | Physiological vitals benchmarking (BP, blood glucose, body temp) |
| **PPH Butterfly Data** (`data/raw/PPH Butterfly.zip`) | `.ZIP` (249 KB) | Clinical device study data | Hemostatic tamponade and uterine pressure data |
| **Clinical Study 19029973** (`data/raw/19029973.zip`) | `.ZIP` (44 KB) | Clinical postpartum study data | Supplementary obstetric study records |
| **Visual Pad Photo Suite** (`data/clinical_test_pad_photos/`) | `.JPG` (2.2 MB) | Calibrated clinical test pad reference photos | Routine Lochia (<15%), Amber Watch (35%), Critical PPH (60%+ saturation) |

---

## 7. Production AI & Large-Scale Model Training Roadmap

The project is entering its **production phase**, moving from initial baseline prototypes to large-scale deep learning models and multi-modal architectures trained for 15 to 1500 epochs:

### 7.1 Deep Learning Architectures Under Active Development
1. **Tabular ResNets & Tabular Transformers (FT-Transformer / SAINT):**
   - Deep residual networks with skip connections and self-attention over tabular medical tokens.
   - Designed to model complex non-linear interactions between parity, gestational age, and vascular risk factors without manual feature engineering.
2. **Multi-Modal Foundation Models:**
   - Joint embedding of clinical tabular vitals, time-series hemodynamic sequences, and visual pad imagery.
   - Pre-training on massive health survey cohorts (NFHS-5) followed by clinical domain fine-tuning.
3. **Training Regimes:**
   - Long training cycles: **15 to 1500 epochs** on GPU / Metal / distributed clusters.
   - Advanced loss formulations for severe class imbalance (e.g., **Focal Loss**, **Asymmetric Loss**, and class-weighted BCE).
   - Strict probability calibration via **Isotonic Regression** and **Temperature Scaling** to guarantee clinical reliability (Expected Calibration Error $< 0.01$).

### 7.2 Clinical Evaluation Protocol
- **Primary Metric:** Precision-Recall AUC (PR-AUC) under severe class imbalance (3.6% baseline).
- **Secondary Metrics:** Brier Score, Expected Calibration Error (ECE), Sensitivity at 90% Specificity, and F2-Score (weighting recall over precision to minimize false negatives).
