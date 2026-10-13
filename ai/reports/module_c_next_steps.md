# Module C — What Real Data Collection Requires
# proxy_pretraining — not clinically validated

# What Real Data Collection Requires for Module C

> **Current status**: Experimental computer-vision prototype.  
> **Not deployable**. Not clinically validated.

---

## 1. Sample Size Requirement

| Parameter | Minimum | Recommended |
|-----------|---------|-------------|
| Total labelled images | 5,000 | ≥15,000 |
| Per volume category (e.g. <150 mL, 150–500 mL, >500 mL) | 1,500 | 5,000 |
| Facilities / sites | 3 | ≥8 (geographic diversity) |
| Pad brands covered | 3 | ≥6 |

**Power justification**: For a 3-class classifier targeting AUC ≥0.85 with 80% power,
standard sample size formulas for ordinal classification require ~4,000–6,000 images.
The N=3 base images used in this prototype are entirely insufficient for any statistical inference.

---

## 2. Labeling Protocol

### Ground truth measurement
- **Gravimetric method**: weigh dry pad before use, weigh soaked pad after use.  
  Blood loss (g) ≈ (soaked weight − dry weight) / 1.06 (blood density g/mL).
- This gives a continuous blood volume estimate in mL.
- Label each image with: `pad_id`, `patient_id`, `blood_volume_mL`, `timestamp`.

### Image capture protocol
- Photograph pad laid flat on a **standardised matte background** (e.g. white foam board).
- **Calibration card** (colour checker + ruler) must appear in **every image**.
- Consistent lighting: diffuse overhead, avoid shadows.
- Camera at fixed height (e.g. 30 cm above pad), perpendicular.
- Capture within 60 seconds of removal (before drying/darkening).
- Minimum 12 MP camera. Avoid digital zoom.

### Category thresholds (to define after pilot)
Current prototype categories (Routine / Amber / Critical) are preliminary.
After gravimetric labelling, define thresholds empirically from the data distribution,
e.g.:
- Routine: <150 mL
- Amber: 150–499 mL
- Critical: ≥500 mL (PPH threshold)

---

## 3. Calibration Card Requirement

Every image **must** contain a calibration card that encodes:
- Absolute colour reference (e.g. X-Rite ColorChecker Passport)
- Physical scale reference (ruler or QR code of known size)

This allows the model to:
1. Correct for ambient lighting variation between facilities
2. Normalise for pad size differences
3. Enable physically interpretable colour features

---

## 4. Model Architecture Plan (after real data collection)

| Component | Approach |
|-----------|----------|
| Backbone | ResNet-50 or EfficientNet-B3 (ImageNet pretrained, fine-tuned) |
| Input | RGB image + calibration card crop |
| Output | Continuous blood volume (mL) regression OR 3-class ordinal |
| Loss | Huber loss (regression) or ordinal cross-entropy |
| Calibration | Platt scaling / temperature scaling on val set |
| Threshold | Clinician-validated thresholds, not model-chosen |

---

## 5. Validation Requirements Before Clinical Use

1. **Internal validation**: Held-out test split (20%), never seen during training.
2. **External validation**: ≥1 independent site with different equipment.
3. **Prospective audit**: ≥200 consecutive deliveries, compared against gravimetric gold standard.
4. **Agreement statistics**: Bland-Altman plot (continuous), weighted kappa (ordinal).
5. **Target performance**: Sensitivity ≥90% for ≥500 mL threshold, NPV ≥98%.
6. **Ethics board approval** at each collection site.
7. **Clinical co-development**: Midwives and obstetricians involved in threshold decisions.

---

## 6. Limitations of Current Prototype

| Issue | Impact |
|-------|--------|
| Bovine blood ≠ human blood (different viscosity, color) | Colour features will not transfer |
| Paper ≠ clinical pads (absorbency, texture) | Saturation patterns differ |
| Proxy label (drop count × height) ≠ blood volume | No clinical meaning |
| N=3 reference photos | No statistical inference possible |
| No calibration card | Lighting-sensitive, not reproducible |

---

*This document was generated as part of the MOMENT pipeline.*  
*All Module C outputs are labeled "proxy_pretraining — not clinically validated".*
