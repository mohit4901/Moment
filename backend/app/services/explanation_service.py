"""
MOMENT Clinical AI Explanation Service (Groq / Nemotron Layer)
==============================================================
CRITICAL ARCHITECTURAL CONTRACT:
- ML Models (XGBoost, LightGBM, FT-Transformer, ResNet-50) & Shock Index are solely responsible for PREDICTION.
- The LLM Explanation Layer is STRICTLY for converting structured clinical outputs into clear, human-readable explanations.
- The LLM NEVER alters risk scores, probabilities, Shock Index values, or blood loss measurements.
- If Groq/Nemotron APIs are unavailable or keys are unset, a robust deterministic clinical fallback explanation is provided immediately.
"""
import os
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional

class ExplanationService:
    _instance = None
    def __init__(self):
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.nemotron_api_key = (
            os.environ.get("NVIDIA_NEMOTRON_API_KEY") or
            os.environ.get("NEMOTRON_API_KEY") or
            os.environ.get("NVIDIA_API_KEY") or ""
        ).strip()
        m = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
        self.groq_model = "qwen/qwen3.8-27b" if "llama-3.3" in m else m
        self.nemotron_model = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")

    @classmethod
    def get_instance(cls) -> "ExplanationService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _call_groq(self, prompt: str, system_prompt: str) -> Optional[str]:
        """Calls Groq Cloud API with low latency and temperature."""
        if not self.groq_api_key:
            return None
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": self.groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 512,
                "response_format": {"type": "json_object"}
            }
            req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=2.0) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["choices"][0]["message"]["content"]
        except Exception as e:
            return None

    def _call_nemotron(self, prompt: str, system_prompt: str) -> Optional[str]:
        """Calls NVIDIA Nemotron API if available."""
        if not self.nemotron_api_key:
            return None
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.nemotron_api_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": self.nemotron_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "top_p": 0.95,
                "max_tokens": 1024
            }
            req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=2.0) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["choices"][0]["message"]["content"]
        except Exception as e:
            return None

    def explain_risk_assessment(self, prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates structured tabular ML model predictions into deep clinical insights
        framed as an evidence-based Prevalence Ratio (e.g., '1 in 16 mothers') to avoid
        dogmatic diagnostic claims, while detailing exact pathophysiological mechanisms
        and WHO 2025 E-MOTIVE First-Response Bundle protocols.
        """
        risk_tier = prediction_result.get("risk_tier", "ROUTINE")
        prob_val = prediction_result.get("probability", 0.05)
        prob_pct = round(prob_val * 100, 1)
        top_factors = prediction_result.get("top_factors", [])
        pt_name = prediction_result.get("patient_name", "Patient")
        
        # Calculate clinical odds ratio & relative risk fold
        if prob_val > 0.005:
            one_in_x = max(2, round(1.0 / prob_val))
            prevalence_ratio_en = f"1 in {one_in_x} mothers"
            prevalence_ratio_hi = f"{one_in_x} में से 1 महिला"
            fold_num = round(prob_val / 0.035, 1)
            relative_risk_str = f"{fold_num}× Regional Baseline"
        else:
            one_in_x = 100
            prevalence_ratio_en = "1 in 100+ mothers"
            prevalence_ratio_hi = "100 में से 1 से कम महिला"
            relative_risk_str = "1.0× Baseline"

        target_lang = prediction_result.get("target_language") or prediction_result.get("language") or "hi"
        indic_lang_names = {
            "hi": "Hindi (हिन्दी)",
            "bn": "Bengali (বাংলা)",
            "te": "Telugu (తెలుగు)",
            "mr": "Marathi (मराठी)",
            "ta": "Tamil (தமிழ்)",
            "gu": "Gujarati (ગુજરાતી)",
            "kn": "Kannada (ಕನ್ನಡ)",
            "ml": "Malayalam (മലയാളം)",
            "or": "Odia (ଓଡ଼ିଆ)",
            "pa": "Punjabi (ਪੰਜਾਬੀ)",
            "as": "Assamese (অসমীয়া)",
            "ur": "Urdu (اردو)",
            "mai": "Maithili (मैथिली)",
            "sat": "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
            "ks": "Kashmiri (कॉशुर)",
            "ne": "Nepali (नेपाली)",
            "kok": "Konkani (कोंकणी)",
            "sd": "Sindhi (سنڌي)",
            "doi": "Dogri (डोगरी)",
            "mni": "Manipuri (মৈতৈলোন্)",
            "brx": "Bodo (बड़ो)",
            "sa": "Sanskrit (संस्कृतम्)",
            "en": "English"
        }
        target_lang_name = indic_lang_names.get(target_lang, "Hindi (हिन्दी)")

        system_prompt = (
            "You are a Senior Obstetrician & Clinical AI Specialist for WHO / MoHFW India. "
            "Your task is to provide rigorous, scientifically defensible clinical reasoning for a maternal PPH risk assessment. "
            "MANDATORY CLINICAL DIRECTIVES:\n"
            "1. NEVER state a dogmatic certainty or overclaim. Always frame the prediction as a Clinical Prevalence Likelihood / Odds Ratio (e.g. '1 in X mothers with matching biomarkers develop significant hemorrhage').\n"
            "2. Explain the EXACT biological pathophysiology: how low hemoglobin causes myometrial tissue hypoxia and impairs uterine tetanic contraction; how prior scars affect lower uterine segment compliance; how multiparity causes smooth muscle elastosis.\n"
            f"3. Provide bedside clinical instructions and summary natively in the patient's requested Indian regional language: {target_lang_name} under the key 'summary_localized'.\n"
            "4. Ground all immediate bedside interventions in the WHO 2025 E-MOTIVE First-Response Bundle (Early detection, Massage, Oxytocic, TXA, IV fluids, Examination of birth canal).\n"
            "5. Return strict JSON with keys: 'summary_localized', 'summary_hindi', 'summary_english', 'prevalence_ratio_statement', 'pathophysiology_mechanisms', 'who_emotive_checklist', 'bedside_action_items', 'disclaimer', 'target_language'."
        )

        prompt = (
            f"Generate clinical reasoning for this obstetric patient:\n"
            f"- Mother Name: {pt_name}\n"
            f"- Requested Regional Indian Language: {target_lang_name} ({target_lang})\n"
            f"- Model Predicted Risk Tier: {risk_tier}\n"
            f"- Calibrated Probability: {prob_pct}% (Evidence-Based Odds: ~{prevalence_ratio_en}, {relative_risk_str})\n"
            f"- Contributing Biomarkers: {json.dumps(top_factors)}\n"
            f"Provide an authoritative clinical explanation suitable for ANMs and Obstetricians, with 'summary_localized' in {target_lang_name}."
        )

        hb_val = prediction_result.get("maternal_hemoglobin_gdl") or 7.6
        diet_plan = self.generate_postpartum_diet_plan(
            patient_data=prediction_result,
            hb_val=float(hb_val),
            language=target_lang
        )

        llm_response = self._call_nemotron(prompt, system_prompt) or self._call_groq(prompt, system_prompt)
        if llm_response:
            try:
                clean_text = llm_response.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                parsed = json.loads(clean_text.strip())
                parsed["source"] = "NVIDIA Nemotron / Groq Multimodal Clinical Intelligence Layer"
                parsed["prevalence_ratio"] = prevalence_ratio_en
                parsed["prevalence_ratio_hindi"] = prevalence_ratio_hi
                parsed["relative_risk_fold"] = relative_risk_str
                parsed["target_language"] = target_lang
                parsed["postpartum_diet_plan"] = diet_plan
                if not parsed.get("summary_localized"):
                    parsed["summary_localized"] = parsed.get("summary_hindi") or parsed.get("summary_english")
                return parsed
            except Exception:
                pass

        # ── Deterministic Gold-Standard Clinical Pathophysiology Engine ──
        factors_text = ", ".join([f"{f.get('feature_name', '')}" for f in top_factors[:3]])
        
        if risk_tier == "ESCALATED":
            summary_hi = (
                f"मरीज {pt_name} के बायोमार्कर्स उच्च जोखिम दर्शाते हैं — इस प्रोफाइल वाली लगभग {prevalence_ratio_hi} ({relative_risk_str}) "
                f"में प्रसवोपरांत गंभीर रक्तस्राव (PPH) की संभावना होती है। मुख्य कारण: {factors_text}। प्राथमिक केंद्र पर रक्त व वरिष्ठ चिकित्सक सुनिश्चित करें।"
            )
            summary_en = (
                f"Calibrated multi-model ensemble stratifies {pt_name} into High Vigilance (ESCALATED). "
                f"Clinical evidence indicates ~{prevalence_ratio_en} presenting with this biomarker constellation develop severe PPH ({relative_risk_str})."
            )
            pathophysiology = (
                "Pathophysiological Drivers: 1) Maternal anemia (Hb < 8.0 g/dL) critically depletes systemic oxygen carriage, accelerating myometrial smooth muscle fatigue and blunting endogenous oxytocin receptor response. "
                "2) Hemodilution reduces circulating fibrinogen reserves below 200 mg/dL, severely compromising physiological clot stability at the placental detachment bed. "
                "3) Inadequate myometrial tetanic contraction allows continued maternal blood flow through patent spiral arteries."
            )
            emotive_bundle = [
                "E - Early Detection: Calibrated lochia collection drape placed immediately post-crowning",
                "M - Uterine Massage: Vigorous repetitive bimanual fundal compression every 5 minutes",
                "O - Oxytocic First-Line: Oxytocin 10 IU IM + Misoprostol 800 mcg sublingually on anterior shoulder",
                "T - Tranexamic Acid (TXA): 1g IV infused over 10 minutes within 15 minutes of onset",
                "I - IV Fluid Resuscitation: Two wide-bore 16G/18G cannulae with warm balanced crystalloids (Ringers Lactate)",
                "V - Visual Genital Tract Exam: Speculum inspection under good light to rule out cervical/vaginal lacerations"
            ]
            actions = [
                "Pre-arrange 2 units of compatible Packed Red Blood Cells (PRBCs) at referral blood bank",
                "Secure two 16G/18G IV cannulae before entering active labor stage",
                "Verify 108 Emergency Obstetric Transport standby for rapid tertiary transfer to PGIMS Rohtak",
                "Continuous automated maternal vital signs (HR, SBP, Shock Index) recorded every 10 minutes"
            ]
        elif risk_tier == "ENHANCED":
            summary_hi = (
                f"मरीज {pt_name} में सतर्कता आवश्यक (ENHANCED) — इस प्रोफाइल वाली लगभग {prevalence_ratio_hi} ({relative_risk_str}) "
                f"में मध्यम से अधिक रक्तस्राव का जोखिम देखा जाता है। मुख्य कारक: {factors_text}। प्रसव के तीसरे चरण का सक्रिय प्रबंधन (AMTSL) अनिवार्य है।"
            )
            summary_en = (
                f"Multi-model ensemble identifies elevated clinical vigilance (ENHANCED). "
                f"Empirical clinical cohort odds: ~{prevalence_ratio_en} ({relative_risk_str}). Active third-stage labor management required."
            )
            pathophysiology = (
                "Pathophysiological Drivers: Moderate anemia and obstetric history create a narrower hemodynamic safety buffer. "
                "While base spiral artery vasoconstriction is intact, myometrial contraction efficiency is susceptible to prolonged second-stage labor exhaustion, increasing the risk of secondary uterine atony."
            )
            emotive_bundle = [
                "E - Early Detection: Continuous monitoring of pad saturation using visual computer vision triage",
                "M - Uterine Massage: Fundal tone palpation every 15 minutes for 2 hours postpartum",
                "O - Oxytocic: Standard prophylactic Oxytocin 10 IU IM within 1 minute of delivery",
                "T - TXA Standby: Tranexamic Acid 1g IV prepared for immediate administration if blood loss exceeds 300 mL",
                "I - IV Line: 18G IV cannula patent with IV line kept open",
                "V - Void Bladder: Catheterize bladder if distended to prevent mechanical impedance of uterine retraction"
            ]
            actions = [
                "Keep 18G IV cannula patent with infusion line on standby",
                "Palpate uterine fundus every 15 minutes to verify firm contraction",
                "Monitor lochia rate using optical pad scanner or gravimetric measurement",
                "Verify cross-match blood grouping and ensure 108 driver contact is accessible"
            ]
        else:
            summary_hi = (
                f"मरीज {pt_name} का प्रसव पूर्व प्रोफाइल सामान्य और सुरक्षित सीमा (ROUTINE) में है। "
                f"सांख्यिकीय संभावना: {prevalence_ratio_hi}। मानक मातृत्व देखभाल (AMTSL) का पालन करें।"
            )
            summary_en = (
                f"Calibrated multi-model ensemble places {pt_name} within standard physiological baseline (ROUTINE). "
                f"Expected clinical incidence: ~{prevalence_ratio_en}. Standard active management of third stage of labor applies."
            )
            pathophysiology = (
                "Physiological Profile: Adequate maternal hemoglobin and balanced obstetric history maintain optimal myometrial contractility and robust physiological fibrinogen reserves for prompt placental bed hemostasis."
            )
            emotive_bundle = [
                "E - Early Detection: Routine lochia inspection at 15-minute postpartum intervals",
                "M - Uterine Massage: Palpate fundus to confirm firm contraction at every vital checkpoint",
                "O - Oxytocic: Standard prophylactic Oxytocin 10 IU IM following delivery",
                "T - Supportive: Encourage immediate skin-to-skin contact for endogenous oxytocin surge",
                "I - Oral Hydration: Encourage oral fluids and nutritional support",
                "V - Rest: Standard 2-hour postpartum labor-room recovery observation"
            ]
            actions = [
                "Standard Active Management of Third Stage of Labor (AMTSL)",
                "Vital signs (pulse, BP, lochia) recorded every 30 minutes for 2 hours",
                "Support early initiation of breastfeeding within first hour"
            ]

        return {
            "summary": summary_en,
            "summary_hindi": summary_hi,
            "summary_english": summary_en,
            "prevalence_ratio": prevalence_ratio_en,
            "prevalence_ratio_hindi": prevalence_ratio_hi,
            "relative_risk_fold": relative_risk_str,
            "prevalence_ratio_statement": f"Clinical Likelihood: ~{prevalence_ratio_en} ({relative_risk_str})",
            "key_drivers_explained": f"Primary biomarkers: {factors_text or 'Baseline physiological markers'}",
            "pathophysiology_mechanisms": pathophysiology,
            "who_emotive_checklist": emotive_bundle,
            "clinical_action_items": actions,
            "bedside_action_items": actions,
            "postpartum_diet_plan": diet_plan,
            "disclaimer": "MOMENT Clinical AI is an evidence-based clinical decision-support tool. It does not replace individualized clinical judgment by an accredited obstetrician or healthcare professional.",
            "source": "MOMENT Evidence-Based Obstetric Protocol (WHO 2025 E-MOTIVE / NHM Dakshata)"
        }

    def generate_postpartum_diet_plan(
        self,
        patient_data: Dict[str, Any],
        hb_val: float = 7.6,
        language: str = "hi"
    ) -> Dict[str, Any]:
        """
        Generates an authoritative, culturally tailored Postpartum Recovery & Anemia Replenishment
        Diet Plan designed specifically for Indian mothers recovering from childbirth and battling low hemoglobin.
        Integrates WHO, MoHFW Anemia Mukt Bharat, and traditional Ayush Sutika Paricharya principles.
        """
        pt_name = patient_data.get("patient_name") or patient_data.get("name") or "Mother"
        try:
            hb_float = float(hb_val or 7.6)
        except Exception:
            hb_float = 7.6

        if hb_float < 8.0:
            stage_en = f"Severe Anemia Recovery (Hb {hb_float:.1f} g/dL) — Acute Iron Replenishment Phase"
            stage_hi = f"गंभीर एनीमिया रिकवरी (हीमोग्लोबिन {hb_float:.1f} g/dL) — तत्काल आयरन वृद्धि चरण"
            iron_target = "35–40 mg/दिन (एलिमेंटल आयरन + रात में IFA गोली)"
            status_color = "red"
        elif hb_float < 11.0:
            stage_en = f"Moderate Anemia Recovery (Hb {hb_float:.1f} g/dL) — Bioavailable Iron Replenishment"
            stage_hi = f"मध्यम एनीमिया रिकवरी (हीमोग्लोबिन {hb_float:.1f} g/dL) — सक्रिय हीमोग्लोबिन सुधार चरण"
            iron_target = "30–35 mg/दिन (एलिमेंटल आयरन + दैनिक IFA)"
            status_color = "amber"
        else:
            stage_en = f"Optimal Hemoglobin (Hb {hb_float:.1f} g/dL) — Postpartum Vitality & Lactation Sustenance"
            stage_hi = f"सुरक्षित हीमोग्लोबिन (हीमोग्लोबिन {hb_float:.1f} g/dL) — स्तनपान व मातृत्व ऊर्जा संवर्धन"
            iron_target = "25–30 mg/दिन (रखरखाव व स्तनपान)"
            status_color = "emerald"

        # Try Calling NVIDIA Nemotron / Groq LLM
        system_prompt = (
            "You are a Senior Obstetric Nutritionist & Maternal Health Specialist with MoHFW India and WHO. "
            "You design evidence-based postpartum recovery diets specifically engineered for Indian mothers battling anemia (low Hemoglobin). "
            "Return strict JSON with keys: 'diet_title', 'anemia_stage', 'daily_targets', 'meal_schedule', 'iron_absorption_rules', 'superfoods', 'clinical_advice_localized'."
        )
        prompt = (
            f"Generate a customized Indian postpartum anemia recovery diet plan:\n"
            f"- Mother Name: {pt_name}\n"
            f"- Maternal Hemoglobin: {hb_float:.1f} g/dL\n"
            f"- Target Regional Indian Language: {language}\n"
            f"Requirements:\n"
            f"- 6 timed daily meals (Morning Tonic, Breakfast, Mid-Morning, Lunch, Evening Snack, Healing Dinner, Bedtime Cup).\n"
            f"- Emphasize Indian iron-dense foods (Palak, Moringa/Sahjan, Ragi, Munakka, Gur, Masoor Dal, Beetroot).\n"
            f"- Explicit rules: Vitamin C pairing for 300% iron absorption; Strictly no tea/coffee/milk within 2 hours of iron meals or IFA tablet.\n"
            f"- Localized advice under 'clinical_advice_localized' in language '{language}'."
        )

        llm_resp = self._call_nemotron(prompt, system_prompt) or self._call_groq(prompt, system_prompt)
        if llm_resp:
            try:
                clean = llm_resp.strip()
                if clean.startswith("```json"):
                    clean = clean[7:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                parsed = json.loads(clean.strip())
                parsed["source"] = "NVIDIA Nemotron / Groq Maternal Nutrition Engine"
                parsed["hemoglobin_level"] = hb_float
                parsed["anemia_stage_en"] = stage_en
                parsed["anemia_stage_hi"] = stage_hi
                parsed["status_color"] = status_color
                return parsed
            except Exception:
                pass

        # Deterministic Gold-Standard Indian Postpartum Anemia Recovery Diet Plan
        return {
            "source": "MoHFW Anemia Mukt Bharat & Ayush Sutika Paricharya Protocol",
            "diet_title": "मातृ एनीमिया व प्रसवोपरांत रिकवरी आहार चार्ट (Postpartum Anemia Recovery Diet Chart)",
            "hemoglobin_level": hb_float,
            "anemia_stage_en": stage_en,
            "anemia_stage_hi": stage_hi,
            "status_color": status_color,
            "daily_targets": {
                "calories": "2,400 – 2,500 kcal/दिन (स्तनपान व गर्भाशय रिकवरी हेतु)",
                "iron": iron_target,
                "hydration": "3.5 – 4.0 लीटर (गुनगुना जीरा-अजवाइन पानी, दाल का पानी, दूध)",
                "calcium": "1,200 mg/दिन",
                "protein": "70 – 75 ग्राम/दिन (मांसपेशियों व ऊतकों की मरम्मत हेतु)"
            },
            "meal_schedule": [
                {
                    "time": "06:30 AM",
                    "period": "प्रातःकाल (Dawn Awakening)",
                    "title": "गर्भाशय रिकवरी व आयरन टॉनिक (Uterine Involutive Tonic)",
                    "items": [
                        "1 गिलास गुनगुना जीरा-अजवाइन का पानी (गर्भाशय संकुचन व गैस निवारण हेतु)",
                        "5 भीगे हुए बादाम + 5 काली मुनक्का (आयरन व कॉपर का प्राकृतिक स्रोत)",
                        "1 छोटा मेथी या गोंद-गुड़ का पारंपरिक लड्डू (कमर दर्द व कमजोरी में अचूक)"
                    ],
                    "nutrients": "आयरन, एंटीऑक्सीडेंट व गर्भाशय संकुचन हर्ब्स"
                },
                {
                    "time": "08:30 AM",
                    "period": "नाश्ता (Breakfast)",
                    "title": "आयरन व प्रोटीन पावर ब्रेकफास्ट (Power Breakfast)",
                    "items": [
                        "रागी का दलिया (Ragi Porridge) या पालक-मेथी से भरी 2 मल्टीग्रेन रोटी",
                        "1 कटोरी ताजा दही या 1 उबला अंडा (प्रोटीन व विटामिन बी-12)",
                        "अंकुरित मूंग दाल का चीला पुदीने-धनिया की चटनी के साथ",
                        "आधा नींबू निचोड़ें या 1 आंवला खाएं (विटामिन सी से आयरन 3 गुना अवशोषित होता है)"
                    ],
                    "nutrients": "हीमोग्लोबिन संवर्धन, कैल्शियम व सुपाच्य प्रोटीन"
                },
                {
                    "time": "11:00 AM",
                    "period": "दोपहर पूर्व (Mid-Morning)",
                    "title": "हीमोग्लोबिन बूस्टर ड्रिंक (Hemoglobin Booster Drink)",
                    "items": [
                        "1 कटोरी ताजा चुकंदर (Beetroot) + गाजर + टमाटर का गुनगुना सूप",
                        "या 1 गिलास अनार का रस / मौसमी का रस",
                        "1 टुकड़ा जैविक देसी गुड़ (Gur) भुने हुए चने के साथ"
                    ],
                    "nutrients": "फॉलिक एसिड, विटामिन सी व प्लांट-बेस्ड आयरन"
                },
                {
                    "time": "01:30 PM",
                    "period": "दोपहर भोजन (Postpartum Lunch)",
                    "title": "संपूर्ण मातृत्व पौष्टिक थाली (Nutrient-Dense Lunch)",
                    "items": [
                        "1 बड़ा कटोरा लोहे की कड़ाही में बनी मसूर या अरहर की दाल (लहसुन-जीरा तड़का)",
                        "सहजन की पत्तियां (Moringa Leaves) या मेथी-पालक की हरी सब्जी",
                        "2 नरम फुलके (देसी गाय के घी से चुपड़े हुए) या उबले चावल",
                        "अनिवार्य नियम: भोजन पर आधा ताजा नींबू निचोड़ें (नॉन-हीम आयरन 300% सक्रिय होता है)"
                    ],
                    "nutrients": "उच्च अवशोषण आयरन, कॉम्प्लेक्स कार्ब्स व जिंक"
                },
                {
                    "time": "05:00 PM",
                    "period": "शाम का नाश्ता (Evening Fuel)",
                    "title": "हड्डी व स्तनपान शक्ति स्नैक (Lactation Fuel)",
                    "items": [
                        "भुने हुए मखाने + काले तिल (काले तिल में दूध से 6 गुना अधिक कैल्शियम व भरपूर आयरन)",
                        "भुने हुए चने व गुड़ की मुट्ठी",
                        "1 कप गुनगुना हल्दी वाला दूध (चुटकी भर सौंफ व काली मिर्च के साथ)"
                    ],
                    "nutrients": "कैल्शियम, मैग्नीशियम व प्रोलैक्टिन हार्मोन सपोर्ट"
                },
                {
                    "time": "08:00 PM",
                    "period": "रात्रि भोजन (Healing Dinner)",
                    "title": "हल्का व सुपाच्य हीलिंग डिनर (Digestible Dinner)",
                    "items": [
                        "गाय के शुद्ध घी से बनी गर्म मूंग दाल की खिचड़ी",
                        "उबली हुई लौकी या तोरी की हल्की सब्जी (पेट पर सुपाच्य)",
                        "पालक या सहजन का पतला गर्म सूप"
                    ],
                    "nutrients": "त्वरित ऊर्जा, आंतों की रिकवरी व निर्जलीकरण से बचाव"
                },
                {
                    "time": "09:30 PM",
                    "period": "सोते समय (Bedtime Protocol)",
                    "title": "स्तनपान वर्धक कप व IFA दवा नियम (Nighttime Routine)",
                    "items": [
                        "1 कप गुनगुना दूध जायफल या शतावरी चूर्ण के साथ (स्तनपान प्रवाह हेतु)",
                        "विशेष निर्देश: आयरन की लाल गोली (IFA Tablet) दूध पीने के कम से कम 1.5 घंटे बाद या पानी/नींबू पानी के साथ रात को लें।"
                    ],
                    "nutrients": "गहरी नींद, गर्भाशय रिकवरी व 100% आयरन एब्जॉर्प्शन"
                }
            ],
            "iron_absorption_rules": [
                "✓ स्वर्ण नियम 1 (विटामिन सी पेयरिंग): हर भोजन पर नींबू का रस या आंवला अवश्य लें — विटामिन सी पौधों वाले आयरन का अवशोषण 300% बढ़ा देता है।",
                "✓ स्वर्ण नियम 2 (लोहे की कड़ाही): सब्जी व दाल हमेशा लोहे की कड़ाही में पकाएं — इससे प्रतिदिन 2-4 mg अतिरिक्त जैविक आयरन स्वतः मिलता है।",
                "✗ सख्त निषेध 1 (चाय-कॉफी पर रोक): भोजन व आयरन गोली के 2 घंटे आगे-पीछे चाय, कॉफी या दूध बिल्कुल न पिएं (इनके टैनिन आयरन को 60% ब्लॉक कर देते हैं)।",
                "✗ सख्त निषेध 2: बासी, तला-भुना या बहुत मिर्च-मसालेदार भोजन न खाएं जिससे नवजात शिशु में पेट दर्द (Colic) की समस्या न हो।"
            ],
            "superfoods": [
                {"name": "सहजन (Moringa)", "role": "आयरन व कैल्शियम का पावरहाउस (पालक से 3x आयरन)", "icon": "🌿"},
                {"name": "काली मुनक्का (Munakka)", "role": "रक्त कोशिकाओं के निर्माण में तीव्र वृद्धि", "icon": "🍇"},
                {"name": "रागी (Finger Millet)", "role": "स्तनपान में दूध की गुणवत्ता व आयरन संतुलन", "icon": "🌾"},
                {"name": "देसी गुड़ (Organic Gur)", "role": "आयरन व पाचन शक्ति संवर्धन", "icon": "🍯"},
                {"name": "काले तिल (Black Sesame)", "role": "हड्डी सुदृढ़ता व प्रसवोपरांत मांसपेशियों की मरम्मत", "icon": "✨"},
                {"name": "अंकुरित मूंग (Sprouts)", "role": "आसानी से पचने वाला शुद्ध वनस्पति प्रोटीन", "icon": "🌱"}
            ],
            "clinical_advice_localized": (
                f"मरीज {pt_name}: हीमोग्लोबिन स्तर {hb_float:.1f} g/dL है। "
                f"इस डाइट चार्ट का अगले 40 दिनों तक कड़ाई से पालन करें। प्रतिदिन 1 लाल IFA गोली रात में लें और पर्याप्त पानी पिएं। "
                f"4 सप्ताह बाद प्राथमिक स्वास्थ्य केंद्र पर पुनः हीमोग्लोबिन जांच अवश्य कराएं।"
            )
        }

    def explain_pad_analysis(self, pad_output: Dict[str, Any]) -> Dict[str, Any]:
        """Explains pad lochia saturation and blood loss estimation."""
        sat_pct = pad_output.get("saturation_percentage", 0.0)
        ebl_ml = pad_output.get("estimated_blood_loss_ml", 0.0)
        severity = pad_output.get("bleeding_severity", "Routine")
        lochia = pad_output.get("lochia_type", "Lochia Rubra")

        system_prompt = (
            "You are an obstetric decision-support assistant explaining postpartum pad saturation to rural midwives. "
            "Output valid JSON with keys: 'visual_summary', 'bleeding_status_interpretation', 'next_steps', 'disclaimer'."
        )
        prompt = (
            f"Explain pad saturation analysis:\n"
            f"- Pad Saturation Surface Area: {sat_pct}%\n"
            f"- Estimated Blood Loss: ~{ebl_ml} mL\n"
            f"- Severity Tier: {severity}\n"
            f"- Lochia Character: {lochia}\n"
            f"Explain this result simply and clinically."
        )

        llm_response = self._call_groq(prompt, system_prompt)
        if llm_response:
            try:
                parsed = json.loads(llm_response)
                parsed["source"] = "Groq / Nemotron Multimodal Clinical Layer"
                return parsed
            except Exception:
                pass

        # Deterministic fallback
        if sat_pct >= 55.0 or ebl_ml >= 500:
            status = "CRITICAL: Heavy postpartum lochia saturation indicative of active postpartum hemorrhage (PPH)."
            steps = [
                "Immediately perform bimanual uterine compression and vigorous fundal massage",
                "Administer secondary uterotonics (Misoprostol 800mcg sublingually / Methylergonovine 0.2mg IM if normotensive)",
                "Infuse Tranexamic Acid (TXA) 1g IV over 10 minutes",
                "Activate 108 Emergency Obstetric Transport / FRU referral team"
            ]
        elif sat_pct >= 20.0 or ebl_ml >= 150:
            status = "WATCH: Elevated sanguineous lochia saturation. Active vigilance required to prevent worsening."
            steps = [
                "Palpate uterine fundus to confirm firm uterine contraction",
                "Check for urinary retention (catheterize bladder if full to allow contraction)",
                "Inspect lower genital tract for un-repaired perineal or cervical lacerations",
                "Re-check pad in 15 minutes and log vitals"
            ]
        else:
            status = "ROUTINE: Normal physiological lochia within standard physiological postpartum boundaries."
            steps = [
                "Continue routine 15-minute postpartum monitoring",
                "Encourage maternal hydration and early skin-to-skin bonding"
            ]

        return {
            "visual_summary": f"Pad saturation measured at {sat_pct:.1f}% (~{ebl_ml:.0f} mL visual blood estimate).",
            "bleeding_status_interpretation": status,
            "next_steps": steps,
            "disclaimer": "2D pad image saturation cannot measure 3D volumetric absorption with gravimetric precision. Always verify with maternal pulse and blood pressure.",
            "source": "MOMENT Optical Lochia Clinical Engine"
        }

    def explain_shock_index(self, shock_output: Dict[str, Any]) -> Dict[str, Any]:
        """Explains hemodynamic Shock Index (HR / SBP) trajectory."""
        si = shock_output.get("shock_index", 0.75)
        hr = shock_output.get("heart_rate", 80)
        sbp = shock_output.get("systolic_bp", 120)
        tier = shock_output.get("tier", "Normal")

        if si >= 1.4:
            interpretation = (
                f"गंभीर स्थिति (Shock Index = {si:.2f}, HR: {hr}, SBP: {sbp}): "
                f"रक्तचाप में भारी गिरावट और तेज नाड़ी गंभीर हाइपोवोलेमिक शॉक का संकेत दे रही है। "
                f"हृदय गति सिस्टोलिक रक्तचाप से 40% से अधिक है। आपातकालीन ऑक्सीजन, आईवी ड्रिप और तुरंत रेफरल जरूरी है।"
            )
            urgency = "CRITICAL_EMERGENCY"
        elif si >= 0.90:
            interpretation = (
                f"सतर्कता आवश्यक (Shock Index = {si:.2f}, HR: {hr}, SBP: {sbp}): "
                f"सामान्य सीमा (0.90) पार हो चुकी है। शरीर रक्त की कमी की भरपाई करने के लिए हृदय गति बढ़ा रहा है। "
                f"अगले 5 मिनट में पुनः वाइटल मापें।"
            )
            urgency = "ELEVATED_WATCH"
        else:
            interpretation = (
                f"स्थिर स्थिति (Shock Index = {si:.2f}, HR: {hr}, SBP: {sbp}): "
                f"मातृ रक्तचाप और हृदय गति सामान्य और सुरक्षित सीमा में हैं।"
            )
            urgency = "STABLE"

        return {
            "shock_index": si,
            "tier": tier,
            "urgency": urgency,
            "clinical_interpretation": interpretation,
            "source": "Dryad Obstetric Cohort (El Ayadi / Miller PLoS One Thresholds)"
        }
