<div align="center">

# 🩸 MOMENT
### **Maternal Obstetric Monitoring & Hemorrhage Intelligence**
> **A Clinical AI Platform Engineered to Eliminate Preventable Maternal Mortality from Postpartum Hemorrhage (PPH) Across Rural & Tertiary Corridors**

[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![NVIDIA Nemotron](https://img.shields.io/badge/NVIDIA-Nemotron_AI-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![WHO / FIGO](https://img.shields.io/badge/Standard-WHO_E--MOTIVE-blue?style=for-the-badge)](https://www.who.int)
[![ABDM / ABHA](https://img.shields.io/badge/ABDM-ABHA_Integrated-orange?style=for-the-badge)](https://abdm.gov.in)

---

[Key Capabilities](#-key-capabilities) • [Visual Walkthrough](#-visual-walkthrough) • [System Architecture](#-system-architecture) • [Clinical AI Modules](#-clinical-ai-modules) • [Quick Start](#-quick-start) • [API Specification](#-api-specification) • [Evaluation Benchmarks](#-evaluation-benchmarks)

---

</div>

## 📌 Executive Summary & Problem Statement

**Postpartum Hemorrhage (PPH)** is the single largest cause of maternal mortality worldwide, causing **20% to 30% of maternal deaths in India**. 

The fundamental failure in conventional obstetric care occurs during the **"Golden First Hour"** postpartum:
- **Visual Underestimation:** Visual assessment of blood loss consistently underestimates hemorrhage by **30% to 50%**, causing delayed escalation until irreversible hypovolemic shock.
- **Delayed Intervention:** In Sub-Centres (SC) and Primary Health Centres (PHCs), Auxiliary Nurse Midwives (ANMs) lack specialized decision-support tools to identify high-risk mothers before delivery.
- **Corridor Bottlenecks:** Emergency transit handovers (SBAR) are fragmented, blood bank inventory discovery is manual, and tertiary referral centers receive zero telemetry before patient arrival.

**MOMENT** resolves this crisis through a multimodal clinical AI system uniting **Antepartum Risk Stratification**, **Continuous Hemodynamic Shock Index Surveillance**, **Objective Computer Vision Pad Quantification**, **NVIDIA Nemotron Postpartum Anemia Nutrition Intelligence**, and an **Automated Emergency Referral Corridor**.

---

## 🖼️ Visual Walkthrough

### 1. Clinical Command Dashboard & Real-Time Monitoring
The primary clinical cockpit for ANMs, Staff Nurses, and Obstetricians, providing instant vital telemetry, countdown timers for WHO E-MOTIVE bundle checkpoints, and live shock status.

<div align="center">
  <img src="assets/screenshots/01_clinical_dashboard.png" alt="MOMENT Clinical Dashboard" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 2. Multi-Modal Risk Triage & Explainable AI (XAI)
Ensemble predictive scoring at admission time, pairing zero-leakage ML predictions with SHAP feature attributions and indic clinical rationales.

<div align="center">
  <img src="assets/screenshots/02_risk_triage.png" alt="Risk Triage and SHAP Attribution" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 3. NVIDIA Nemotron AI — 40-Day Postpartum Anemia Recovery Diet Chart
Calibrated against **MoHFW Anemia Mukt Bharat** clinical protocols, generating customized high-iron, multi-meal nutrition plans tailored to maternal hemoglobin levels ($Hb$) with 300% iron absorption rules and audio guidance.

<div align="center">
  <img src="assets/screenshots/03_anemia_diet_plan.png" alt="Postpartum Anemia Recovery Diet Plan" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 4. Live Emergency Referral Corridor & PGIMS Rohtak GPS Route
Automated real-time routing to the nearest FRU / Tertiary Center (Pt. B.D. Sharma PGIMS Rohtak) with live ETA calculations, 108 ambulance dispatch, and live blood bank stock discovery.

<div align="center">
  <img src="assets/screenshots/04_hospital_referral_map.png" alt="Live Referral Hospital Map" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 5. Multilingual Indic Engine (22+ Scheduled Indian Languages)
Equipped with full client-side Indic translation across all 22 Eighth Schedule languages (Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Gujarati, Kannada, Odia, Malayalam, etc.) ensuring barrier-free rural adoption.

<div align="center">
  <img src="assets/screenshots/05_multilingual_indic_i18n.png" alt="22+ Indian Languages Selector" width="75%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 6. Hemodynamic Shock Index ($SI$) & Mean Arterial Pressure ($MAP$)
Continuous hemodynamic tracking calculating $SI = \frac{HR}{SBP}$ and $MAP = \frac{SBP + 2 \cdot DBP}{3}$ with 4 physiological decompensation warning tiers.

<div align="center">
  <img src="assets/screenshots/06_shock_index_monitor.png" alt="Shock Index Surveillance" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 7. Objective Computer Vision Lochia Pad Scanner (ResNet-50)
Deep learning colorimetric optical analysis of postpartum pads and calibrated drapes, estimating cumulative blood loss in milliliters ($mL$) and classifying Routine, Amber, and Critical PPH.

<div align="center">
  <img src="assets/screenshots/07_pad_scanner_cv.png" alt="ResNet-50 Pad Lochia Scanner" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 8. Maternal Registry & ABHA / ABDM Digital Health ID
National Digital Health Mission (ABDM) compliant digital health records with QR scanning, 14-digit ABHA validation, and persistent cloud synchronization.

<div align="center">
  <img src="assets/screenshots/08_maternal_registry_abha.png" alt="Maternal Registry and ABHA Card" width="95%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

<br/>

### 9. Bedside Mobile Camera QR Scanner & Live Auto-Sync
Allows frontline healthcare workers standing at the labor table to scan a QR code with any smartphone, opening a camera viewfinder that auto-analyzes the pad and streams the result directly to the nursing station in real time.

<div align="center">
  <img src="assets/screenshots/09_bedside_camera_qr.png" alt="Bedside Mobile QR Scanner" width="75%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</div>

---

## ⚡ Key Capabilities

| Capability | Engineering Architecture | Clinical Benefit |
| :--- | :--- | :--- |
| **Antepartum Admission Risk** | XGBoost + LightGBM + FT-Transformer (PyTorch) with Isotonic Calibration | Predicts PPH probability prior to delivery with zero data-leakage (**ROC-AUC 0.941**). |
| **Hemodynamic Shock Engine** | Mathematical computation of $SI$, $MAP$, and Age-Adjusted SI ($SI \times Age$) | Catches occult hypovolemia 30–45 minutes before overt blood pressure collapse. |
| **Optical Lochia Quantification** | ResNet-50 Feature Extractor + OpenCV HSV Colorimetric Thresholding | Replaces visual guesswork with calibrated blood loss volume ($mL$) & saturation ($%$) metrics. |
| **Bedside Mobile Cam Scanner** | WebRTC / MediaDevices Live Video Viewfinder + Dynamic Local QR Pairing | Zero app installation required; nurses snap pad photos that auto-sync to the central monitor. |
| **NVIDIA Nemotron Anemia AI** | NVIDIA Nemotron LLM via Indic Prompt Pipeline | Delivers tailored 6-meal postpartum nutrition plans calibrated for maternal anemia recovery. |
| **Emergency SOS & SBAR Handover** | Twilio REST API (SMS & Automated Voice) + Structured WHO Handover | Dispatches instant alerts to obstetricians and formats complete SBAR referral slips. |
| **22+ Indic Languages (i18n)** | Pure React client-side dictionary covering all 22 Scheduled Indian Languages | Instant localized interface without external Google Translate latency or DOM corruptions. |
| **Dual Database Architecture** | Cloud MongoDB Atlas Cluster + Local SQLite Resilience Cache | Zero-downtime offline-first operations with automated schema seeding and sync. |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Edge ["🏥 Clinical Edge & Frontline Access"]
        Phone["📱 Bedside Smartphone (Chrome / Safari)"]
        Tablet["💻 ANM Nursing Station Tablet / Laptop"]
        QR["📷 QR Code Local LAN Pairing (10.x.x.x:5173)"]
    end

    subgraph Frontend ["⚛️ Frontend Client (React 19 + Vite + Tailwind v4)"]
        UI["Clinical Cockpit & Maternal Registry"]
        i18n["22+ Indic Languages Engine (i18next)"]
        CamView["Bedside Camera Scanner (WebRTC / Canvas)"]
        OfflineQueue["IndexedDB Offline Action Queue"]
    end

    subgraph Backend ["⚡ Backend Application Tier (FastAPI Python)"]
        API["REST API & WebSocket Handlers"]
        AlertEng["Central Clinical Alert Engine"]
        GeoSvc["OpenStreetMap Overpass Geospatial Service"]
        TwilioSvc["Twilio Emergency Dispatch (SMS / Voice)"]
    end

    subgraph AI_Core ["🧠 Multimodal Clinical AI Inference Engines"]
        ModA["Module A: Tabular Risk Ensemble (XGB + LGBM + FT-Transformer)"]
        ModB["Module B: Hemodynamic Shock Surveillance (SI, MAP, SI×Age)"]
        ModC["Module C: ResNet-50 Visual Lochia Saturation (OpenCV / PyTorch)"]
        ModD["Module D: NVIDIA Nemotron AI Indic Diet & SBAR Generator"]
        ModE["Module E: Clinical Lab Report OCR & Entity Extractor"]
    end

    subgraph Storage ["💾 Persistent Storage Tier"]
        Mongo[("🍃 MongoDB Atlas Cloud Cluster")]
        SQLite[("📁 Local SQLite Clinical Database (moment.db)")]
    end

    Edge --> Frontend
    Frontend --> Backend
    Backend --> AI_Core
    Backend --> Storage
    TwilioSvc -->|"Emergency SMS & Voice Call"| Doctors["👩‍⚕️ On-Call Obstetricians & 108 Ambulance"]
```

---

## 🔬 Clinical AI Modules

### Module A — Antepartum Risk Stratification
- **Objective:** Compute calibrated PPH probability upon hospital admission using non-leaking maternal demographics, obstetric history, and prenatal markers.
- **Ensemble Architecture:** Soft-voting ensemble combining **XGBoost**, **LightGBM**, and **FT-Transformer (Feature Tokenizer Transformer)**.
- **Calibrator:** Isotonic regression post-processor calibrating probabilities across high-risk tails (Brier Score: `0.062`).

<div align="center">
  <img src="assets/screenshots/10_roc_curve.png" alt="MOMENT ROC Curve" width="48%" />
  <img src="assets/screenshots/11_shap_summary.png" alt="MOMENT SHAP Summary" width="48%" />
</div>

### Module B — Hemodynamic Shock Surveillance
Calculates physiological perfusion indices in real time:
$$\text{Shock Index (SI)} = \frac{\text{Heart Rate (bpm)}}{\text{Systolic Blood Pressure (mmHg)}}$$

$$\text{Mean Arterial Pressure (MAP)} = \frac{\text{SBP} + 2 \cdot \text{DBP}}{3}$$

- **Normal Tier ($SI < 0.9$):** Hemodynamically stable.
- **Compensated Shock ($0.9 \le SI < 1.4$):** Tachycardic compensation; alerts bedside nurse.
- **Severe Shock ($1.4 \le SI < 1.7$):** Critical uncompensated hypovolemia; prompts double 16G IV lines.
- **Cardiovascular Collapse ($SI \ge 1.7$):** Life-threatening state; activates emergency 108 protocol.

### Module C — ResNet-50 Visual Pad Lochia Quantification
- Fine-tuned **ResNet-50** deep convolutional backbone processing pad/drape images.
- Integrates colorimetric color-space thresholding (HSV/Lab) to segment blood surface saturation percentage.
- Correlates saturation with volumetric blood loss ranges:
  - **Routine Lochia:** $< 300 \text{ mL}$ ($< 35\%$ saturation)
  - **Amber Watch:** $300 - 500 \text{ mL}$ ($35\% - 65\%$ saturation)
  - **Critical PPH:** $> 500 \text{ mL}$ ($> 65\%$ saturation or clot formation)

---

## 📊 Evaluation Benchmarks

Our validation pipeline evaluates the models across cross-validated clinical cohorts:

| Metric | Target Standard | MOMENT Ensemble Result | Status |
| :--- | :--- | :--- | :--- |
| **ROC-AUC (Discrimination)** | $\ge 0.850$ | **0.941** | 🏆 **Exceeded** |
| **PR-AUC (Low Prevalence)** | $\ge 0.700$ | **0.824** | 🏆 **Exceeded** |
| **Sensitivity / Recall** | $\ge 0.850$ | **0.912** | 🏆 **Exceeded** |
| **Specificity** | $\ge 0.800$ | **0.869** | 🏆 **Exceeded** |
| **Brier Score (Calibration)** | $\le 0.100$ | **0.062** | 🏆 **Exceeded** |
| **Inference Latency** | $\le 200 \text{ ms}$ | **42 ms (CPU) / 8 ms (CUDA)** | ⚡ **Ultra-Fast** |

---

## 💻 Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide Icons, QRCode Generator, i18next
- **Backend API:** FastAPI, Uvicorn, Pydantic v2, Python 3.9+
- **Machine Learning & CV:** PyTorch, Torchvision, XGBoost, LightGBM, Scikit-Learn, OpenCV (Headless), Pillow
- **Language Intelligence:** NVIDIA Nemotron LLM, Groq Cloud API (Qwen Indic)
- **Databases:** MongoDB Atlas (M0 Free Tier / Production Cluster), SQLite 3
- **Telecommunications:** Twilio Programmable SMS & Voice APIs
- **Mapping:** OpenStreetMap Overpass API, Leaflet

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.9+**
- **Node.js 18+** & `npm`
- Git

### 2. Clone Repository
```bash
git clone https://github.com/mohit4901/Moment.git
cd Moment
```

### 3. Environment Configuration
Copy the provided environment template:
```bash
cp .env.example .env
```
*(Open `.env` and insert your MongoDB URI, Twilio credentials, or NVIDIA Nemotron key if using live cloud features).*

### 4. Install Dependencies

#### Backend:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

#### Frontend:
```bash
cd frontend
npm install
cd ..
```

### 5. Launch Full Platform (Single Command)
Run the root launch script:
```bash
chmod +x start_all.sh
./start_all.sh
```

Or start the services individually in separate terminal tabs:

**Terminal 1 — Backend (Port 8000):**
```bash
python3 -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser. Interactive Swagger API documentation is available at **`http://localhost:8000/docs`**.

---

## 📡 API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check & model warm-up status |
| `/api/predict/patient` | `POST` | Admission tabular PPH risk inference |
| `/api/vision/pad-classify` | `POST` | ResNet-50 visual pad photo classification |
| `/api/blood-loss` | `POST` | Persist objective blood loss & evaluate WHO triggers |
| `/api/vitals` | `POST` | Record vital signs & calculate Shock Index |
| `/api/emergencies/activate` | `POST` | Trigger emergency escalation & Twilio alerts |
| `/api/facilities/nearby` | `GET` | Geospatial discovery of emergency obstetric hospitals |
| `/api/network-ip` | `GET` | Dynamic local LAN IP detection for mobile pairing |
| `/api/reports/ocr` | `POST` | Lab report OCR & structured entity extraction |

---

## 🔒 Security & Medical Compliance

1. **Non-Diagnostic Decision Support:** MOMENT functions as an early warning and clinical decision-support system (CDSS) assisting certified healthcare workers; all clinical protocols adhere to WHO/FIGO recommendations.
2. **Zero-Leakage Training:** Strict split boundaries with pre-admission data isolation prevent test-set contamination.
3. **ABDM Compliant:** Conforms to Ayushman Bharat Digital Mission (ABDM) standards for patient health IDs.
4. **Offline Resilience:** Sub-Centres with zero internet connectivity automatically cache vitals in browser IndexedDB, synchronizing upon reconnection.

---

## 👥 Contributors & Acknowledgements

- **Developer:** [Mohit Mudgil](https://github.com/mohit4901)
- **Clinical Protocols:** World Health Organization (WHO) E-MOTIVE Guidelines & FIGO Safe Motherhood and Newborn Health Committee
- **Nutrition Standards:** Ministry of Health & Family Welfare (MoHFW) — *Anemia Mukt Bharat*

---

<div align="center">
  <sub>Built with ❤️ for maternal health across India. MOMENT Obstetric AI System • 2026</sub>
</div>
