#!/usr/bin/env python3
"""
Test Suite for MOMENT FastAPI Backend (v2 — with Clinical Intelligence Engine).
Verifies all model loaders, inference pipelines, vitals shock index,
pad image triage, AND clinical analysis modules.
"""
import sys
import json
from pathlib import Path

# Add backend to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    print("\n--- Testing Health Check ---")
    response = client.get("/api/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "healthy"
    assert data["all_systems_ready"] is True
    print("✅ Health check passed!")


def test_predict_patient_routine():
    print("\n--- Testing Routine Patient (Low Risk) ---")
    payload = {
        "patient_id": "TEST-001",
        "name": "Test Primigravida",
        "age": 25,
        "gravidity": 1, "parity": 0,
        "prenatal_visits": 10, "prior_csections": 0,
        "gestational_age": 39.0,
        "multiple_births": 0, "macrosomia": 0,
        "placenta_previa": 0, "placental_abruption": 0,
        "hypertensive_disorders": 0, "gestational_diabetes": 0,
        "coagulation_disorders": 0,
        "maternal_hemoglobin_gdl": 12.0
    }
    response = client.post("/api/predict/patient", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"  Risk: {data['risk_percentage']} | Tier: {data['risk_tier']}")

    # Verify clinical analysis is present
    ca = data.get("clinical_analysis")
    assert ca is not None, "clinical_analysis should be present!"
    assert "anemia_assessment" in ca
    assert "emergency_protocol" in ca
    assert "preparedness_checklist" in ca
    assert "monitoring_schedule" in ca
    assert "blood_volume_analysis" in ca
    assert "risk_explanations" in ca
    assert "risk_interactions" in ca
    assert "clinical_context" in ca

    # Verify anemia assessment is correct (Hb 12.0 = Normal)
    assert ca["anemia_assessment"]["status"] == "NORMAL"
    print(f"  Anemia: {ca['anemia_assessment']['severity']} (Hb={ca['anemia_assessment']['hemoglobin']})")

    # Verify checklist generated
    checklist = ca["preparedness_checklist"]
    print(f"  Checklist: {checklist['total_items']} items ({checklist['critical_items']} critical)")

    # Verify monitoring schedule
    schedule = ca["monitoring_schedule"]
    print(f"  Monitoring intervals: {len(schedule['intervals'])} periods")
    print(f"  Escalation triggers: {len(schedule['escalation_triggers'])} criteria")

    print("✅ Routine patient clinical analysis passed!")


def test_predict_patient_escalated():
    print("\n--- Testing Critical Patient (Placenta Previa + Abruption + Coagulopathy) ---")
    payload = {
        "patient_id": "TEST-002",
        "name": "Critical Emergency Case",
        "age": 35,
        "gravidity": 4, "parity": 1,
        "prenatal_visits": 4, "prior_csections": 2,
        "gestational_age": 33.0,
        "multiple_births": 1, "macrosomia": 0,
        "placenta_previa": 1, "placental_abruption": 1,
        "hypertensive_disorders": 1, "gestational_diabetes": 1,
        "coagulation_disorders": 1,
        "maternal_hemoglobin_gdl": 6.5
    }
    response = client.post("/api/predict/patient", json=payload)
    assert response.status_code == 200
    data = response.json()
    print(f"  Risk: {data['risk_percentage']} | Tier: {data['risk_tier']}")

    ca = data["clinical_analysis"]

    # Risk Explanations
    risk_expl = ca["risk_explanations"]
    print(f"  Risk factors detected: {len(risk_expl)}")
    for rf in risk_expl[:3]:
        print(f"    {rf['icon']} {rf['name']} (OR={rf['odds_ratio']}, Severity={rf['severity']})")

    # Risk Interactions
    interactions = ca["risk_interactions"]
    print(f"  Dangerous interactions: {len(interactions)}")
    for inter in interactions:
        print(f"    {inter['icon']} {inter['combination']} [{inter['danger_level']}]")

    # Anemia (Hb 6.5 = Severe)
    anemia = ca["anemia_assessment"]
    assert anemia["status"] == "SEVERE_ANEMIA"
    print(f"  Anemia: {anemia['severity']} (OR={anemia['odds_ratio']})")

    # Blood Volume & Allowable Loss
    bv = ca["blood_volume_analysis"]
    abl = bv.get("allowable_blood_loss", {})
    if abl.get("max_allowable_loss_ml") is not None:
        print(f"  EBV: {bv['ebv_at_term_ml']} mL | Max Allowable Loss: {abl['max_allowable_loss_ml']} mL")

    # Emergency Protocol
    proto = ca["emergency_protocol"]
    print(f"  Emergency protocol steps: First-line={len(proto['first_line_treatment'])}, "
          f"Second-line={len(proto['second_line_treatment'])}, "
          f"Third-line={len(proto['third_line_mechanical_surgical'])}")

    # Preparedness Checklist
    checklist = ca["preparedness_checklist"]
    print(f"  Checklist: {checklist['total_items']} items ({checklist['critical_items']} critical)")
    categories = list(checklist["categories"].keys())
    print(f"  Checklist categories: {categories}")
    assert "⚠️ Patient-Specific Risk Alerts" in categories, "Should have patient-specific alerts!"

    # Monitoring Schedule (should be aggressive for ESCALATED)
    schedule = ca["monitoring_schedule"]
    first_interval = schedule["intervals"][0]
    print(f"  First monitoring period: {first_interval['period']} → {first_interval['frequency']}")
    assert "5 min" in first_interval["frequency"], "ESCALATED tier should monitor every 5 minutes!"

    print("✅ Critical patient clinical analysis passed!")


def test_shock_index():
    print("\n--- Testing Shock Index ---")
    normal_res = client.post("/api/vitals/shock-index", json={"heart_rate": 72, "systolic_bp": 120})
    assert normal_res.status_code == 200
    assert normal_res.json()["tier"] == "Normal"

    crit_res = client.post("/api/vitals/shock-index", json={"heart_rate": 130, "systolic_bp": 80})
    assert crit_res.status_code == 200
    assert crit_res.json()["is_decompensating"] is True
    print("✅ Shock Index tests passed!")


def test_vision_triage():
    print("\n--- Testing Vision Pad Triage with OpenCV Quantitative Metrics ---")
    for key in ["routine", "amber", "critical"]:
        res = client.post(f"/api/vision/sample/{key}")
        assert res.status_code == 200
        data = res.json()
        print(f"  [{key.upper()}] Tier: {data['predicted_class']} ({data['confidence_percentage']})")
        print(f"         OpenCV Saturation: {data['saturation_percentage']}% | EBL: {data['estimated_blood_loss_ml']} mL ({data['blood_loss_range']})")
        print(f"         Lochia Type: {data['lochia_type']} | Severity: {data['bleeding_severity']}")
        assert data["estimated_blood_loss_ml"] > 0
        assert "saturation_percentage" in data
        assert data["opencv_detection_success"] is True
        assert data["annotated_image_base64"] is not None
        assert data["annotated_image_base64"].startswith("data:image/jpeg;base64,")
    print("✅ Vision triage with OpenCV metrics passed!")


def test_clinical_standalone_endpoints():
    print("\n--- Testing Standalone Clinical Intelligence Endpoints ---")

    # 1. Anemia Assessment
    res = client.post("/api/clinical/anemia-assessment", json={"hemoglobin_gdl": 8.5})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "MODERATE_ANEMIA"
    print(f"  Anemia (Hb 8.5): {data['severity']} (OR={data['odds_ratio']})")

    res_severe = client.post("/api/clinical/anemia-assessment", json={"hemoglobin_gdl": 5.0})
    assert res_severe.status_code == 200
    assert res_severe.json()["status"] == "SEVERE_ANEMIA"
    print(f"  Anemia (Hb 5.0): {res_severe.json()['severity']}")

    res_none = client.post("/api/clinical/anemia-assessment", json={"hemoglobin_gdl": None})
    assert res_none.status_code == 200
    assert res_none.json()["status"] == "UNKNOWN"
    print(f"  Anemia (no Hb): {res_none.json()['severity']}")

    # 2. Blood Volume
    res_bv = client.post("/api/clinical/blood-volume", json={"weight_kg": 55, "hemoglobin_gdl": 9.0})
    assert res_bv.status_code == 200
    bv = res_bv.json()
    assert bv["ebv_at_term_ml"] == 5500
    print(f"  Blood Volume (55kg): EBV={bv['ebv_at_term_ml']} mL, MABL={bv['allowable_blood_loss']['max_allowable_loss_ml']} mL")

    # 3. Emergency Protocol
    res_proto = client.post("/api/clinical/emergency-protocol", json={
        "risk_tier": "ESCALATED", "has_coagulopathy": True, "has_hypertension": True
    })
    assert res_proto.status_code == 200
    proto = res_proto.json()
    # When hypertensive, ergometrine should NOT be first in second-line
    second_line_drugs = proto["second_line_treatment"][0]["detail"]
    assert any("Misoprostol" in d.get("drug", "") for d in second_line_drugs), \
        "Misoprostol should be recommended when hypertension present (ergometrine contraindicated)"
    print(f"  Emergency protocol: {len(proto['first_line_treatment'])} first-line steps")

    # 4. Preparedness Checklist
    res_cl = client.post("/api/clinical/preparedness-checklist", json={
        "risk_tier": "ESCALATED",
        "hemoglobin_gdl": 6.0,
        "has_placenta_previa": True,
        "has_abruption": True,
        "has_coagulopathy": True,
        "prior_csections": 3
    })
    assert res_cl.status_code == 200
    cl = res_cl.json()
    assert cl["total_items"] > 15, "ESCALATED checklist should have many items"
    assert "⚠️ Patient-Specific Risk Alerts" in cl["categories"]
    print(f"  Checklist: {cl['total_items']} items across {len(cl['categories'])} categories")

    # 5. Monitoring Schedule
    res_mon = client.get("/api/clinical/monitoring-schedule/ESCALATED")
    assert res_mon.status_code == 200
    mon = res_mon.json()
    assert "5 min" in mon["intervals"][0]["frequency"]
    print(f"  Monitoring: {len(mon['intervals'])} intervals, {len(mon['escalation_triggers'])} triggers")

    # 6. Risk Explanations
    res_risk = client.post("/api/clinical/risk-explanations", json={
        "placenta_previa": 1,
        "placental_abruption": 1,
        "coagulation_disorders": 1,
        "prior_csections": 2,
        "hypertensive_disorders": 1,
        "gestational_age": 33,
        "maternal_hemoglobin_gdl": 6.0,
        "gravidity": 5, "parity": 1
    })
    assert res_risk.status_code == 200
    risk = res_risk.json()
    assert risk["total_risk_factors_detected"] >= 5
    assert risk["total_interactions"] >= 2
    print(f"  Risk factors: {risk['total_risk_factors_detected']} detected, {risk['total_interactions']} interactions")
    print(f"  Assessment: {risk['overall_risk_assessment']}")

    # 7. Risk Encyclopedia
    res_enc = client.get("/api/clinical/risk-encyclopedia")
    assert res_enc.status_code == 200
    enc = res_enc.json()
    assert enc["total_risk_factors"] >= 8
    print(f"  Encyclopedia: {enc['total_risk_factors']} risk factors documented")

    print("✅ All standalone clinical endpoints passed!")


def test_samples_and_metrics():
    print("\n--- Testing Samples & Metrics ---")
    res_s = client.get("/api/patients/samples")
    assert res_s.status_code == 200
    assert len(res_s.json()) >= 3

    res_m = client.get("/api/metrics/summary")
    assert res_m.status_code == 200

    res_fi = client.get("/api/metrics/feature-importance")
    assert res_fi.status_code == 200
    assert len(res_fi.json()) == 18
    print("✅ Samples & Metrics passed!")


if __name__ == "__main__":
    print("=" * 65)
    print(" MOMENT BACKEND + CLINICAL INTELLIGENCE ENGINE — FULL TEST SUITE")
    print("=" * 65)
    test_health()
    test_predict_patient_routine()
    test_predict_patient_escalated()
    test_shock_index()
    test_vision_triage()
    test_clinical_standalone_endpoints()
    test_samples_and_metrics()
    print("\n" + "=" * 65)
    print(" 🎉 ALL TESTS PASSED — BACKEND + CLINICAL ENGINE FULLY VERIFIED!")
    print("=" * 65)
