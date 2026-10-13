"""
MOMENT Production Database Engine (SQLite / WAL Mode)
====================================================
Provides thread-safe connection pooling, schema migrations, and relational persistence
for all 20 MOMENT clinical entities:
1. Users
2. Roles
3. Patients
4. Pregnancies
5. VitalObservations
6. BloodLossMeasurements
7. RiskAssessments
8. ClinicalReports
9. Facilities
10. FacilityCapabilities
11. BloodInventory
12. EmergencyEvents
13. Referrals
14. Ambulances
15. Notifications
16. AuditLogs
17. ClinicalConfigs
18. Devices
19. SyncEvents
20. EmergencyChecklists
"""
import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_DIR = Path(__file__).resolve().parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "moment.db"


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


@contextmanager
def get_db():
    """Provides a thread-safe transactional database connection."""
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")  # High-concurrency Write-Ahead Logging
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return True
    if plain_password == hashed_password:
        return True
    return hash_password(plain_password) == hashed_password


def init_db():
    """Initializes all 20 clinical and operational tables with indexes and runs schema migrations."""
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Users & 2. Roles
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL DEFAULT '',
            full_name TEXT NOT NULL,
            role TEXT NOT NULL, -- 'ANM', 'GNM', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'DISTRICT_ADMIN', 'AMBULANCE_OPERATOR'
            age INTEGER DEFAULT 30,
            registration_no TEXT DEFAULT '',
            facility_id TEXT,
            facility_name TEXT DEFAULT '',
            rural_area TEXT DEFAULT '',
            phone TEXT,
            id_card_url TEXT DEFAULT '',
            id_card_verified INTEGER DEFAULT 0,
            ocr_match_details TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        """)

        # 3. Patients
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY, -- e.g. MOMENT-PT-2916
            abha_id TEXT,
            name TEXT NOT NULL,
            hindi_name TEXT,
            age INTEGER NOT NULL,
            blood_group TEXT NOT NULL, -- e.g. 'O+', 'B+', 'AB-'
            contact_phone TEXT,
            emergency_contact_phone TEXT,
            primary_facility_id TEXT,
            registered_by_user_id TEXT,
            registered_by_name TEXT,
            is_seed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Run automatic migrations for existing databases
        cursor.execute("PRAGMA table_info(users);")
        user_cols = {c["name"] for c in cursor.fetchall()}
        if "password_hash" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT DEFAULT '';")
        if "age" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN age INTEGER DEFAULT 30;")
        if "registration_no" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN registration_no TEXT DEFAULT '';")
        if "facility_name" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN facility_name TEXT DEFAULT '';")
        if "rural_area" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN rural_area TEXT DEFAULT '';")
        if "id_card_url" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN id_card_url TEXT DEFAULT '';")
        if "id_card_verified" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN id_card_verified INTEGER DEFAULT 0;")
        if "ocr_match_details" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN ocr_match_details TEXT DEFAULT '';")

        cursor.execute("PRAGMA table_info(patients);")
        patient_cols = {c["name"] for c in cursor.fetchall()}
        if "registered_by_user_id" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN registered_by_user_id TEXT DEFAULT 'USR-ANM';")
        if "registered_by_name" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN registered_by_name TEXT DEFAULT 'Suman Devi (ANM)';")
        if "assigned_doctor_id" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN assigned_doctor_id TEXT DEFAULT 'USR-DR';")
        if "assigned_doctor_name" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN assigned_doctor_name TEXT DEFAULT 'Dr. Sunita Malik, MD (OBGYN)';")
        if "admission_date" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN admission_date TEXT DEFAULT '';")
        if "status" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN status TEXT DEFAULT 'ACTIVE';")
        if "abha_address" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN abha_address TEXT DEFAULT '';")
        if "abha_status" not in patient_cols:
            cursor.execute("ALTER TABLE patients ADD COLUMN abha_status TEXT DEFAULT 'UNLINKED';")

        # 4. Pregnancies
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pregnancies (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            gravidity INTEGER NOT NULL,
            parity INTEGER NOT NULL,
            gestational_age REAL NOT NULL, -- in weeks
            prior_csections INTEGER DEFAULT 0,
            multiple_births INTEGER DEFAULT 0,
            macrosomia INTEGER DEFAULT 0,
            placenta_previa INTEGER DEFAULT 0,
            placental_abruption INTEGER DEFAULT 0,
            hypertensive_disorders INTEGER DEFAULT 0,
            gestational_diabetes INTEGER DEFAULT 0,
            coagulation_disorders INTEGER DEFAULT 0,
            maternal_hemoglobin_gdl REAL,
            current_risk_tier TEXT DEFAULT 'ROUTINE', -- 'ROUTINE', 'ENHANCED', 'ESCALATED'
            current_risk_percent REAL DEFAULT 5.0,
            status TEXT DEFAULT 'IN_LABOR', -- 'ANTEPARTUM', 'IN_LABOR', 'POSTPARTUM', 'REFERRED', 'DISCHARGED'
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 5. Vital Observations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS vital_observations (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            pregnancy_id TEXT REFERENCES pregnancies(id),
            time_checkpoint TEXT NOT NULL, -- '00 min', '15 min', '30 min', etc.
            heart_rate INTEGER NOT NULL,
            systolic_bp INTEGER NOT NULL,
            diastolic_bp INTEGER NOT NULL,
            shock_index REAL NOT NULL,
            shock_tier TEXT NOT NULL, -- 'NORMAL', 'ALERT', 'URGENT', 'CRITICAL'
            uterine_tone TEXT DEFAULT 'Firm', -- 'Firm', 'Soft', 'Boggy', 'Contracting'
            recorded_by TEXT,
            recorded_at TEXT NOT NULL
        );
        """)

        # 6. Blood Loss Measurements
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS blood_loss_measurements (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            pregnancy_id TEXT REFERENCES pregnancies(id),
            volume_ml REAL NOT NULL,
            measurement_mode TEXT NOT NULL, -- 'CAMERA_RESNET', 'CALIBRATED_DRAPE', 'GRAVIMETRIC_WEIGHT', 'MANUAL_CLINICAL'
            confidence REAL DEFAULT 1.0,
            severity_tier TEXT NOT NULL, -- 'ROUTINE', 'WATCH', 'PPH_CRITICAL'
            image_url TEXT,
            recorded_by TEXT,
            recorded_at TEXT NOT NULL
        );
        """)

        # 7. Risk Assessments (ML Predictions)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            pregnancy_id TEXT REFERENCES pregnancies(id),
            model_version TEXT NOT NULL,
            probability REAL NOT NULL,
            risk_tier TEXT NOT NULL, -- 'ROUTINE', 'ENHANCED', 'ESCALATED'
            top_factors_json TEXT, -- JSON array of contributing factors
            recommendations_json TEXT,
            calculated_at TEXT NOT NULL
        );
        """)

        # 8. Clinical Reports (OCR Scanned)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clinical_reports (
            id TEXT PRIMARY KEY,
            patient_id TEXT REFERENCES patients(id),
            report_type TEXT DEFAULT 'ANC_CARD', -- 'ANC_CARD', 'LAB_RESULT', 'ADMISSION_SLIP'
            image_url TEXT,
            raw_ocr_text TEXT,
            extracted_fields_json TEXT NOT NULL,
            confirmed_by TEXT,
            is_confirmed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)

        # 9. Facilities & 10. Capabilities
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS facilities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            hindi_name TEXT,
            facility_type TEXT NOT NULL, -- 'SUB_CENTRE', 'PHC', 'CHC', 'FRU', 'DISTRICT_HOSPITAL', 'TERTIARY_INSTITUTE'
            address TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            phone TEXT,
            has_24x7_emergency INTEGER DEFAULT 1,
            c_section_capable INTEGER DEFAULT 0,
            operating_rooms INTEGER DEFAULT 0,
            total_beds INTEGER DEFAULT 10,
            blood_bank_verified INTEGER DEFAULT 0,
            is_seed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """)

        # 11. Blood Inventory
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS blood_inventory (
            id TEXT PRIMARY KEY,
            facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
            blood_group TEXT NOT NULL, -- 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'
            units_available INTEGER NOT NULL,
            verification_status TEXT DEFAULT 'UNVERIFIED', -- 'VERIFIED_API', 'HOSPITAL_REPORTED', 'UNVERIFIED'
            source TEXT DEFAULT 'e-RaktKosh',
            last_verified_at TEXT NOT NULL
        );
        """)

        # 12. Emergency Events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_events (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            trigger_rule TEXT NOT NULL, -- 'WHO_300ML_VITAL', 'WHO_500ML_PPH', 'SHOCK_INDEX_1.4', 'MANUAL_108_TAP'
            severity TEXT NOT NULL, -- 'WATCH', 'HIGH', 'CRITICAL'
            blood_loss_ml REAL NOT NULL,
            shock_index REAL NOT NULL,
            elapsed_seconds INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            initiated_by TEXT,
            initiated_at TEXT NOT NULL,
            resolved_at TEXT
        );
        """)

        # 12b. Central Clinical Alerts & Deduplicated Escalation
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            mother_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL, -- 'SHOCK_INDEX_CRITICAL', 'BLOOD_LOSS_PPH', 'HIGH_RISK_PREDICTION', 'MANUAL_ESCALATION'
            severity TEXT NOT NULL, -- 'INFO', 'WARNING', 'HIGH', 'CRITICAL'
            trigger_rule TEXT NOT NULL,
            details_json TEXT,
            recipients_json TEXT,
            delivery_status TEXT DEFAULT 'PENDING',
            twilio_sid TEXT,
            is_acknowledged INTEGER DEFAULT 0,
            acknowledged_by TEXT,
            acknowledged_at TEXT,
            is_resolved INTEGER DEFAULT 0,
            resolved_by TEXT,
            resolved_at TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # 13. Referrals & SBAR
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            emergency_event_id TEXT REFERENCES emergency_events(id),
            patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            from_facility_id TEXT NOT NULL REFERENCES facilities(id),
            to_facility_id TEXT NOT NULL REFERENCES facilities(id),
            stage INTEGER DEFAULT 1, -- 1 to 8: Detected, Initiated, Accepted, Ambulance Assigned, Picked Up, Pre-Alert Sent, Arrived, Handover Completed
            stage_name TEXT DEFAULT 'INITIATED',
            sbar_situation TEXT,
            sbar_background TEXT,
            sbar_assessment TEXT,
            sbar_recommendation TEXT,
            eta_minutes INTEGER,
            distance_km REAL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 14. Ambulances
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ambulances (
            id TEXT PRIMARY KEY,
            registration_number TEXT NOT NULL, -- e.g. HR-12-G-1081
            cad_reference_id TEXT NOT NULL,
            service_type TEXT DEFAULT '108_ALS', -- '108_ALS', '108_BLS', '102_MATERNAL'
            driver_name TEXT,
            driver_phone TEXT,
            current_lat REAL,
            current_lng REAL,
            status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'DISPATCHED', 'EN_ROUTE_PICKUP', 'PATIENT_ONBOARD', 'ARRIVED_HOSPITAL'
            assigned_referral_id TEXT REFERENCES referrals(id),
            last_gps_ping TEXT NOT NULL
        );
        """)

        # 15. Notifications (SMS Logs)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            referral_id TEXT REFERENCES referrals(id),
            recipient_phone TEXT NOT NULL,
            recipient_name TEXT,
            channel TEXT DEFAULT 'SMS', -- 'SMS', 'WHATSAPP', 'CAD_DISPATCH'
            message_body TEXT NOT NULL,
            provider TEXT DEFAULT 'TWILIO',
            provider_sid TEXT,
            status TEXT DEFAULT 'PENDING', -- 'SENT', 'DELIVERED', 'FAILED', 'NOT_CONFIGURED_DEV'
            sent_at TEXT NOT NULL
        );
        """)

        # 16. Audit Logs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL, -- 'VIEW_PATIENT', 'RECORD_VITALS', 'DISPATCH_108', 'RUN_PREDICTION', 'SCAN_REPORT'
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            details_json TEXT,
            ip_address TEXT,
            timestamp TEXT NOT NULL
        );
        """)

        # 17. Clinical Configs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS clinical_configs (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            unit TEXT,
            clinical_source TEXT NOT NULL,
            last_reviewed TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        );
        """)

        # 18. Devices & 19. Sync Events
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            device_id TEXT PRIMARY KEY,
            assigned_user_id TEXT,
            facility_id TEXT,
            app_version TEXT,
            last_sync_at TEXT NOT NULL
        );
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_events (
            event_id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            patient_id TEXT,
            table_name TEXT NOT NULL,
            action TEXT NOT NULL, -- 'INSERT', 'UPDATE'
            payload_json TEXT NOT NULL,
            sync_status TEXT DEFAULT 'SYNCED', -- 'PENDING', 'SYNCED'
            timestamp TEXT NOT NULL
        );
        """)

        # 20. Emergency Checklists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_checklists (
            id TEXT PRIMARY KEY,
            referral_id TEXT NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
            iv_lines_16g INTEGER DEFAULT 0,
            oxytocin_given INTEGER DEFAULT 0,
            txa_given INTEGER DEFAULT 0,
            uterine_massage INTEGER DEFAULT 0,
            blood_crossmatch_sent INTEGER DEFAULT 0,
            nasg_applied INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        """)

        # CREATE INDEXES FOR FAST RETRIEVAL
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vital_observations(patient_id, recorded_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_blood_loss_patient ON blood_loss_measurements(patient_id, recorded_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id, stage);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_facilities_coords ON facilities(latitude, longitude);")

        # ── Schema migrations: safe ADD COLUMN (idempotent) ──
        _safe_migrations = [
            ("vital_observations",    "clinical_notes",    "TEXT DEFAULT ''"),
            ("vital_observations",    "blood_loss_ml",     "REAL DEFAULT 0.0"),
            ("vital_observations",    "rate_ml_per_min",   "REAL DEFAULT 0.0"),
            ("vital_observations",    "status",            "TEXT DEFAULT 'NORMAL'"),
            ("vital_observations",    "minutes_postpartum","INTEGER DEFAULT 0"),
            ("blood_loss_measurements","rate_ml_per_min",  "REAL DEFAULT 0.0"),
            ("blood_loss_measurements","clinical_notes",   "TEXT DEFAULT ''"),
        ]
        for table, col, col_def in _safe_migrations:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def};")
            except Exception:
                pass  # Column already exists — safe to ignore


def seed_database_if_empty():
    """Seeds facilities and blood banks if database is brand new."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM facilities;")
        count = cursor.fetchone()["count"]
        if count > 0:
            return  # Facilities already present

        now = datetime.now().isoformat()

        # Seed Facilities
        facilities = [
            ("FAC-PGIMS", "Pt. B.D. Sharma PGIMS", "पं. भगवत दयाल शर्मा पीजीआईएमएस", "TERTIARY_INSTITUTE", "Medical Enclave, Rohtak, Haryana 124001", 28.8872, 76.6085, "+911262281307", 1, 1, 8, 850, 1, 1, now),
            ("FAC-CIVIL-ROHTAK", "District Civil Hospital", "नागरिक अस्पताल रोहतक", "DISTRICT_HOSPITAL", "Circular Road, Rohtak, Haryana 124001", 28.8950, 76.5820, "+911262245100", 1, 1, 3, 200, 1, 1, now),
            ("FAC-CHC-SAMPLA", "Community Health Centre (CHC) Sampla", "सामुदायिक स्वास्थ्य केंद्र सांपला", "CHC", "Sampla Bypass, Rohtak, Haryana 124501", 28.7750, 76.7720, "+911262261220", 1, 0, 1, 30, 0, 1, now),
            ("FAC-SC-KHEDI", "Sub-Centre Khedi Sadh", "उप-स्वास्थ्य केंद्र खेड़ी साध", "SUB_CENTRE", "Village Khedi Sadh, Rohtak, Haryana 124021", 28.8520, 76.6850, "+919812001108", 1, 0, 0, 4, 0, 1, now),
            ("FAC-AIIMS-JHAJJAR", "AIIMS Badsa Campus (NCI Jhajjar)", "एम्स बादसा (झज्जर)", "TERTIARY_INSTITUTE", "Badsa, Jhajjar, Haryana 124105", 28.5376, 76.8124, "+911251260000", 1, 1, 6, 710, 1, 1, now),
            ("FAC-CIVIL-JHAJJAR", "District Civil Hospital Jhajjar", "नागरिक अस्पताल झज्जर", "DISTRICT_HOSPITAL", "Jhajjar-Rewari Road, Jhajjar 124103", 28.6080, 76.6540, "+911251252200", 1, 1, 2, 100, 1, 1, now),
            ("FAC-CIVIL-BAHADURGARH", "Sub-Divisional Civil Hospital Bahadurgarh", "नागरिक अस्पताल बहादुरगढ़", "DISTRICT_HOSPITAL", "Delhi-Rohtak Road, Bahadurgarh 124507", 28.6924, 76.9240, "+911276230100", 1, 1, 2, 100, 1, 1, now),
            ("FAC-CHC-KALANAUR", "CHC Kalanaur", "सामुदायिक स्वास्थ्य केंद्र कलानौर", "CHC", "Kalanaur, Rohtak, Haryana 124113", 28.8333, 76.4000, "+911258222100", 1, 0, 1, 30, 0, 1, now),
            ("FAC-CHC-MEHAM", "CHC Meham", "सामुदायिक स्वास्थ्य केंद्र महम", "CHC", "Meham, Rohtak, Haryana 124112", 28.9667, 76.2833, "+911257233200", 1, 0, 1, 30, 0, 1, now)
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO facilities (id, name, hindi_name, facility_type, address, latitude, longitude, phone, has_24x7_emergency, c_section_capable, operating_rooms, total_beds, blood_bank_verified, is_seed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, facilities)

        # Seed Blood Inventory
        blood_units = [
            ("BLD-1", "FAC-PGIMS", "O+", 14, "VERIFIED_API", "e-RaktKosh (PGIMS Dept of Transfusion)", now),
            ("BLD-2", "FAC-PGIMS", "O-", 4, "VERIFIED_API", "e-RaktKosh (PGIMS Dept of Transfusion)", now),
            ("BLD-3", "FAC-PGIMS", "B+", 18, "VERIFIED_API", "e-RaktKosh (PGIMS Dept of Transfusion)", now),
            ("BLD-4", "FAC-PGIMS", "AB-", 2, "VERIFIED_API", "e-RaktKosh (PGIMS Dept of Transfusion)", now),
            ("BLD-5", "FAC-CIVIL-ROHTAK", "O+", 6, "HOSPITAL_REPORTED", "Civil Hospital Blood Storage", now),
            ("BLD-6", "FAC-CIVIL-ROHTAK", "B+", 8, "HOSPITAL_REPORTED", "Civil Hospital Blood Storage", now)
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO blood_inventory (id, facility_id, blood_group, units_available, verification_status, source, last_verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, blood_units)

        # Seed Primary Patient: Priya Sharma (MOMENT-PT-2916)
        cursor.execute("""
        INSERT INTO patients (id, abha_id, name, hindi_name, age, blood_group, contact_phone, emergency_contact_phone, primary_facility_id, registered_by_user_id, registered_by_name, is_seed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, ("MOMENT-PT-2916", "91-8472-9281-0192", "Priya Sharma", "प्रिया शर्मा", 26, "O+", "+919812345678", "+919812345679", "FAC-SC-KHEDI", "USR-ANM", "Suman Devi (ANM)", 1, now, now))

        cursor.execute("""
        INSERT INTO pregnancies (id, patient_id, gravidity, parity, gestational_age, prior_csections, multiple_births, macrosomia, placenta_previa, placental_abruption, hypertensive_disorders, gestational_diabetes, coagulation_disorders, maternal_hemoglobin_gdl, current_risk_tier, current_risk_percent, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, ("PREG-2916", "MOMENT-PT-2916", 2, 1, 38.0, 1, 0, 0, 0, 0, 0, 0, 0, 8.2, "ESCALATED", 18.5, "IN_LABOR", now, now))

        # Seed Vital Observations for Priya Sharma
        vitals = [
            ("VIT-1", "MOMENT-PT-2916", "PREG-2916", "00 min", 84, 118, 76, 0.71, "NORMAL", "Firm", "ANM Suman Devi", now),
            ("VIT-2", "MOMENT-PT-2916", "PREG-2916", "15 min", 96, 110, 72, 0.87, "NORMAL", "Soft", "ANM Suman Devi", now),
            ("VIT-3", "MOMENT-PT-2916", "PREG-2916", "30 min", 118, 90, 60, 1.31, "ALERT", "Boggy", "ANM Suman Devi", now)
        ]
        cursor.executemany("""
        INSERT INTO vital_observations (id, patient_id, pregnancy_id, time_checkpoint, heart_rate, systolic_bp, diastolic_bp, shock_index, shock_tier, uterine_tone, recorded_by, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, vitals)

        # Seed Blood Loss for Priya Sharma
        cursor.execute("""
        INSERT INTO blood_loss_measurements (id, patient_id, pregnancy_id, volume_ml, measurement_mode, confidence, severity_tier, image_url, recorded_by, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, ("BLM-1", "MOMENT-PT-2916", "PREG-2916", 300.0, "CAMERA_RESNET", 0.92, "WATCH", "/pad_photos/02_AMBER_WATCH_MODERATE.jpg", "ANM Suman Devi", now))

        # Seed Ambulance
        cursor.execute("""
        INSERT INTO ambulances (id, registration_number, cad_reference_id, service_type, driver_name, driver_phone, current_lat, current_lng, status, last_gps_ping)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, ("AMB-1081", "HR-12-G-1081", "CAD-HR-2026-9812", "108_ALS", "Virender Singh", "+919812991081", 28.8710, 76.6210, "DISPATCHED", now))

    # Also make sure all active clinical staff and female patients are populated
    ensure_seed_users_and_patients()


def ensure_seed_users_and_patients():
    """Idempotently ensures pre-configured rural ANM, GNM, Doctor users and female patients exist."""
    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        pwd_hash = hash_password("password123")

        # 1. Healthcare Staff Users
        staff_users = [
            ("USR-ANM", "anm_suman", pwd_hash, "Suman Devi (ANM)", "ANM", 32, "ANM-HR-48291", "FAC-SC-KHEDI", "Sub-Centre Khedi Sadh", "Village Khedi Sadh, Rohtak", "+919812001108", "", 1, '{"status": "VERIFIED", "authority": "Haryana Nursing Registration Council"}', now),
            ("USR-GNM", "gnm_pooja", pwd_hash, "Pooja Verma (GNM)", "GNM", 28, "GNM-HR-99214", "FAC-CHC-SAMPLA", "Community Health Centre Sampla", "Block Sampla, Rohtak", "+919812003301", "", 1, '{"status": "VERIFIED", "authority": "State Nursing Council & NHM"}', now),
            ("USR-DR", "dr_sunita", pwd_hash, "Dr. Sunita Malik, MD (OBGYN)", "DOCTOR", 41, "MCI-58204", "FAC-PGIMS", "Pt. B.D. Sharma PGIMS", "Medical Enclave, Rohtak", "+919812002209", "", 1, '{"status": "VERIFIED", "authority": "National Medical Commission"}', now),
            ("USR-NURSE", "nurse_kavita", pwd_hash, "Kavita Sharma (Staff Nurse)", "NURSE", 27, "SN-HR-10924", "FAC-CIVIL-ROHTAK", "District Civil Hospital", "Circular Road, Rohtak", "+919812004402", "", 1, '{"status": "VERIFIED", "authority": "Directorate of Health Services"}', now),
            ("USR-HOSP", "admin_pgims", pwd_hash, "PGIMS Emergency Triage Bay", "HOSPITAL_ADMIN", 38, "ADM-PGIMS-01", "FAC-PGIMS", "Pt. B.D. Sharma PGIMS", "Rohtak", "+911262281307", "", 1, '{"status": "VERIFIED"}', now),
            ("USR-DIST", "cmo_rohtak", pwd_hash, "Chief Medical Officer (District Admin)", "DISTRICT_ADMIN", 49, "CMO-ROHTAK", "FAC-CIVIL-ROHTAK", "District Civil Hospital", "Rohtak District", "+911262245100", "", 1, '{"status": "VERIFIED"}', now)
        ]

        for u in staff_users:
            cursor.execute("""
            INSERT INTO users (id, username, password_hash, full_name, role, age, registration_no, facility_id, facility_name, rural_area, phone, id_card_url, id_card_verified, ocr_match_details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                password_hash = excluded.password_hash,
                full_name = excluded.full_name,
                role = excluded.role,
                age = excluded.age,
                registration_no = excluded.registration_no,
                facility_name = excluded.facility_name,
                rural_area = excluded.rural_area,
                id_card_verified = 1;
            """, u)

        # 2. Staff users are kept. Dummy seed patients are NOT forcibly re-injected
        # so only real user-registered and OCR-scanned patients remain in the active registry.
        pass
