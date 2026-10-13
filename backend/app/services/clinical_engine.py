"""
MOMENT Clinical Intelligence Engine
====================================
The BRAIN of the backend. Takes raw AI model predictions and transforms them
into rich, clinically meaningful analysis with:

1. Risk Factor Explanation Engine (WHY is this patient at risk)
2. Anemia Severity Assessment (Hb-based NFHS-5 validated)
3. Estimated Blood Volume & Allowable Blood Loss Calculator
4. WHO/FIGO PPH Stepwise Emergency Protocol Generator
5. Preparedness Checklist Generator (dynamic, risk-tier-aware)
6. Hemorrhage Classification (ATLS Class I-IV)
7. Postpartum Monitoring Schedule Generator
8. Clinical Timeline & Escalation Decision Engine
9. Risk Factor Interaction Analysis
"""
from typing import Dict, List, Any, Optional
import math
from datetime import datetime


# ══════════════════════════════════════════════════════════════════════
# 1. RISK FACTOR EXPLANATION ENGINE
# ══════════════════════════════════════════════════════════════════════

# Evidence-based clinical explanation for each risk factor
RISK_FACTOR_ENCYCLOPEDIA: Dict[str, Dict[str, Any]] = {
    "placenta_previa": {
        "name": "Placenta Previa",
        "name_hi": "प्लेसेंटा प्रीविया (नाल का नीचे होना)",
        "icon": "🔴",
        "severity": "CRITICAL",
        "odds_ratio": 13.1,
        "mechanism": "The placenta implants over or near the internal cervical os, covering the birth canal. During cervical dilation and delivery, the placenta separates from the uterine wall causing massive, uncontrollable arterial bleeding from the exposed spiral arteries.",
        "mechanism_hi": "प्लेसेंटा गर्भाशय ग्रीवा (cervix) के ऊपर जम जाती है। जब सर्विक्स खुलता है, तो प्लेसेंटा फटती है और बड़ी धमनियों से भारी खून बहता है।",
        "clinical_significance": "Placenta previa increases the risk of severe PPH by 13x. It is the single highest independent risk factor for life-threatening obstetric hemorrhage and often necessitates planned Cesarean delivery.",
        "clinical_action": "Mandatory senior obstetrician presence. Pre-operative blood crossmatch (minimum 2 units PRBC). Prepare for possible emergency hysterectomy. Anesthesia team on standby.",
        "source": "Oyelese & Smulian, 2006 (Placenta Previa review); RCOG Green-Top Guideline No. 27a",
        "category": "placental"
    },
    "placental_abruption": {
        "name": "Placental Abruption",
        "name_hi": "प्लेसेंटल एब्रप्शन (नाल का समय से पहले अलग होना)",
        "icon": "🔴",
        "severity": "CRITICAL",
        "odds_ratio": 7.9,
        "mechanism": "The placenta prematurely separates from the uterine wall before delivery. This creates a concealed or revealed retroplacental hemorrhage. The myometrium becomes infiltrated with blood (Couvelaire uterus), impairing its ability to contract and causing refractory atony and DIC (disseminated intravascular coagulation).",
        "mechanism_hi": "डिलीवरी से पहले ही प्लेसेंटा गर्भाशय की दीवार से अलग हो जाती है। इससे अंदर ही अंदर भारी खून बहता है और खून जमने की क्षमता (clotting) भी खराब हो सकती है (DIC)।",
        "clinical_significance": "Placental abruption carries an 8x increased risk of PPH and is strongly associated with consumptive coagulopathy (DIC), fetal distress/demise, and maternal shock. Bleeding can be concealed (no visible vaginal bleeding despite massive internal hemorrhage).",
        "clinical_action": "Immediate IV access (2 large-bore cannulae). Emergency blood crossmatch. Prepare for emergency Cesarean if fetal distress. Monitor coagulation profile (fibrinogen, PT/aPTT, platelet count). Have FFP and cryoprecipitate available.",
        "source": "Tikkanen, 2011 (Placental abruption review); ACOG Practice Bulletin No. 185",
        "category": "placental"
    },
    "coagulation_disorders": {
        "name": "Coagulation Disorder / Coagulopathy",
        "name_hi": "खून जमने की बीमारी (कोगुलोपैथी)",
        "icon": "🔴",
        "severity": "CRITICAL",
        "odds_ratio": 5.2,
        "mechanism": "Maternal clotting factor deficiencies (von Willebrand Disease, thrombocytopenia, DIC, factor deficiencies) prevent adequate hemostasis at the placental bed. Even normal postpartum blood loss becomes life-threatening because the uterine spiral arteries cannot form stable fibrin clots.",
        "mechanism_hi": "खून में clotting factors कम होने से गर्भाशय की धमनियों पर खून का थक्का (clot) नहीं बनता। इससे सामान्य डिलीवरी में भी खून रुकने में बहुत देर लगती है।",
        "clinical_significance": "Coagulopathy increases PPH risk 5-fold and transforms otherwise manageable bleeding into a catastrophic cascade. DIC can develop secondary to abruption, amniotic fluid embolism, or prolonged hemorrhage.",
        "clinical_action": "Pre-delivery coagulation panel (fibrinogen, PT, aPTT, platelets). Maintain fibrinogen >2 g/L. Have FFP, cryoprecipitate, and platelet concentrates reserved. Administer Tranexamic Acid (TXA) 1g IV within 3 hours of bleeding onset.",
        "source": "WHO 2023 PPH Guidelines; James, 2012 (Coagulopathy in obstetrics review)",
        "category": "hematological"
    },
    "multiple_births": {
        "name": "Multiple Pregnancy (Twins/Triplets)",
        "name_hi": "जुड़वाँ/तीन बच्चे (मल्टीपल प्रेगनेंसी)",
        "icon": "🟡",
        "severity": "HIGH",
        "odds_ratio": 4.7,
        "mechanism": "Twin or higher-order pregnancies cause uterine overdistension. The myometrium is stretched beyond its normal contractile capacity. After delivery, the overdistended uterus cannot contract effectively (uterine atony), and the large placental bed surface area creates more open spiral arteries.",
        "mechanism_hi": "जुड़वाँ बच्चों से गर्भाशय ज़रूरत से ज़्यादा फैल जाता है। डिलीवरी के बाद गर्भाशय सिकुड़ नहीं पाता (atony) और प्लेसेंटा की जगह से खून बहता रहता है।",
        "clinical_significance": "Multiple gestation carries nearly 5x PPH risk. It also increases the risk of preterm delivery, preeclampsia, and need for operative delivery — all independent PPH risk factors.",
        "clinical_action": "IV oxytocin ready before 3rd stage. Two dedicated neonatal teams. Anticipate uterine atony — prepare second-line uterotonics (Carbetocin, Misoprostol).",
        "source": "Conde-Agudelo et al., 2000 (Multiple pregnancy meta-analysis); NICE CG129",
        "category": "obstetric"
    },
    "prior_csections": {
        "name": "Previous Cesarean Section(s)",
        "name_hi": "पहले का ऑपरेशन (सिजेरियन सेक्शन)",
        "icon": "🟡",
        "severity": "HIGH",
        "odds_ratio": 3.4,
        "mechanism": "Each prior uterine scar weakens the myometrium at the incision site. This creates risk for abnormal placentation (placenta accreta spectrum) where the placenta invades the scar tissue, and for uterine rupture during labor. Prior C-section is the #1 risk factor for placenta accreta.",
        "mechanism_hi": "हर पिछले ऑपरेशन से गर्भाशय पर निशान (scar) बनता है। अगली प्रेगनेंसी में प्लेसेंटा उस निशान पर चिपक सकती है (placenta accreta) और निकलने में भारी खून बह सकता है।",
        "clinical_significance": "Risk escalates with each additional C-section: 1 prior = 3.4x, 2 prior = 8.6x, ≥3 prior = 14.2x. Monitor for placenta accreta spectrum with ultrasound. Placenta accreta causes massive hemorrhage requiring hysterectomy in >50% of cases.",
        "clinical_action": "Ultrasound assessment for placenta accreta if prior C-section + anterior placenta. Blood bank notification. If accreta suspected: planned delivery at 34-36 weeks with multidisciplinary team.",
        "source": "Silver et al., 2006 (Morbidly adherent placenta); ACOG/SMFM Consensus No. 7",
        "category": "surgical_history"
    },
    "hypertensive_disorders": {
        "name": "Gestational Hypertension / Preeclampsia",
        "name_hi": "गर्भावस्था में हाई ब्लड प्रेशर / प्रीक्लेम्पसिया",
        "icon": "🟡",
        "severity": "HIGH",
        "odds_ratio": 2.8,
        "mechanism": "Preeclampsia causes systemic endothelial dysfunction, vasospasm, and impaired platelet aggregation. It can progress to HELLP syndrome (Hemolysis, Elevated Liver enzymes, Low Platelets), which is effectively a form of DIC. Magnesium sulfate treatment may also contribute to uterine relaxation.",
        "mechanism_hi": "हाई ब्लड प्रेशर से खून की नलियाँ कमज़ोर होती हैं और प्लेटलेट्स कम हो सकते हैं। HELLP सिंड्रोम में लिवर ख़राब होता है और खून जमना बंद हो सकता है।",
        "clinical_significance": "Hypertensive disorders compound hemorrhage risk by impairing coagulation. Severe preeclampsia with HELLP syndrome has a 10-20% risk of PPH. Magnesium sulfate (used for seizure prevention) is a uterine relaxant.",
        "clinical_action": "Monitor platelet count and liver enzymes serially. If HELLP suspected, prepare blood products. Continue MgSO4 for seizure prophylaxis but be aware of uterine atony risk. Avoid ergometrine (contraindicated in hypertension).",
        "source": "ACOG Practice Bulletin No. 222 (Gestational Hypertension); WHO 2011 Preeclampsia Guidelines",
        "category": "medical"
    },
    "gestational_diabetes": {
        "name": "Gestational Diabetes Mellitus (GDM)",
        "name_hi": "गर्भावस्था में शुगर/डायबिटीज़",
        "icon": "🟢",
        "severity": "MODERATE",
        "odds_ratio": 1.4,
        "mechanism": "GDM increases the risk of fetal macrosomia (large baby), which overdistends the uterus similarly to twins. It also increases operative delivery rates (Cesarean and instrumental), which are independent PPH risk factors.",
        "mechanism_hi": "शुगर से बच्चा बड़ा (macrosomia) हो सकता है जिससे गर्भाशय ज्यादा फैलता है। ऑपरेशन से डिलीवरी की संभावना भी बढ़ती है।",
        "clinical_significance": "GDM primarily acts as an indirect risk multiplier through macrosomia and operative delivery rather than a direct hemorrhage mechanism.",
        "clinical_action": "Monitor estimated fetal weight. If macrosomia suspected, discuss delivery timing and mode with obstetrician. Standard PPH preparedness.",
        "source": "Bener et al., 2012 (GDM and PPH association); WHO GDM Guidelines 2013",
        "category": "medical"
    },
    "macrosomia": {
        "name": "Fetal Macrosomia (Birth Weight > 4kg)",
        "name_hi": "बड़ा बच्चा (वज़न > 4 kg)",
        "icon": "🟡",
        "severity": "HIGH",
        "odds_ratio": 2.5,
        "mechanism": "A large fetus overdistends the uterine myometrium identically to twins. The enlarged uterus has impaired contractile ability after delivery. Additionally, macrosomic deliveries have higher rates of prolonged labor, shoulder dystocia, and soft tissue trauma — all compounding PPH risk.",
        "mechanism_hi": "बड़े बच्चे से गर्भाशय ज्यादा फैलता है और डिलीवरी के बाद सिकुड़ नहीं पाता। लंबी डिलीवरी और कंधा फंसने (shoulder dystocia) से भी ज्यादा चोट और खून बह सकता है।",
        "clinical_significance": "Macrosomia increases PPH risk 2.5-fold via uterine overdistension and associated delivery complications.",
        "clinical_action": "Discuss delivery plan. Prepare oxytocin for active 3rd stage. Anticipate shoulder dystocia protocol if vaginal delivery.",
        "source": "Magann et al., 2005 (PPH risk factors); ACOG Practice Bulletin No. 216",
        "category": "obstetric"
    },
    "is_preterm": {
        "name": "Preterm Delivery (< 37 weeks)",
        "name_hi": "समय से पहले डिलीवरी (37 हफ्ते से कम)",
        "icon": "🟢",
        "severity": "MODERATE",
        "odds_ratio": 1.6,
        "mechanism": "Preterm delivery is often associated with underlying pathology (abruption, preeclampsia, infection) that independently increases hemorrhage risk. Preterm births have higher rates of emergency Cesarean delivery. The premature myometrium may also have altered contractile properties.",
        "mechanism_hi": "समय से पहले डिलीवरी अक्सर किसी गंभीर समस्या (जैसे abruption, preeclampsia) की वजह से होती है जो खून बहने का खतरा बढ़ाती है।",
        "clinical_significance": "Preterm birth doubles PPH risk primarily through its association with underlying obstetric complications rather than prematurity itself.",
        "clinical_action": "Identify underlying cause. Steroids for fetal lung maturity if <34 weeks. Standard PPH preparedness with heightened monitoring.",
        "source": "Kramer et al., 2013 (Preterm birth and PPH); WHO Preterm Birth Guidelines",
        "category": "obstetric"
    },
    "gravidity_parity_gap": {
        "name": "Prior Pregnancy Loss (Miscarriage/Abortion)",
        "name_hi": "पहले का गर्भपात (मिसकैरेज/अबॉर्शन)",
        "icon": "🟢",
        "severity": "MODERATE",
        "odds_ratio": 1.3,
        "mechanism": "Each prior pregnancy loss may involve uterine instrumentation (D&C/MVA), which can damage the endometrium and create scar tissue. This increases the risk of abnormal placentation in subsequent pregnancies and impaired uterine contractility.",
        "mechanism_hi": "पहले के गर्भपात में सफाई (D&C) से गर्भाशय की अंदरूनी परत को नुकसान हो सकता है। इससे अगली प्रेगनेंसी में प्लेसेंटा ठीक से नहीं बनती।",
        "clinical_significance": "A large gap between gravidity and parity (e.g., gravidity 5, parity 1 = 4 losses) signals repeated uterine instrumentation or underlying pathology.",
        "clinical_action": "Screen for uterine abnormalities. Standard PPH preparedness.",
        "source": "Sebghati & Chandraharan, 2017 (PPH risk factor systematic review)",
        "category": "obstetric_history"
    }
}


# ══════════════════════════════════════════════════════════════════════
# 2. ANEMIA SEVERITY ASSESSMENT (NFHS-5 Validated)
# ══════════════════════════════════════════════════════════════════════

def assess_anemia(hb_gdl: Optional[float]) -> Dict[str, Any]:
    """
    Classifies maternal anemia severity using WHO criteria and computes
    NFHS-5 validated hemorrhage vulnerability odds ratios.
    """
    if hb_gdl is None:
        return {
            "status": "UNKNOWN",
            "severity": "Not Available",
            "hemoglobin": None,
            "color": "#94a3b8",
            "icon": "❓",
            "description": "Hemoglobin value not recorded. In India, 52% of pregnant women are anemic (NFHS-5). Strongly recommend pre-delivery Hb testing.",
            "description_hi": "हीमोग्लोबिन की जाँच नहीं हुई। भारत में 52% गर्भवती महिलाओं में खून की कमी है (NFHS-5)। डिलीवरी से पहले Hb जाँच करवाएं।",
            "pph_vulnerability": "Unknown — cannot assess hemorrhage resilience without Hb.",
            "odds_ratio": None,
            "max_allowable_loss_without_transfusion": None,
            "clinical_action": "Obtain STAT hemoglobin and complete blood count before delivery.",
            "source": "NFHS-5 India 2019-21; WHO Anemia Classification"
        }

    result: Dict[str, Any] = {
        "hemoglobin": round(hb_gdl, 1),
        "source": "NFHS-5 India 2019-21 (N=688,803 women; validated against 169,334 delivery cohort)"
    }

    if hb_gdl >= 11.0:
        result.update({
            "status": "NORMAL",
            "severity": "No Anemia",
            "color": "#10b981",
            "icon": "✅",
            "description": f"Hemoglobin {hb_gdl:.1f} g/dL is within normal range (≥11.0 g/dL). Maternal blood oxygen carrying capacity is adequate. The mother can physiologically tolerate expected delivery blood loss (~300-500 mL) without significant compromise.",
            "description_hi": f"हीमोग्लोबिन {hb_gdl:.1f} g/dL सामान्य है। माँ का शरीर डिलीवरी में सामान्य खून बहने (300-500 mL) को सह सकता है।",
            "pph_vulnerability": "Standard resilience. Can tolerate expected physiological blood loss.",
            "odds_ratio": 1.0,
            "clinical_action": "Standard AMTSL protocol. No additional blood product preparation needed beyond routine."
        })
    elif hb_gdl >= 10.0:
        result.update({
            "status": "MILD_ANEMIA",
            "severity": "Mild Anemia",
            "color": "#f59e0b",
            "icon": "⚠️",
            "description": f"Hemoglobin {hb_gdl:.1f} g/dL indicates mild anemia (10.0 - 10.9 g/dL). The mother's physiological reserve to compensate for blood loss is mildly reduced. Even moderate hemorrhage (~500 mL) may cause symptomatic anemia requiring intervention.",
            "description_hi": f"हीमोग्लोबिन {hb_gdl:.1f} g/dL — हल्की खून की कमी। डिलीवरी में थोड़ा भी ज्यादा खून बहा तो कमज़ोरी, चक्कर आ सकता है।",
            "pph_vulnerability": "Slightly reduced hemorrhage tolerance. OR = 1.03 (2.5% increased PPH vulnerability per NFHS-5).",
            "odds_ratio": 1.0252,
            "clinical_action": "Ensure IV access established early. Group & save blood sample. Oral iron supplementation if time permits."
        })
    elif hb_gdl >= 7.0:
        result.update({
            "status": "MODERATE_ANEMIA",
            "severity": "Moderate Anemia",
            "color": "#ea580c",
            "icon": "🟠",
            "description": f"Hemoglobin {hb_gdl:.1f} g/dL indicates moderate anemia (7.0 - 9.9 g/dL). Oxygen carrying capacity is significantly compromised. Even 250 mL of blood loss (half the normal threshold) can push the mother into hypovolemic shock — compared to ~500 mL in a non-anemic woman.",
            "description_hi": f"हीमोग्लोबिन {hb_gdl:.1f} g/dL — मध्यम खून की कमी। सामान्य से आधा खून बहने (250 mL) पर भी माँ को shock हो सकता है।",
            "pph_vulnerability": "CRITICAL VULNERABILITY. OR = 1.06 (6% increased PPH vulnerability). Shock can develop at ~250 mL blood loss vs. normal ~500 mL threshold.",
            "odds_ratio": 1.0602,
            "clinical_action": "Mandatory blood group, crossmatch, and antibody screen. Prepare 2 units PRBC. Establish IV access before active labor. Consider iron sucrose IV infusion if >24 hours to delivery."
        })
    else:
        result.update({
            "status": "SEVERE_ANEMIA",
            "severity": "Severe Anemia (CRITICAL)",
            "color": "#dc2626",
            "icon": "🔴",
            "description": f"Hemoglobin {hb_gdl:.1f} g/dL indicates severe anemia (<7.0 g/dL). The mother is in a state of physiological decompensation even BEFORE delivery. Any blood loss >100 mL can trigger cardiac failure or irreversible hemorrhagic shock. India's NFHS-5 data shows severe anemia increases PPH death risk by 12.2%.",
            "description_hi": f"हीमोग्लोबिन {hb_gdl:.1f} g/dL — गंभीर खून की कमी! डिलीवरी से पहले ही माँ का शरीर कमज़ोर है। 100 mL खून बहने पर भी हार्ट फेलियर हो सकता है।",
            "pph_vulnerability": "EXTREME VULNERABILITY. OR = 1.12 (12.2% increased PPH vulnerability). Hemorrhagic shock threshold as low as 100-150 mL.",
            "odds_ratio": 1.1216,
            "clinical_action": "URGENT: Pre-delivery blood transfusion recommended. Crossmatch 4 units PRBC + 2 units FFP. Senior obstetrician and anesthesiologist must be present. Plan delivery at facility with blood bank and ICU. Consider delaying delivery for 24-48 hours for transfusion if clinically safe."
        })

    return result


# ══════════════════════════════════════════════════════════════════════
# 3. ESTIMATED BLOOD VOLUME & ALLOWABLE BLOOD LOSS
# ══════════════════════════════════════════════════════════════════════

def calculate_blood_volume_analysis(weight_kg: Optional[float] = 60.0,
                                     hb_gdl: Optional[float] = None) -> Dict[str, Any]:
    """
    Calculates Estimated Blood Volume (EBV) at term pregnancy and
    Maximum Allowable Blood Loss (MABL) before transfusion trigger.
    
    Pregnancy EBV = ~100 mL/kg (expanded from ~70 mL/kg non-pregnant).
    ABL = EBV × (Hi - Hf) / Hi, where Hf = transfusion trigger (7.0 g/dL).
    """
    if weight_kg is None or weight_kg <= 0:
        weight_kg = 60.0  # Indian maternal average

    ebv_non_pregnant = weight_kg * 70  # mL
    ebv_pregnant = weight_kg * 100  # mL (40-50% expansion at term)

    result = {
        "maternal_weight_kg": round(weight_kg, 1),
        "ebv_non_pregnant_ml": round(ebv_non_pregnant),
        "ebv_at_term_ml": round(ebv_pregnant),
        "blood_volume_expansion": "~40-50% increase during pregnancy",
        "hemorrhage_classes": {
            "class_I": {
                "label": "Class I (Compensated)",
                "blood_loss_percent": "<15%",
                "blood_loss_ml": f"< {round(ebv_pregnant * 0.15)} mL",
                "symptoms": "Minimal tachycardia. BP normal. Alert and oriented.",
                "action": "Monitor. IV fluids. Continue observation."
            },
            "class_II": {
                "label": "Class II (Mild Shock)",
                "blood_loss_percent": "15-30%",
                "blood_loss_ml": f"{round(ebv_pregnant * 0.15)} - {round(ebv_pregnant * 0.30)} mL",
                "symptoms": "Heart rate 100-120. Narrowed pulse pressure. Anxiety.",
                "action": "Aggressive IV crystalloids. Type & crossmatch. Uterotonics."
            },
            "class_III": {
                "label": "Class III (Moderate Shock)",
                "blood_loss_percent": "30-40%",
                "blood_loss_ml": f"{round(ebv_pregnant * 0.30)} - {round(ebv_pregnant * 0.40)} mL",
                "symptoms": "Heart rate >120. Hypotension. Confusion. Cold/clammy.",
                "action": "IMMEDIATE blood transfusion. Surgical intervention. ICU transfer."
            },
            "class_IV": {
                "label": "Class IV (Severe/Decompensated Shock)",
                "blood_loss_percent": ">40%",
                "blood_loss_ml": f"> {round(ebv_pregnant * 0.40)} mL",
                "symptoms": "Heart rate >140 or bradycardia. Profound hypotension. Lethargy/unconscious.",
                "action": "Massive Transfusion Protocol (MTP). Emergency surgery. NASG garment. Prepare for cardiac arrest."
            }
        }
    }

    if hb_gdl is not None and hb_gdl > 0:
        hf_transfusion_trigger = 7.0  # g/dL (standard obstetric trigger)
        if hb_gdl > hf_transfusion_trigger:
            mabl = ebv_pregnant * (hb_gdl - hf_transfusion_trigger) / hb_gdl
        else:
            mabl = 0

        result["allowable_blood_loss"] = {
            "initial_hb": round(hb_gdl, 1),
            "transfusion_trigger_hb": hf_transfusion_trigger,
            "max_allowable_loss_ml": round(mabl),
            "interpretation": (
                f"With Hb {hb_gdl:.1f} g/dL, this patient can lose up to ~{round(mabl)} mL "
                f"before hemoglobin drops to the transfusion trigger of {hf_transfusion_trigger} g/dL. "
                f"{'⚠️ VERY LOW TOLERANCE — transfusion should be anticipated.' if mabl < 500 else '✅ Reasonable hemorrhage tolerance for vaginal delivery.'}"
            ),
            "formula": f"MABL = EBV × (Hi - Hf) / Hi = {round(ebv_pregnant)} × ({hb_gdl:.1f} - {hf_transfusion_trigger}) / {hb_gdl:.1f} = {round(mabl)} mL"
        }
    else:
        result["allowable_blood_loss"] = {
            "initial_hb": None,
            "max_allowable_loss_ml": None,
            "interpretation": "Cannot calculate without hemoglobin value. Recommend STAT Hb before delivery."
        }

    return result


# ══════════════════════════════════════════════════════════════════════
# 4. WHO/FIGO PPH EMERGENCY PROTOCOL GENERATOR
# ══════════════════════════════════════════════════════════════════════

def generate_emergency_protocol(risk_tier: str, has_coagulopathy: bool = False,
                                  has_hypertension: bool = False) -> Dict[str, Any]:
    """
    Generates evidence-based stepwise WHO/FIGO PPH management protocol
    based on the patient's risk tier and comorbidities.
    """
    protocol = {
        "guideline_basis": "WHO 2023 PPH Guidelines + FIGO 2022 Bundle + NHM Dakshata India",
        "four_ts_assessment": {
            "Tone": "Uterine Atony — assess fundal tone. Is uterus boggy/soft? (Most common cause, ~70-80% of PPH)",
            "Trauma": "Genital Tract Injury — inspect for cervical/vaginal/perineal lacerations systematically",
            "Tissue": "Retained Products — is the placenta complete? Check cotyledons and membranes",
            "Thrombin": "Coagulopathy — check for oozing from IV sites, petechiae, non-clotting blood"
        },
        "prevention_amtsl": {
            "step_1": "Administer 10 IU Oxytocin IM/IV immediately after delivery of the baby (before placental delivery)",
            "step_2": "Delayed cord clamping (1-3 minutes after birth)",
            "step_3": "Controlled cord traction (Brandt-Andrews maneuver) for placental delivery",
            "step_4": "Immediate uterine tone assessment after placental expulsion"
        }
    }

    # First-line treatment (ALL tiers)
    first_line = [
        {"step": "1", "action": "CALL FOR HELP", "detail": "Activate obstetric emergency team. Assign one person to documentation/time-keeping."},
        {"step": "2", "action": "BIMANUAL UTERINE MASSAGE", "detail": "Vigorous fundal massage with one hand abdominally and one hand vaginally if needed. Do NOT stop until uterus is firm and contracted."},
        {"step": "3", "action": "IV ACCESS & FLUIDS", "detail": "Establish 2 large-bore IV lines (16G or 14G). Start rapid infusion of warm crystalloid (Normal Saline or Ringer's Lactate) — 1-2 liters bolus."},
        {"step": "4", "action": "OXYTOCIN", "detail": "IV Oxytocin infusion: 20-40 IU in 1L Normal Saline at 250 mL/hour. This is the gold-standard first-line uterotonic."},
        {"step": "5", "action": "TRANEXAMIC ACID (TXA)", "detail": "Administer 1g IV TXA slowly over 10 minutes. Must be given within 3 HOURS of bleeding onset. Repeat dose if bleeding continues after 30 minutes. (WHO WOMAN Trial: 20% reduction in death from bleeding)."},
    ]

    # Second-line (if first-line fails within 10-15 minutes)
    second_line_uterotonics = []
    if has_hypertension:
        second_line_uterotonics.append({
            "drug": "Misoprostol 800 mcg sublingual",
            "note": "⚠️ Ergometrine CONTRAINDICATED due to hypertensive disorder. Misoprostol is the safe alternative."
        })
        second_line_uterotonics.append({
            "drug": "Carboprost (15-methyl PGF2α) 250 mcg IM",
            "note": "Can repeat every 15 minutes (max 8 doses). Caution in asthma."
        })
    else:
        second_line_uterotonics.append({
            "drug": "Ergometrine 0.5 mg IM/IV slowly",
            "note": "Powerful uterotonic. CONTRAINDICATED in hypertension, preeclampsia."
        })
        second_line_uterotonics.append({
            "drug": "Carboprost (15-methyl PGF2α) 250 mcg IM",
            "note": "Can repeat every 15 minutes (max 8 doses). Very effective for refractory atony."
        })
        second_line_uterotonics.append({
            "drug": "Misoprostol 800 mcg sublingual/rectal",
            "note": "Third-line uterotonic if others fail. Heat-stable, can be given rectally."
        })

    second_line = [
        {"step": "6", "action": "SECOND-LINE UTEROTONICS", "detail": second_line_uterotonics},
        {"step": "7", "action": "EMPTY THE BLADDER", "detail": "Insert Foley catheter. A full bladder prevents uterine contraction. Monitor urine output (>0.5 mL/kg/hr target)."},
        {"step": "8", "action": "EXAMINE FOR TRAUMA & TISSUE", "detail": "Systematic inspection of cervix, vagina, and perineum for lacerations. Manual exploration of uterine cavity for retained placental fragments."},
    ]

    # Third-line (surgical/mechanical escalation)
    third_line = [
        {"step": "9", "action": "UTERINE BALLOON TAMPONADE (UBT)", "detail": "Insert Bakri balloon or condom catheter into uterine cavity. Inflate with 300-500 mL warm saline. If bleeding stops = tamponade test positive. Leave in 12-24 hours."},
        {"step": "10", "action": "NASG (NON-PNEUMATIC ANTI-SHOCK GARMENT)", "detail": "Apply NASG to redirect blood from lower limbs to vital organs. Temporizing measure during transfer or while awaiting surgical intervention."},
        {"step": "11", "action": "BLOOD PRODUCTS", "detail": "Transfuse Packed RBCs if Hb <7 g/dL or ongoing active hemorrhage. 1:1:1 ratio (PRBC:FFP:Platelets) in massive hemorrhage. Aim fibrinogen >2 g/L."},
    ]

    if has_coagulopathy:
        third_line.append({
            "step": "11b", "action": "COAGULOPATHY CORRECTION",
            "detail": "Cryoprecipitate (10 units) if fibrinogen <2 g/L. FFP 15 mL/kg. Platelet concentrate if <50,000/µL. Repeat TXA if not given."
        })

    surgical = [
        {"step": "12", "action": "COMPRESSION SUTURES", "detail": "B-Lynch suture or Hayman suture to mechanically compress the uterus. Success rate ~75-90%."},
        {"step": "13", "action": "ARTERIAL LIGATION", "detail": "Uterine artery ligation (O'Leary sutures) or internal iliac artery ligation to reduce pelvic blood flow."},
        {"step": "14", "action": "PERIPARTUM HYSTERECTOMY", "detail": "Last resort life-saving procedure. Total or subtotal hysterectomy. Decision should not be delayed if patient is deteriorating despite all other measures."},
    ]

    protocol["first_line_treatment"] = first_line
    protocol["second_line_treatment"] = second_line
    protocol["third_line_mechanical_surgical"] = third_line
    protocol["last_resort_surgical"] = surgical

    return protocol


# ══════════════════════════════════════════════════════════════════════
# 5. PREPAREDNESS CHECKLIST GENERATOR
# ══════════════════════════════════════════════════════════════════════

def generate_preparedness_checklist(risk_tier: str,
                                     hb_gdl: Optional[float] = None,
                                     has_previa: bool = False,
                                     has_abruption: bool = False,
                                     has_coagulopathy: bool = False,
                                     prior_csections: int = 0) -> Dict[str, Any]:
    """Generates a dynamic, tier-aware clinical preparedness checklist."""

    checklist: Dict[str, Any] = {
        "tier": risk_tier,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "categories": {}
    }

    # UNIVERSAL (all tiers)
    universal = [
        {"item": "Active Management of Third Stage of Labor (AMTSL)", "detail": "Oxytocin 10 IU IM ready at bedside", "critical": True, "checked": False},
        {"item": "IV cannula (18G minimum) inserted", "detail": "Secured with running Normal Saline drip", "critical": True, "checked": False},
        {"item": "Maternal vitals baseline recorded", "detail": "BP, Pulse, SpO2, Temperature. Record time.", "critical": True, "checked": False},
        {"item": "Blood group & Rh typing done", "detail": "Result available and documented on chart", "critical": True, "checked": False},
        {"item": "Empty bladder / Foley catheter", "detail": "Full bladder prevents uterine contraction", "critical": False, "checked": False},
        {"item": "Postpartum monitoring schedule initiated", "detail": "Vitals every 15 minutes for first 2 hours (WHO/NHM Dakshata)", "critical": True, "checked": False},
    ]
    checklist["categories"]["Universal Preparedness"] = universal

    # ENHANCED tier additions
    if risk_tier in ["ENHANCED", "ESCALATED"]:
        enhanced = [
            {"item": "Second IV line (16G) established", "detail": "Dual access for rapid fluid resuscitation", "critical": True, "checked": False},
            {"item": "Blood crossmatch sent", "detail": "Minimum 2 units PRBC + 2 units FFP", "critical": True, "checked": False},
            {"item": "Tranexamic Acid (TXA) 1g ampule at bedside", "detail": "Must be administered within 3 hours of hemorrhage onset", "critical": True, "checked": False},
            {"item": "Second-line uterotonics available", "detail": "Carboprost 250 mcg + Misoprostol 800 mcg at bedside", "critical": True, "checked": False},
            {"item": "Uterine Balloon Tamponade (Bakri/Condom catheter) kit ready", "detail": "Pre-assembled at bedside for immediate deployment", "critical": False, "checked": False},
            {"item": "Senior obstetrician informed", "detail": "Aware of patient profile and on-floor availability", "critical": True, "checked": False},
            {"item": "Anesthesia team alerted", "detail": "For possible emergency surgical intervention", "critical": False, "checked": False},
        ]
        checklist["categories"]["Enhanced Monitoring Preparations"] = enhanced

    # ESCALATED tier additions
    if risk_tier == "ESCALATED":
        escalated = [
            {"item": "Blood products physically present in delivery suite", "detail": "4 units PRBC + 4 units FFP + 1 unit Cryoprecipitate crossmatched and AVAILABLE", "critical": True, "checked": False},
            {"item": "Massive Transfusion Protocol (MTP) pre-activated with blood bank", "detail": "Blood bank aware of imminent potential activation", "critical": True, "checked": False},
            {"item": "Senior Obstetrician physically IN delivery room", "detail": "Not just informed — present and scrubbed", "critical": True, "checked": False},
            {"item": "Anesthesiologist present / OT prepared", "detail": "Operating theatre ready for emergency laparotomy within 15 minutes", "critical": True, "checked": False},
            {"item": "NASG (Non-Pneumatic Anti-Shock Garment) at bedside", "detail": "Ready to apply for hemodynamic stabilization during transfer", "critical": True, "checked": False},
            {"item": "Neonatal resuscitation team on standby", "detail": "Warmer, suction, bag-mask, and surfactant ready", "critical": True, "checked": False},
        ]
        checklist["categories"]["Critical Escalation Preparations"] = escalated

    # Conditional items based on specific risk factors
    special = []
    if has_previa:
        special.append({"item": "⚠️ PLACENTA PREVIA: Plan Cesarean delivery", "detail": "Vaginal delivery contraindicated with complete previa. Discuss timing with OB.", "critical": True, "checked": False})
        special.append({"item": "⚠️ Assess for Placenta Accreta Spectrum", "detail": "Ultrasound + MRI if available. Prior C-section + previa = high accreta risk.", "critical": True, "checked": False})
    if has_abruption:
        special.append({"item": "⚠️ ABRUPTION: Continuous fetal monitoring", "detail": "CTG/NST mandatory. Emergency delivery if fetal distress.", "critical": True, "checked": False})
        special.append({"item": "⚠️ DIC screening panel sent", "detail": "Fibrinogen, D-dimer, PT/aPTT, platelet count every 2-4 hours.", "critical": True, "checked": False})
    if has_coagulopathy:
        special.append({"item": "⚠️ COAGULOPATHY: Hematology consultation", "detail": "Specific factor replacement or platelet transfusion plan documented.", "critical": True, "checked": False})
    if prior_csections >= 2:
        special.append({"item": "⚠️ MULTIPLE PRIOR C-SECTIONS: Screen for Placenta Accreta", "detail": f"{prior_csections} prior C-sections. Accreta risk: {min(60, prior_csections * 15)}%. Ultrasound assessment mandatory.", "critical": True, "checked": False})
    if hb_gdl is not None and hb_gdl < 7.0:
        special.append({"item": "🚨 SEVERE ANEMIA: Pre-delivery transfusion", "detail": f"Hb {hb_gdl:.1f} g/dL. Transfuse 2 units PRBC to raise Hb before delivery if time allows.", "critical": True, "checked": False})

    if special:
        checklist["categories"]["⚠️ Patient-Specific Risk Alerts"] = special

    # Count totals
    total_items = sum(len(items) for items in checklist["categories"].values())
    critical_items = sum(1 for items in checklist["categories"].values() for item in items if item.get("critical"))
    checklist["total_items"] = total_items
    checklist["critical_items"] = critical_items

    return checklist


# ══════════════════════════════════════════════════════════════════════
# 6. POSTPARTUM MONITORING SCHEDULE
# ══════════════════════════════════════════════════════════════════════

def generate_monitoring_schedule(risk_tier: str) -> Dict[str, Any]:
    """
    Generates WHO/NHM Dakshata mandated postpartum vitals monitoring schedule.
    The 'Fourth Stage of Labor' (first 2 hours post-delivery) is the most
    critical window — 70-80% of primary PPH deaths occur here.
    """
    base_checks = [
        "Blood Pressure (systolic & diastolic)",
        "Heart Rate / Pulse",
        "Uterine Fundal Tone (firm/boggy)",
        "Lochia Volume & Character (color, clots)",
        "Bladder Distension Check",
        "Maternal Consciousness Level",
        "SpO2 (if oximeter available)"
    ]

    schedule = {
        "critical_window": "First 2 hours postpartum (Fourth Stage of Labor)",
        "evidence_basis": "WHO 2018 Postpartum Guidelines + NHM Dakshata Labour Room Quality Improvement Initiative",
        "uterine_atony_window": "70-80% of primary PPH is caused by uterine atony in this window",
        "vitals_to_check": base_checks,
        "intervals": []
    }

    if risk_tier == "ESCALATED":
        schedule["intervals"] = [
            {"period": "0 - 30 min", "frequency": "Every 5 minutes", "rationale": "Maximum hemorrhage risk period. Continuous observation."},
            {"period": "30 min - 2 hours", "frequency": "Every 10 minutes", "rationale": "Ongoing high-risk monitoring until stability confirmed."},
            {"period": "2 - 4 hours", "frequency": "Every 15 minutes", "rationale": "Extended surveillance for late-onset PPH."},
            {"period": "4 - 6 hours", "frequency": "Every 30 minutes", "rationale": "Transition to standard monitoring if stable."},
            {"period": "6 - 24 hours", "frequency": "Every 1 hour", "rationale": "Secondary PPH surveillance."},
        ]
    elif risk_tier == "ENHANCED":
        schedule["intervals"] = [
            {"period": "0 - 30 min", "frequency": "Every 10 minutes", "rationale": "Early hemorrhage detection in elevated-risk patient."},
            {"period": "30 min - 2 hours", "frequency": "Every 15 minutes", "rationale": "Standard Dakshata-mandated frequency for the critical window."},
            {"period": "2 - 4 hours", "frequency": "Every 30 minutes", "rationale": "Continued monitoring beyond minimum."},
            {"period": "4 - 24 hours", "frequency": "Every 1 hour", "rationale": "Standard postpartum ward monitoring."},
        ]
    else:
        schedule["intervals"] = [
            {"period": "0 - 2 hours", "frequency": "Every 15 minutes", "rationale": "WHO/NHM Dakshata mandated minimum for ALL deliveries."},
            {"period": "2 - 4 hours", "frequency": "Every 30 minutes", "rationale": "Extended observation period."},
            {"period": "4 - 24 hours", "frequency": "Every 1 hour", "rationale": "Standard postpartum ward monitoring."},
        ]

    schedule["escalation_triggers"] = [
        "Uterine fundus becomes boggy/soft (loss of tone)",
        "Lochia volume suddenly increases or large clots appear",
        "Heart Rate rises >100 bpm or increases >20 bpm from baseline",
        "Systolic BP drops >20 mmHg from baseline or <90 mmHg",
        "Shock Index (HR/SBP) exceeds 0.90",
        "SpO2 drops below 95%",
        "Patient reports dizziness, breathlessness, or feels cold/clammy",
        "Visible perineal/vaginal bleeding increases despite uterine firmness"
    ]

    return schedule


# ══════════════════════════════════════════════════════════════════════
# 7. RISK FACTOR EXPLANATION BUILDER
# ══════════════════════════════════════════════════════════════════════

def build_risk_explanations(patient_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analyzes patient clinical features and returns evidence-based
    explanations for every detected risk factor with mechanisms,
    clinical significance, and actions.
    """
    explanations: List[Dict[str, Any]] = []

    # Map patient fields to encyclopedia keys
    field_map = {
        "placenta_previa": ("placenta_previa", 1),
        "placental_abruption": ("placental_abruption", 1),
        "coagulation_disorders": ("coagulation_disorders", 1),
        "multiple_births": ("multiple_births", 1),
        "hypertensive_disorders": ("hypertensive_disorders", 1),
        "gestational_diabetes": ("gestational_diabetes", 1),
        "macrosomia": ("macrosomia", 1),
    }

    for field_key, (enc_key, trigger_val) in field_map.items():
        val = patient_data.get(field_key, 0)
        if val == trigger_val and enc_key in RISK_FACTOR_ENCYCLOPEDIA:
            explanations.append(RISK_FACTOR_ENCYCLOPEDIA[enc_key])

    # Prior C-sections (continuous)
    prior_cs = patient_data.get("prior_csections", 0)
    if prior_cs > 0 and "prior_csections" in RISK_FACTOR_ENCYCLOPEDIA:
        entry = RISK_FACTOR_ENCYCLOPEDIA["prior_csections"].copy()
        if prior_cs >= 3:
            entry["odds_ratio"] = 14.2
            entry["severity"] = "CRITICAL"
            entry["icon"] = "🔴"
        elif prior_cs >= 2:
            entry["odds_ratio"] = 8.6
            entry["severity"] = "CRITICAL"
            entry["icon"] = "🔴"
        explanations.append(entry)

    # Preterm
    ga = patient_data.get("gestational_age", 39)
    if ga < 37 and "is_preterm" in RISK_FACTOR_ENCYCLOPEDIA:
        entry = RISK_FACTOR_ENCYCLOPEDIA["is_preterm"].copy()
        entry["clinical_significance"] = (
            f"Delivery at {ga:.1f} weeks gestation. " + entry["clinical_significance"]
        )
        explanations.append(entry)

    # Gravidity-parity gap
    gravidity = patient_data.get("gravidity", 1)
    parity = patient_data.get("parity", 0)
    gap = max(0, gravidity - parity)
    if gap >= 2 and "gravidity_parity_gap" in RISK_FACTOR_ENCYCLOPEDIA:
        entry = RISK_FACTOR_ENCYCLOPEDIA["gravidity_parity_gap"].copy()
        entry["clinical_significance"] = (
            f"Gravidity {int(gravidity)} - Parity {int(parity)} = Gap of {int(gap)} "
            f"(indicates {int(gap - 1)} prior pregnancy losses). " + entry["clinical_significance"]
        )
        explanations.append(entry)

    # Sort by severity
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "LOW": 3}
    explanations.sort(key=lambda x: severity_order.get(x.get("severity", "LOW"), 99))

    return explanations


# ══════════════════════════════════════════════════════════════════════
# 8. RISK INTERACTION ANALYSIS
# ══════════════════════════════════════════════════════════════════════

def analyze_risk_interactions(patient_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Identifies dangerous COMBINATIONS of risk factors that compound
    each other beyond individual risk (synergistic effects).
    """
    interactions: List[Dict[str, Any]] = []

    previa = patient_data.get("placenta_previa", 0) == 1
    prior_cs = patient_data.get("prior_csections", 0) > 0
    abruption = patient_data.get("placental_abruption", 0) == 1
    coagulation = patient_data.get("coagulation_disorders", 0) == 1
    htn = patient_data.get("hypertensive_disorders", 0) == 1
    twins = patient_data.get("multiple_births", 0) == 1
    macro = patient_data.get("macrosomia", 0) == 1
    hb = patient_data.get("maternal_hemoglobin_gdl", None)
    severe_anemia = hb is not None and hb < 7.0

    if previa and prior_cs:
        interactions.append({
            "combination": "Placenta Previa + Prior C-Section",
            "danger_level": "EXTREME",
            "icon": "💀",
            "explanation": "This is the highest-risk combination in obstetrics. Prior C-section scar + low-lying placenta = Placenta Accreta Spectrum risk of 25-60%. The placenta invades the uterine scar and cannot separate normally. This causes catastrophic hemorrhage requiring emergency hysterectomy in most cases.",
            "action": "MANDATORY: Ultrasound for accreta assessment. Plan delivery at tertiary centre with blood bank, interventional radiology, and ICU. Have 6 units PRBC crossmatched."
        })

    if abruption and coagulation:
        interactions.append({
            "combination": "Placental Abruption + Coagulopathy",
            "danger_level": "EXTREME",
            "icon": "💀",
            "explanation": "Abruption releases tissue thromboplastin into the maternal circulation, triggering Disseminated Intravascular Coagulation (DIC). Pre-existing coagulopathy accelerates this cascade dramatically. Bleeding becomes uncontrollable because the body cannot form clots.",
            "action": "Immediate fibrinogen level check. Prepare cryoprecipitate (10 units) and FFP (4 units). Hematology consultation. TXA 1g IV NOW."
        })

    if abruption and htn:
        interactions.append({
            "combination": "Placental Abruption + Hypertension/Preeclampsia",
            "danger_level": "VERY_HIGH",
            "icon": "🔴",
            "explanation": "Hypertension is the leading cause of placental abruption. Damaged maternal spiral arteries from preeclampsia rupture, causing the placenta to separate. The combination also increases HELLP syndrome risk, which further impairs clotting.",
            "action": "Continuous fetal monitoring. Serial coagulation panels every 2-4 hours. Emergency delivery if fetal distress. Watch for HELLP syndrome (LDH, AST, platelets)."
        })

    if twins and macro:
        interactions.append({
            "combination": "Multiple Pregnancy + Macrosomia",
            "danger_level": "HIGH",
            "icon": "🟠",
            "explanation": "Extreme uterine overdistension from both twins AND large fetal size. The myometrium is stretched to its physiological limit and will have severely impaired contractile ability after delivery. Uterine atony is almost certain.",
            "action": "Carbetocin or prolonged oxytocin infusion immediately after delivery. Prepare mechanical tamponade. Anticipate atony."
        })

    if severe_anemia and any([previa, abruption, coagulation]):
        interactions.append({
            "combination": f"Severe Anemia (Hb {hb:.1f}) + Critical Hemorrhage Risk Factor",
            "danger_level": "EXTREME",
            "icon": "💀",
            "explanation": f"Severe anemia (Hb {hb:.1f} g/dL) combined with a high-hemorrhage-risk condition is potentially fatal. The patient has near-zero physiological reserve — even 100-200 mL of blood loss can cause irreversible cardiac shock. Standard hemorrhage thresholds do NOT apply.",
            "action": "Pre-delivery transfusion MANDATORY. Delay delivery for 24-48 hours for 2-unit PRBC transfusion if clinically safe. If delivery imminent: have 4 units PRBC and 2 units FFP immediately available."
        })

    return interactions


# ══════════════════════════════════════════════════════════════════════
# 9. COMPREHENSIVE ANALYSIS AGGREGATOR
# ══════════════════════════════════════════════════════════════════════

def generate_full_clinical_analysis(patient_data: Dict[str, Any],
                                      risk_tier: str,
                                      ensemble_risk: float) -> Dict[str, Any]:
    """
    Master function that aggregates ALL clinical intelligence modules
    into a single comprehensive analysis response for the frontend.
    """
    hb = patient_data.get("maternal_hemoglobin_gdl", None)
    weight = patient_data.get("weight_kg", 60.0)

    return {
        "risk_explanations": build_risk_explanations(patient_data),
        "risk_interactions": analyze_risk_interactions(patient_data),
        "anemia_assessment": assess_anemia(hb),
        "blood_volume_analysis": calculate_blood_volume_analysis(weight, hb),
        "emergency_protocol": generate_emergency_protocol(
            risk_tier,
            has_coagulopathy=patient_data.get("coagulation_disorders", 0) == 1,
            has_hypertension=patient_data.get("hypertensive_disorders", 0) == 1
        ),
        "preparedness_checklist": generate_preparedness_checklist(
            risk_tier,
            hb_gdl=hb,
            has_previa=patient_data.get("placenta_previa", 0) == 1,
            has_abruption=patient_data.get("placental_abruption", 0) == 1,
            has_coagulopathy=patient_data.get("coagulation_disorders", 0) == 1,
            prior_csections=int(patient_data.get("prior_csections", 0))
        ),
        "monitoring_schedule": generate_monitoring_schedule(risk_tier),
        "clinical_context": {
            "pph_definition": "Postpartum Hemorrhage: Blood loss ≥500 mL within 24 hours post-delivery (WHO/FIGO definition)",
            "severe_pph_definition": "Severe PPH: Blood loss ≥1000 mL within 24 hours (life-threatening)",
            "india_maternal_deaths_per_year": "~70,000 maternal deaths annually in India from PPH",
            "india_anemia_prevalence": "52% of pregnant women in India are anemic (Hb < 11 g/dL) — NFHS-5",
            "visual_estimation_error": "Visual blood loss estimation underestimates actual loss by 30-50% (Lancet Global Health)",
            "golden_hour": "The first 2 hours postpartum (Fourth Stage of Labor) accounts for 70-80% of all primary PPH deaths",
            "uterine_atony_proportion": "Uterine atony causes 70-80% of primary PPH — it is the #1 target for prevention",
            "bleeding_velocity_critical": "Blood loss >20 mL/min = active refractory hemorrhage outstripping physiological compensation"
        }
    }
