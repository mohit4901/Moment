"""
FastAPI Router for MOMENT Operational & Clinical Healthcare Engines.
Calibrated to:
 - WHO 2025 PPH Guidance & E-MOTIVE Trial Evidence
 - El Ayadi et al. Shock Index Thresholds (<0.9, >=0.9, >=1.4, >=1.7)
 - India NHM/RHS Facility Capabilities & 40/30/20/10 Routing Algorithm
 - e-RaktKosh Blood Bank Verification
 - 108/102 CAD Ambulance Coordination
 - 8-Stage Referral Closed-Loop State Machine with KPI
 - ABDM-Compliant QR Tokenized Passport
 - 5-Point PMSMA Birth Preparedness Score
 - 7-Day & 3-Day Emergency Stock Depletion Thresholds
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Path

from ..schemas.operational import (
    SyncBatchRequest, SyncBatchResponse, DeviceManifestRequest, DeviceManifestResponse,
    VoiceQueryRequest, VoiceActionResponse,
    ReferralSearchRequest, FacilityCapability, PreArrivalAlertRequest, PreArrivalAlertResponse,
    BloodStockQuery, BloodBankRecord, BloodReservationRequest, BloodReservationResponse,
    OneTapEmergencyRequest, OneTapEmergencyResponse,
    MultiModeBloodLossRequest, MultiModeBloodLossResponse,
    AmbulanceDispatchRequest, AmbulanceStatusResponse,
    ReferralTrackingUpdate, ReferralTimelineResponse,
    Monitoring15MinTimelineResponse,
    AshaProfileView,
    AnemiaAssessmentRequest, AnemiaAssessmentResponse,
    BirthPreparedness5PointRequest, BirthPreparedness5PointResponse,
    EmergencyPassportGenerateRequest, EmergencyPassportResponse, PassportScanRequest, PassportScanResponse,
    TeleConsultRequest, TeleConsultResponse,
    StockInventoryResponse,
    DistrictCommandOverview
)

from ..services.operational_services import (
    SyncEngine,
    VoiceAssistantEngine,
    ReferralCapabilityMatcher,
    BloodNetworkManager,
    OneTapEmergencyCoordinator,
    MultiModeBloodLossEngine,
    SmartAmbulanceCoordinator,
    Monitoring15MinEngine,
    AshaFrontlineService,
    TeleConsultManager,
    EmergencyPassportManager,
    AnemiaMonitor,
    BirthPreparednessEngine,
    StockInventoryManager,
    ClosedLoopTracker,
    DistrictCommandDashboardService
)

operational_router = APIRouter(tags=["Frontline & Operational Healthcare Engines"])


# ─── 1. OFFLINE-FIRST & STORE-AND-FORWARD (Features 1, 12, 13) ─────────────
@operational_router.post(
    "/sync/batch",
    response_model=SyncBatchResponse,
    summary="Feature 1 & 13 — Offline-First Batch Sync & Append-Only Store-and-Forward",
    description="Synchronizes offline append-only clinical event records created by ANMs in disconnected sub-centres."
)
async def sync_batch(req: SyncBatchRequest):
    return SyncEngine.get_instance().process_sync_batch(req)

@operational_router.post(
    "/sync/manifest",
    response_model=DeviceManifestResponse,
    summary="Feature 12 — Low-End Device Sync Manifest",
    description="Calculates lightweight delta sync hashes and protocols for 2G/3G rural smartphones."
)
async def get_device_manifest(req: DeviceManifestRequest):
    return SyncEngine.get_instance().get_device_manifest(req.device_id, req.network_type)

@operational_router.post(
    "/sync/store-and-forward",
    response_model=SyncBatchResponse,
    summary="Feature 13 — Store-and-Forward Ingestion",
    description="Append-only event store ingestion: PENDING -> UPLOADING -> SYNCED."
)
async def store_and_forward(req: SyncBatchRequest):
    return SyncEngine.get_instance().process_sync_batch(req)


# ─── 2. LOCAL LANGUAGE VOICE ASSISTANT (Feature 2 & 14) ────────────────────
@operational_router.post(
    "/voice/interpret",
    response_model=VoiceActionResponse,
    summary="Feature 2 & 14 — Local Language Voice Assistant",
    description="Interprets Hindi/English speech into structured vitals data entry and action triggers. Data entry only, no diagnosis."
)
async def interpret_voice(req: VoiceQueryRequest):
    return VoiceAssistantEngine.get_instance().interpret_voice(req)


# ─── 3. CAPABILITY-BASED REFERRAL & PRE-ARRIVAL (Features 7, 10, 21, 22) ───
@operational_router.post(
    "/referral/find-capable",
    response_model=List[FacilityCapability],
    summary="Feature 7 & 21 — Capability-Based Referral Routing (40/30/20/10)",
    description="Scores facilities: 40% Capability + 30% ETA + 20% Blood + 10% Distance. Computes Rural Facility Readiness Score (0-100)."
)
async def find_capable_facilities(req: ReferralSearchRequest):
    return ReferralCapabilityMatcher.get_instance().find_capable_facilities(req)

@operational_router.post(
    "/referral/pre-arrival",
    response_model=PreArrivalAlertResponse,
    summary="Feature 10 — Pre-Arrival Hospital Triage Alert",
    description="Pushes SBAR vitals, shock index, blood loss, and ETA to receiving facility with target <10s generation and <60s ack."
)
async def send_pre_arrival_alert(req: PreArrivalAlertRequest):
    return ReferralCapabilityMatcher.get_instance().send_pre_arrival_alert(req)

@operational_router.post(
    "/referral/track",
    response_model=ReferralTimelineResponse,
    summary="Feature 11 — Referral Closed-Loop Lifecycle Update",
    description="Updates referral state across the 8 standard stages from Emergency Detected to Handover Completed."
)
async def update_referral_tracking(req: ReferralTrackingUpdate):
    return ClosedLoopTracker.get_instance().update_case(req)

@operational_router.get(
    "/referral/track/{case_id}",
    response_model=ReferralTimelineResponse,
    summary="Feature 11 — Get Referral Closed-Loop Timeline & KPI",
    description="Fetches full 8-stage timeline and referral completion rate KPI = (Completed Referrals / Total Escalations) * 100."
)
async def get_referral_timeline(case_id: str = Path(..., description="Unique referral case ID")):
    return ClosedLoopTracker.get_instance().get_timeline(case_id)


# ─── 4. BLOOD AVAILABILITY NETWORK (Feature 4 & 8) ────────────────────────
@operational_router.post(
    "/blood-bank/nearby",
    response_model=List[BloodBankRecord],
    summary="Feature 8 — e-RaktKosh Real-time Blood Availability",
    description="Queries district blood banks for compatible PRBC and emergency O-negative units with verification warning."
)
async def query_blood_banks(req: BloodStockQuery):
    return BloodNetworkManager.get_instance().query_nearby_blood(req)

@operational_router.post(
    "/blood-bank/reserve",
    response_model=BloodReservationResponse,
    summary="Feature 8 — Emergency Blood Units Reservation",
    description="Reserves blood units at receiving hospital for an en-route bleeding mother."
)
async def reserve_blood_units(req: BloodReservationRequest):
    return BloodNetworkManager.get_instance().reserve_blood_units(req)


# ─── 5. ONE-TAP PPH EMERGENCY MODE (Features 4 & 5) ────────────────────────
@operational_router.post(
    "/emergency/one-tap-activate",
    response_model=OneTapEmergencyResponse,
    summary="Feature 4 & 5 — One-Tap PPH Emergency Mode",
    description="Maximum 1-tap activation: computes Shock Index (El Ayadi triggers), initiates WHO bundle, dispatches 108, alerts hospital, and starts timer."
)
async def activate_one_tap_emergency(req: OneTapEmergencyRequest):
    return OneTapEmergencyCoordinator.get_instance().activate_emergency(req)


# ─── 6 & 7. MULTI-MODE OBJECTIVE BLOOD LOSS DETECTION (Features 1 & 6) ─────
@operational_router.post(
    "/vision/blood-loss-multi",
    response_model=MultiModeBloodLossResponse,
    summary="Feature 1 & 6 — Multi-Mode Blood Loss Detection (CV + Drape + Manual)",
    description="Calibrated Drape, Camera CV, and Manual fallback. Triggers Early PPH on 300mL + abnormal vital or >=500mL."
)
async def calculate_multi_mode_blood_loss(req: MultiModeBloodLossRequest):
    return MultiModeBloodLossEngine.get_instance().calculate_blood_loss(req)


# ─── 8. SMART 108/102 AMBULANCE COORDINATION (Features 8, 9, 23) ────────────
@operational_router.post(
    "/ambulance/dispatch",
    response_model=AmbulanceStatusResponse,
    summary="Feature 9 — Smart 108/102 Ambulance Coordination",
    description="Assigns 108 ALS vehicle with CAD tracking, battery optimization, and 10-30s emergency GPS refresh rate."
)
async def dispatch_ambulance(req: AmbulanceDispatchRequest):
    return SmartAmbulanceCoordinator.get_instance().dispatch_ambulance(req)

@operational_router.get(
    "/ambulance/status/{tracking_id}",
    response_model=AmbulanceStatusResponse,
    summary="Feature 9 — Live Ambulance GPS & Telemetry Tracking",
    description="Real-time ETA, vehicle speed, oxygen onboard, and EMT presence."
)
async def get_ambulance_status(tracking_id: str = Path(..., description="108 CAD Tracking ID")):
    return SmartAmbulanceCoordinator.get_instance().get_status(tracking_id)


# ─── 12. 15-MINUTE MONITORING TIMELINE ENGINE (Feature 3) ──────────────────
@operational_router.get(
    "/monitoring/15-min-timeline/{patient_id}",
    response_model=Monitoring15MinTimelineResponse,
    summary="Feature 3 — 15-Minute Monitoring Timeline Engine",
    description="Tracks vitals + blood loss + uterine tone at 00, 15, 30, 45, 60 minutes with trend arrows."
)
async def get_monitoring_15min_timeline(patient_id: str = Path(..., description="Patient ID")):
    return Monitoring15MinEngine.get_instance().get_patient_timeline(patient_id)


# ─── 14. ASHA FRONT-LINE INTERFACE (Feature 15) ───────────────────────────
@operational_router.get(
    "/asha/profile/{patient_id}",
    response_model=AshaProfileView,
    summary="Feature 15 — ASHA Frontline 8-Point Profile Interface",
    description="PMSMA-aligned high-risk pregnancy summary: Pregnancy, ANC, Hb, Risk factors, EDD, Facility, Transport, Contact."
)
async def get_asha_profile(patient_id: str = Path(..., description="Patient ID")):
    return AshaFrontlineService.get_instance().get_asha_profile(patient_id)


# ─── 16. ANEMIA SHIELD (Feature 16) ───────────────────────────────────────
@operational_router.post(
    "/anemia/assess",
    response_model=AnemiaAssessmentResponse,
    summary="Feature 16 — Maternal Anemia Shield (NFHS-5 52.2% Alignment)",
    description="Tracks Hb, WHO severity, HRP flag, and Ganzoni formula total iron deficit calculation."
)
async def assess_anemia(req: AnemiaAssessmentRequest):
    return AnemiaMonitor.get_instance().assess_anemia(req)


# ─── 17. 5-POINT BIRTH PREPAREDNESS SCORE (Feature 17) ────────────────────
@operational_router.post(
    "/preparedness/5-point",
    response_model=BirthPreparedness5PointResponse,
    summary="Feature 17 — 5-Point PMSMA Birth Preparedness Score",
    description="Evaluates 5 components: Risk assessed, Hb checked, Blood group known, Delivery facility selected, Transport identified."
)
async def calculate_birth_preparedness_5point(req: BirthPreparedness5PointRequest):
    return BirthPreparednessEngine.get_instance().calculate_score(req)


# ─── 18. ABDM-COMPLIANT MATERNAL EMERGENCY PASSPORT (Feature 18) ──────────
@operational_router.post(
    "/passport/generate",
    response_model=EmergencyPassportResponse,
    summary="Feature 18 — ABDM-Compliant Maternal Emergency Passport QR",
    description="Generates QR containing secure authenticated server lookup token ONLY — no raw medical data in QR."
)
async def generate_maternal_passport(req: EmergencyPassportGenerateRequest):
    return EmergencyPassportManager.get_instance().generate_passport(req)

@operational_router.post(
    "/passport/scan",
    response_model=PassportScanResponse,
    summary="Feature 18 — Authenticate Maternal Emergency Passport QR Token",
    description="Decodes secure ABDM token into authenticated patient record upon hospital admission."
)
async def scan_maternal_passport(req: PassportScanRequest):
    return EmergencyPassportManager.get_instance().scan_passport(req.qr_secure_token)


# ─── 19. TELE-OBSTETRICIAN (eSanjeevani Structured Packet) (Feature 19) ────
@operational_router.post(
    "/tele-consult/request",
    response_model=TeleConsultResponse,
    summary="Feature 19 — Tele-Obstetrician eSanjeevani Structured Referral Packet",
    description="Packages SBAR case summary and initiates provider-to-provider consultation with on-call specialist."
)
async def request_tele_consult(req: TeleConsultRequest):
    return TeleConsultManager.get_instance().request_tele_consult(req)


# ─── 20. EMERGENCY STOCK MONITORING (Feature 20) ──────────────────────────
@operational_router.get(
    "/stock/inventory",
    response_model=StockInventoryResponse,
    summary="Feature 20 — Emergency Stock Monitoring (<7 Days Warning, <3 Days Critical)",
    description="Tracks days remaining for PPH drapes, Oxytocin, TXA, IV fluids, IV sets, BP cuffs, and pulse oximeters."
)
async def get_emergency_stock(facility_id: str = Query("HWC-HR-8841", description="Health Sub-Centre ID")):
    return StockInventoryManager.get_instance().get_inventory(facility_id)


# ─── 21. RURAL PPH COMMAND DASHBOARD (Feature 21 & 25) ─────────────────────
@operational_router.get(
    "/command/district-overview",
    response_model=DistrictCommandOverview,
    summary="Feature 21 & 25 — Rural PPH District Command Dashboard",
    description="Aggregates district maternal health KPIs, 8-stage referral completion rate, and facility readiness scores."
)
async def get_district_command_overview():
    return DistrictCommandDashboardService.get_instance().get_district_overview()
