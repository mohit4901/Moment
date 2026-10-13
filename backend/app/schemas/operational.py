"""
Pydantic Schemas for MOMENT Operational & Clinical Features.
Calibrated to:
 - WHO 2025 PPH Guidance & E-MOTIVE Trial Evidence
 - El Ayadi et al. Shock Index Thresholds (<0.9, >=0.9, >=1.4, >=1.7)
 - India NHM/RHS Facility Capability Specifications
 - 40/30/20/10 Routing Algorithm & 6-Component Facility Readiness Score
 - e-RaktKosh Blood Network Verification
 - 108/102 CAD Ambulance Coordination
 - 8-Stage Referral Closed-Loop State Machine with KPI Tracking
 - ABDM-Compliant Tokenized QR Maternal Emergency Passport
 - 5-Point PMSMA Birth Preparedness Score
 - 7-Day & 3-Day Emergency Stock Depletion Thresholds
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ─── 1. OFFLINE SYNC & APPEND-ONLY STORE-AND-FORWARD (Features 1, 17, 18) ───
class SyncEventRecord(BaseModel):
    event_id: str = Field(..., description="Unique client UUID for append-only audit trail")
    patient_id: str = Field(..., description="MOMENT patient ID")
    timestamp: str = Field(..., description="Client ISO datetime")
    device_id: str = Field(..., description="Frontline hardware device ID")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    event_type: str = Field(..., description="VITAL_UPDATE, BLOOD_LOSS_MEASURED, EMERGENCY_TRIGGER, REFERRAL_STEP")
    data: Dict[str, Any] = Field(..., description="Immutable event payload")
    sync_status: str = Field(default="PENDING", description="PENDING, UPLOADING, SYNCED")

class SyncBatchRequest(BaseModel):
    device_id: str
    facility_id: str = "HWC-HR-8841"
    records: List[SyncEventRecord] = Field(default_factory=list)
    last_sync_timestamp: Optional[str] = None

class SyncRecordStatus(BaseModel):
    event_id: str
    status: str = "SYNCED"
    server_timestamp: str

class SyncBatchResponse(BaseModel):
    device_id: str
    records_synced: int
    server_timestamp: str
    record_statuses: List[SyncRecordStatus]
    server_updates: List[Dict[str, Any]] = Field(default_factory=list)

class DeviceManifestRequest(BaseModel):
    device_id: str
    app_version: str = "2.4.0"
    last_manifest_hash: Optional[str] = None
    network_type: str = Field(default="2G", description="2G, 3G, 4G, offline")

class DeviceManifestResponse(BaseModel):
    device_id: str
    manifest_hash: str
    delta_payload_size_kb: float
    offline_protocols_version: str
    active_protocols: Dict[str, Any]


# ─── 2. LOCAL LANGUAGE VOICE ASSISTANT (Feature 2) ────────────────────────
class VoiceQueryRequest(BaseModel):
    transcription: str = Field(..., description="Spoken voice transcript in Hindi, Hinglish, or English")
    audio_language: str = Field(default="hi", description="hi, en, regional")
    patient_id: Optional[str] = "MOMENT-PT-2916"
    subcentre_id: Optional[str] = "HWC-HR-8841"

class VoiceActionResponse(BaseModel):
    intent: str
    confidence: float
    detected_entities: Dict[str, Any]
    action_taken: str
    audio_response_text_hi: str
    audio_response_text_en: str
    suggested_quick_buttons: List[str]
    executed_payload: Optional[Dict[str, Any]] = None
    clinical_disclaimer: str = "Voice assistant is for hands-free clinical data entry only — not independent diagnosis."


# ─── 3. CAPABILITY-BASED REFERRAL & FACILITY READINESS (Features 3, 7, 21) ──
class CapabilityRequirement(BaseModel):
    require_blood_bank: bool = True
    require_csection_ot: bool = True
    require_obstetrician: bool = True
    require_anaesthetist: bool = True
    require_24x7_fru: bool = True
    blood_group: Optional[str] = "O Positive"

class FacilityCapability(BaseModel):
    facility_id: str
    name: str
    name_hi: str
    facility_type: str  # FRU, District Hospital, Medical College, CHC, 24x7 PHC
    distance_km: float
    road_eta_mins: int
    is_24x7: bool
    is_fru: bool
    has_blood_bank: bool
    has_blood_storage: bool
    has_csection_ot: bool
    has_obstetrician_on_duty: bool
    has_anaesthetist_on_duty: bool
    has_icu_ventilator: bool
    has_ambulance_standby: bool
    o_negative_units: int
    prbc_units_available: int
    emergency_contact: str
    routing_score: float = Field(..., description="Score based on 40% Capability, 30% ETA, 20% Blood, 10% Distance")
    facility_readiness_score: float = Field(..., description="Score out of 100 based on Blood 20, OT 20, OB 20, Anaesth 15, Drugs 15, Transport 10")
    score_breakdown: Dict[str, float]

class ReferralSearchRequest(BaseModel):
    patient_id: str
    current_facility_id: str = "HWC-HR-8841"
    risk_tier: str = "ESCALATED"
    shock_index: float = 1.05
    estimated_blood_loss_ml: int = 350
    blood_group: str = "O Positive"
    requirements: Optional[CapabilityRequirement] = None


# ─── 4. BLOOD AVAILABILITY NETWORK (e-RaktKosh Integration) (Feature 4) ───
class BloodStockQuery(BaseModel):
    blood_group: str = "O Positive"
    max_distance_km: float = 50.0
    units_needed: int = 2

class BloodBankRecord(BaseModel):
    bank_id: str
    facility_name: str
    distance_km: float
    blood_group: str
    units_available: int
    o_negative_emergency_units: int
    contact_phone: str
    is_e_raktkosh_verified: bool
    last_updated_mins_ago: int
    human_verification_required: bool = True
    availability_disclaimer: str = "e-RaktKosh data reflects latest reports. Please call to verify units before transfer."

class BloodReservationRequest(BaseModel):
    patient_id: str
    blood_bank_id: str
    blood_group: str
    units_requested: int = 2
    urgency: str = "EMERGENCY_OBSTETRIC"

class BloodReservationResponse(BaseModel):
    reservation_id: str
    status: str
    blood_bank_name: str
    units_reserved: int
    pickup_token: str
    expiry_mins: int = 120
    verification_phone: str


# ─── 5. ONE-TAP PPH EMERGENCY MODE (Feature 4 & 5) ─────────────────────────
class OneTapEmergencyRequest(BaseModel):
    patient_id: str = "MOMENT-PT-2916"
    subcentre_id: str = "HWC-HR-8841"
    anm_name: str = "Priya Sharma (ANM)"
    current_blood_loss_ml: int = 300
    current_pulse: int = 118
    current_sbp: int = 90
    current_dbp: int = 60
    trigger_108: bool = True
    notify_receiving_hospital: bool = True
    notify_family: bool = True

class OneTapEmergencyResponse(BaseModel):
    emergency_session_id: str
    activation_timestamp: str
    patient_id: str
    blood_loss_ml: int
    pulse: int
    sbp: int
    dbp: int
    shock_index: float
    shock_index_trigger: str  # Normal, Referral, Urgent, Critical
    who_alert_tier: str  # EARLY_PPH_TRIGGER (300mL + abnormal vital) or STANDARD_PPH_TRIGGER (>=500mL)
    emergency_timer_started: bool
    elapsed_seconds: int = 0
    immediate_actions: List[str]
    ambulance_status: Dict[str, Any]
    hospital_pre_alert: Dict[str, Any]
    family_notification_status: str


# ─── 6 & 7. MULTI-MODE OBJECTIVE BLOOD LOSS DETECTION (Features 1, 6, 7) ──
class CalibratedDrapeInput(BaseModel):
    drape_type: str = "Brashear_V_Drape"
    drape_liquid_level_ml: float
    spill_estimate_ml: float = 0.0

class GravimetricWeighInput(BaseModel):
    saturated_pads_weight_grams: float
    dry_pads_weight_grams: float
    specific_gravity: float = 1.06

class MultiModeBloodLossRequest(BaseModel):
    patient_id: str
    method: str = Field(..., description="camera_cv, calibrated_drape, manual_fallback")
    camera_image_suitable: bool = True
    drape_data: Optional[CalibratedDrapeInput] = None
    gravimetric_data: Optional[GravimetricWeighInput] = None
    manual_ml_estimate: Optional[int] = None
    current_pulse: int = 118
    current_sbp: int = 90

class MultiModeBloodLossResponse(BaseModel):
    method_used: str
    estimated_blood_loss_ml: int
    clinical_trigger_type: str  # EARLY_PPH_ALERT (>=300mL + vital) vs STANDARD_PPH (>=500mL) vs ROUTINE
    who_alert_color: str  # RED, AMBER, GREEN
    is_early_pph_action_required: bool
    atls_class: str
    directive: str
    camera_quality_warning: Optional[str] = None


# ─── 8. SMART 108/102 AMBULANCE COORDINATION (Feature 8, 9, 23) ────────────
class AmbulanceDispatchRequest(BaseModel):
    emergency_session_id: str
    patient_id: str
    pickup_location: str = "HWC Rural Sub-Centre Lakhan Majra"
    dropoff_facility_id: str = "FAC-FRU-01"
    priority: str = "108_ALS_EMERGENCY"

class AmbulanceStatusResponse(BaseModel):
    tracking_id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    service_type: str = "108_ALS_AMBULANCE"
    current_status: str
    eta_pickup_mins: int
    eta_hospital_mins: int
    live_lat: float
    live_lng: float
    gps_refresh_interval_seconds: int = Field(default=15, description="10-30s during active emergency, 2-5 min normal")
    battery_optimized: bool = True
    oxygen_onboard: bool = True
    trained_emt_present: bool = True

class PreArrivalAlertRequest(BaseModel):
    referral_id: str
    target_facility_id: str
    patient_id: str
    patient_name: str
    age: int
    weeks_gestation: float
    shock_index: float
    pulse: int
    sbp: int
    dbp: int
    estimated_blood_loss_ml: int
    blood_group: str
    active_iv_lines: int = 2
    interventions_started: List[str]
    road_eta_mins: int
    generation_latency_seconds: float = 4.2

class PreArrivalAlertResponse(BaseModel):
    status: str
    alert_id: str
    receiving_hospital: str
    triage_bay_reserved: str
    blood_bank_alerted: bool
    ot_notified: bool
    eta_countdown_mins: int
    generation_latency_seconds: float
    acknowledgement_target_seconds: int = 60


# ─── 11. REFERRAL CLOSED-LOOP 8-STAGE TRACKING (Feature 11 & 15) ──────────
class ReferralTrackingUpdate(BaseModel):
    case_id: str
    new_status: str  # 1. EMERGENCY_DETECTED, 2. REFERRAL_INITIATED, 3. FACILITY_ACCEPTED, 4. AMBULANCE_ASSIGNED, 5. PATIENT_PICKED_UP, 6. HOSPITAL_NOTIFIED, 7. PATIENT_ARRIVED, 8. HANDOVER_COMPLETED
    updated_by: str
    notes: Optional[str] = None
    vitals_in_transit: Optional[Dict[str, Any]] = None

class ReferralTimelineResponse(BaseModel):
    case_id: str
    patient_id: str
    patient_name: str
    source_facility: str
    destination_facility: str
    current_status: str
    stage_number: int  # 1 to 8
    total_stages: int = 8
    referral_completion_rate_percent: float = Field(default=87.5, description="KPI: (Completed Referrals / Total Escalations) * 100")
    elapsed_time_mins: int
    timeline_events: List[Dict[str, Any]]
    handover_summary: Optional[Dict[str, Any]] = None


# ─── 12. 15-MINUTE MONITORING TIMELINE ENGINE (Feature 3) ──────────────────
class Vitals15MinCheckpoint(BaseModel):
    minute_mark: int  # 0, 15, 30, 45, 60
    timestamp: str
    pulse: int
    sbp: int
    dbp: int
    shock_index: float
    shock_index_trigger: str  # Continue Monitoring (<0.9), Referral (>=0.9), Urgent (>=1.4), Critical (>=1.7)
    blood_loss_ml: int
    uterine_tone: str  # Firm, Soft, Boggy
    trend_pulse: str  # UP, DOWN, STABLE
    trend_shock_index: str  # WORSENING, IMPROVING, STABLE

class Monitoring15MinTimelineResponse(BaseModel):
    patient_id: str
    first_hour_complete: bool
    checkpoints: List[Vitals15MinCheckpoint]
    latest_shock_index: float
    clinical_recommendation: str


# ─── 14. ASHA FRONT-LINE INTERFACE (Feature 15) ───────────────────────────
class AshaProfileView(BaseModel):
    patient_id: str
    name: str
    age: int
    anc_visits_completed: int
    current_hb: float
    is_high_risk: bool
    risk_factors: List[str]
    expected_delivery_date: str
    planned_delivery_facility: str
    verified_transport_phone: str
    emergency_contact: str
    asha_action_notes_hi: str


# ─── 16. ANEMIA SHIELD (NFHS-5 52.2% Alignment) (Feature 16) ──────────────
class AnemiaAssessmentRequest(BaseModel):
    patient_id: str
    current_hb: float
    gestational_weeks: float
    trimester: int = 3
    weight_kg: float = 54.0

class AnemiaAssessmentResponse(BaseModel):
    patient_id: str
    hb_level: float
    who_severity: str
    color_code: str
    is_hrp_flagged: bool  # High Risk Pregnancy
    total_iron_deficit_mg: float
    national_prevalence_context: str = "NFHS-5 National Pregnant Women Anaemia: 52.2%"
    recommended_therapy: str
    dosage_regimen: str
    dietary_counseling_hi: str


# ─── 17. 5-POINT BIRTH PREPAREDNESS SCORE (Feature 17) ────────────────────
class BirthPreparedness5PointRequest(BaseModel):
    patient_id: str
    risk_assessed: bool = True
    hb_checked: bool = True
    blood_group_known: bool = True
    delivery_facility_selected: bool = True
    emergency_transport_identified: bool = True

class BirthPreparedness5PointResponse(BaseModel):
    patient_id: str
    score_out_of_5: int
    percentage: int  # (Completed / 5) * 100
    readiness_grade: str
    checklist_status: Dict[str, bool]
    planning_metric_notice: str = "This score is a MOMENT institutional delivery planning metric, not an algorithmic medical diagnosis."


# ─── 18. ABDM-COMPLIANT MATERNAL EMERGENCY PASSPORT (Feature 18) ──────────
class EmergencyPassportGenerateRequest(BaseModel):
    patient_id: str
    name: str
    age: int
    abha_id: Optional[str] = "91-4821-8841-2916"
    blood_group: str
    baseline_hb: float
    high_risk_flags: List[str]
    emergency_contact: str = "+919812001108"

class EmergencyPassportResponse(BaseModel):
    passport_id: str
    patient_id: str
    qr_secure_token: str = Field(..., description="Secure ABDM-aligned opaque token identifier ONLY — no raw medical data in QR")
    issued_at: str
    expiry_date: str
    abdm_integrated: bool = True
    instruction: str = "QR code contains authenticated server lookup token. Medical record accessed via consent-based gateway."

class PassportScanRequest(BaseModel):
    qr_secure_token: str

class PassportScanResponse(BaseModel):
    valid: bool
    patient_id: str
    name: str
    blood_group: str
    risk_level: str
    critical_alerts: List[str]


# ─── 19. TELE-OBSTETRICIAN (eSanjeevani Structured Packet) (Feature 19) ────
class TeleConsultRequest(BaseModel):
    patient_id: str
    anm_name: str
    subcentre_id: str
    primary_concern: str
    current_vitals: Dict[str, Any]
    suspected_etiology: str = "Uterine Atony"

class TeleConsultResponse(BaseModel):
    consultation_id: str
    specialist_name: str
    hub_facility: str
    esanjeevani_sbar_packet: Dict[str, Any]
    tele_room_url: str
    estimated_wait_time_secs: int = 45
    regulatory_notice: str = "Per Indian Telemedicine Practice Guidelines, the Registered Medical Practitioner retains final clinical judgment."


# ─── 20. EMERGENCY STOCK MONITORING (7 & 3 Days Thresholds) (Feature 20) ──
class StockInventoryResponse(BaseModel):
    facility_id: str
    last_audited: str
    total_tracked_commodities: int
    critical_stockouts_count: int  # < 3 days remaining
    warning_stockouts_count: int   # < 7 days remaining
    commodities: List[Dict[str, Any]]
    stockout_risk: str


# ─── 21. RURAL PPH COMMAND DASHBOARD (Feature 21 & 25) ─────────────────────
class DistrictCommandOverview(BaseModel):
    district_name: str = "Rohtak Rural Health Zone"
    last_updated: str
    national_rural_context: Dict[str, Any] = {
        "rural_subcentres_india": "1,67,275",
        "rural_phcs_india": "26,636",
        "chcs_india": "6,155",
        "frus_reported": "3,108",
        "ambulance_coverage": "108/102 across 35 States/UTs"
    }
    active_deliveries_today: int
    active_pph_emergencies: int
    ambulances_in_transit: int
    blood_bank_reserves_o_neg: int
    facilities_readiness_avg: float
    facilities_status: List[Dict[str, Any]]
    recent_referral_cases: List[Dict[str, Any]]
    referral_completion_rate_percent: float = 87.5
