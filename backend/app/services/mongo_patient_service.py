"""
MOMENT Production MongoDB Atlas Patient & Pregnancy Service
============================================================
Handles all clinical operations for maternal profiles and active pregnancies
persisted directly to MongoDB Atlas cluster (Database: moment_clinical).

Collections:
- `patients`: Maternal demographics, ABHA tokens, facility routing, assigned staff
- `pregnancies`: Obstetric parity, gestational age, biometric lab assays (Hb), risk scores

Maintains dual-sync to SQLite to guarantee relational integrity for vitals,
alerts, referrals, and blood inventory.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from ..mongodb_client import get_mongo_db, is_mongo_configured
from ..database import get_db

logger = logging.getLogger("moment.mongo_patients")

FACILITY_MAP = {
    "FAC-SC-KHEDI": "Sub-Centre Khedi (Primary Care)",
    "FAC-PHC-LADRAWAN": "PHC Ladrawan (Primary Health Centre)",
    "FAC-CHC-BAHADURGARH": "CHC Bahadurgarh (FRU / Secondary)",
    "FAC-DH-JHAJJAR": "District Hospital Jhajjar",
    "FAC-TERTIARY-PGIMS": "Pt. B.D. Sharma PGIMS Rohtak (Tertiary Referral Centre)"
}


def clean_mongo_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Removes MongoDB internal _id or casts it to string to keep responses JSON-serializable."""
    if not doc:
        return None
    doc_copy = dict(doc)
    if "_id" in doc_copy:
        del doc_copy["_id"]
    return doc_copy


def list_patients_mongo(
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    risk_tier: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Fetches all maternal patient records joined with their active pregnancy data
    directly from MongoDB Atlas.
    """
    db = get_mongo_db()
    if db is None:
        logger.warning("MongoDB Atlas unavailable; falling back to SQLite for list_patients.")
        return _list_patients_sqlite(search, user_id, risk_tier)

    try:
        # Build query for patients
        patient_query: Dict[str, Any] = {}
        if user_id and user_id != "ALL":
            patient_query["$or"] = [
                {"registered_by_user_id": user_id},
                {"assigned_doctor_id": user_id},
                {"registered_by_user_id": None},
                {"registered_by_user_id": {"$exists": False}}
            ]

        if search:
            regex_pat = {"$regex": search, "$options": "i"}
            patient_query["$or"] = [
                {"name": regex_pat},
                {"id": regex_pat},
                {"hindi_name": regex_pat}
            ]

        patient_docs = list(db.patients.find(patient_query).sort("updated_at", -1))

        # Fetch matching pregnancies
        results = []
        for p in patient_docs:
            p_clean = clean_mongo_doc(p)
            patient_id = p_clean.get("id")

            # Find active pregnancy
            preg = db.pregnancies.find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
            preg_clean = clean_mongo_doc(preg) or {}

            # Filter by risk tier if specified
            if risk_tier:
                current_tier = (preg_clean.get("current_risk_tier") or "ROUTINE").upper()
                if current_tier != risk_tier.upper():
                    continue

            # Merge patient + pregnancy fields for frontend compatibility
            p_clean["gravidity"] = preg_clean.get("gravidity")
            p_clean["parity"] = preg_clean.get("parity")
            p_clean["gestational_age"] = preg_clean.get("gestational_age")
            p_clean["current_risk_tier"] = preg_clean.get("current_risk_tier", "ROUTINE")
            p_clean["current_risk_percent"] = preg_clean.get("current_risk_percent", 0.0)
            p_clean["maternal_hemoglobin_gdl"] = preg_clean.get("maternal_hemoglobin_gdl")
            p_clean["prior_csections"] = preg_clean.get("prior_csections", 0)
            p_clean["pregnancy_status"] = preg_clean.get("status", "IN_LABOR")
            p_clean["facility_name"] = FACILITY_MAP.get(p_clean.get("primary_facility_id", ""), "Sub-Centre Khedi (Primary Care)")

            results.append(p_clean)

        return results

    except Exception as e:
        logger.error(f"Error querying MongoDB Atlas for patients: {e}. Falling back to SQLite.")
        return _list_patients_sqlite(search, user_id, risk_tier)


def get_patient_mongo(patient_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Retrieves patient demographics and active pregnancy record from MongoDB Atlas.
    Returns (patient_dict, pregnancy_dict).
    """
    db = get_mongo_db()
    if db is None:
        return _get_patient_sqlite(patient_id)

    try:
        p_doc = db.patients.find_one({"id": patient_id})
        if not p_doc:
            # Fallback check SQLite if newly registered
            return _get_patient_sqlite(patient_id)

        preg_doc = db.pregnancies.find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
        return clean_mongo_doc(p_doc), clean_mongo_doc(preg_doc)

    except Exception as e:
        logger.error(f"Error fetching patient {patient_id} from MongoDB Atlas: {e}")
        return _get_patient_sqlite(patient_id)


def create_patient_mongo(patient_dict: Dict[str, Any], pregnancy_dict: Dict[str, Any]) -> None:
    """
    Inserts new patient and pregnancy records into MongoDB Atlas,
    and synchronizes with SQLite for relational foreign keys.
    """
    db = get_mongo_db()
    if db is not None:
        try:
            p_doc = dict(patient_dict)
            p_doc["_id"] = p_doc["id"]
            db.patients.replace_one({"_id": p_doc["_id"]}, p_doc, upsert=True)

            pr_doc = dict(pregnancy_dict)
            pr_doc["_id"] = pr_doc["id"]
            db.pregnancies.replace_one({"_id": pr_doc["_id"]}, pr_doc, upsert=True)
            logger.info(f"Persisted patient {p_doc['id']} and pregnancy to MongoDB Atlas.")
        except Exception as e:
            logger.error(f"Failed to persist patient to MongoDB Atlas: {e}")

    # Synchronize to SQLite
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO patients (
                id, abha_id, name, hindi_name, age, blood_group, contact_phone, emergency_contact_phone,
                primary_facility_id, registered_by_user_id, registered_by_name,
                assigned_doctor_id, assigned_doctor_name, admission_date, status,
                abha_address, abha_status, is_seed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);
            """, (
                patient_dict.get("id"),
                patient_dict.get("abha_id"),
                patient_dict.get("name"),
                patient_dict.get("hindi_name"),
                patient_dict.get("age"),
                patient_dict.get("blood_group"),
                patient_dict.get("contact_phone"),
                patient_dict.get("emergency_contact_phone"),
                patient_dict.get("primary_facility_id"),
                patient_dict.get("registered_by_user_id", "USR-ANM"),
                patient_dict.get("registered_by_name", "Suman Devi (ANM)"),
                patient_dict.get("assigned_doctor_id", "USR-DR"),
                patient_dict.get("assigned_doctor_name", "Dr. Sunita Malik, MD (OBGYN)"),
                patient_dict.get("admission_date", datetime.utcnow().isoformat()),
                patient_dict.get("status", "ACTIVE"),
                patient_dict.get("abha_address", ""),
                patient_dict.get("abha_status", "UNLINKED"),
                patient_dict.get("created_at", datetime.utcnow().isoformat()),
                patient_dict.get("updated_at", datetime.utcnow().isoformat())
            ))

            cursor.execute("""
            INSERT OR REPLACE INTO pregnancies (
                id, patient_id, gravidity, parity, gestational_age, prior_csections,
                maternal_hemoglobin_gdl, current_risk_tier, current_risk_percent, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                pregnancy_dict.get("id"),
                pregnancy_dict.get("patient_id"),
                pregnancy_dict.get("gravidity", 1),
                pregnancy_dict.get("parity", 0),
                pregnancy_dict.get("gestational_age", 38.0),
                pregnancy_dict.get("prior_csections", 0),
                pregnancy_dict.get("maternal_hemoglobin_gdl"),
                pregnancy_dict.get("current_risk_tier", "ROUTINE"),
                pregnancy_dict.get("current_risk_percent", 5.0),
                pregnancy_dict.get("status", "IN_LABOR"),
                pregnancy_dict.get("created_at", datetime.utcnow().isoformat()),
                pregnancy_dict.get("updated_at", datetime.utcnow().isoformat())
            ))
    except Exception as sqle:
        logger.warning(f"SQLite sync error during patient creation: {sqle}")


def update_patient_mongo(patient_id: str, payload: Dict[str, Any]) -> None:
    """
    Updates patient demographics and/or pregnancy clinical metrics in MongoDB Atlas,
    and synchronizes changes to SQLite.
    """
    now_str = datetime.utcnow().isoformat()
    db = get_mongo_db()

    # Segregate patient demographic fields vs pregnancy clinical fields
    patient_fields = ["name", "hindi_name", "age", "blood_group", "assigned_doctor_id",
                      "assigned_doctor_name", "contact_phone", "emergency_contact_phone",
                      "status", "abha_id", "abha_address", "abha_status"]
    preg_fields = ["current_risk_tier", "current_risk_percent", "maternal_hemoglobin_gdl",
                   "gestational_age", "gravidity", "parity", "prior_csections",
                   "hypertensive_disorders", "gestational_diabetes", "placenta_previa",
                   "placental_abruption", "coagulation_disorders", "status"]

    p_updates = {"updated_at": now_str}
    preg_updates = {"updated_at": now_str}

    for k, v in payload.items():
        if k in patient_fields:
            if k == "age" and v is not None:
                p_updates[k] = int(v)
            else:
                p_updates[k] = v
        if k in preg_fields:
            if k in ("maternal_hemoglobin_gdl", "gestational_age", "current_risk_percent") and v is not None and v != "":
                preg_updates[k] = float(v)
            elif k in ("gravidity", "parity", "prior_csections", "hypertensive_disorders") and v is not None:
                preg_updates[k] = int(v)
            elif k == "current_risk_tier" and v:
                preg_updates[k] = str(v).upper()
            else:
                preg_updates[k] = v

    if db is not None:
        try:
            if len(p_updates) > 1:
                db.patients.update_one({"id": patient_id}, {"$set": p_updates})
            if len(preg_updates) > 1:
                db.pregnancies.update_one({"patient_id": patient_id}, {"$set": preg_updates})
            logger.info(f"Updated patient {patient_id} in MongoDB Atlas.")
        except Exception as e:
            logger.error(f"Failed to update MongoDB Atlas for patient {patient_id}: {e}")

    # Synchronize to SQLite
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            # SQLite patient updates
            pt_sql = []
            pt_params = []
            for k in ["name", "hindi_name", "age", "blood_group", "contact_phone", "emergency_contact_phone", "assigned_doctor_id", "assigned_doctor_name", "status"]:
                if k in payload and payload[k] is not None:
                    pt_sql.append(f"{k} = ?")
                    pt_params.append(payload[k])
            if pt_sql:
                pt_sql.append("updated_at = ?")
                pt_params.append(now_str)
                pt_params.append(patient_id)
                cursor.execute(f"UPDATE patients SET {', '.join(pt_sql)} WHERE id = ?;", tuple(pt_params))

            # SQLite pregnancy updates
            pr_sql = []
            pr_params = []
            for k in ["current_risk_tier", "current_risk_percent", "maternal_hemoglobin_gdl", "gestational_age", "gravidity", "parity", "prior_csections"]:
                if k in payload and payload[k] is not None and payload[k] != "":
                    pr_sql.append(f"{k} = ?")
                    val = float(payload[k]) if k in ("current_risk_percent", "maternal_hemoglobin_gdl", "gestational_age") else payload[k]
                    pr_params.append(val)
            if pr_sql:
                pr_sql.append("updated_at = ?")
                pr_params.append(now_str)
                pr_params.append(patient_id)
                cursor.execute(f"UPDATE pregnancies SET {', '.join(pr_sql)} WHERE patient_id = ?;", tuple(pr_params))
    except Exception as sqle:
        logger.warning(f"SQLite sync error during update_patient: {sqle}")


def update_patient_abha_mongo(patient_id: str, abha_id: str, abha_address: str, abha_status: str = "VERIFIED") -> None:
    """Updates ABDM / ABHA M1 identity tokens in MongoDB Atlas and SQLite."""
    now_str = datetime.utcnow().isoformat()
    db = get_mongo_db()
    if db is not None:
        try:
            db.patients.update_one(
                {"id": patient_id},
                {"$set": {
                    "abha_id": abha_id,
                    "abha_address": abha_address,
                    "abha_status": abha_status,
                    "updated_at": now_str
                }}
            )
            logger.info(f"Updated ABHA ID {abha_id} on patient {patient_id} in MongoDB Atlas.")
        except Exception as e:
            logger.error(f"Failed to update ABHA in MongoDB Atlas: {e}")

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE patients
            SET abha_id = ?, abha_address = ?, abha_status = ?, updated_at = ?
            WHERE id = ?;
            """, (abha_id, abha_address, abha_status, now_str, patient_id))
    except Exception as sqle:
        logger.warning(f"SQLite sync error during update_patient_abha: {sqle}")


# ─── SQLITE FALLBACK HELPERS ───────────────────────────────────────

def _list_patients_sqlite(search=None, user_id=None, risk_tier=None) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT p.*,
               pr.gravidity, pr.parity, pr.gestational_age, pr.current_risk_tier,
               pr.current_risk_percent, pr.maternal_hemoglobin_gdl, pr.prior_csections,
               pr.status as pregnancy_status,
               f.name as facility_name
        FROM patients p
        LEFT JOIN pregnancies pr ON pr.patient_id = p.id
        LEFT JOIN facilities f ON f.id = p.primary_facility_id
        WHERE 1=1
        """
        params = []
        if user_id and user_id != "ALL":
            query += " AND (p.registered_by_user_id = ? OR p.assigned_doctor_id = ? OR p.registered_by_user_id IS NULL)"
            params.extend([user_id, user_id])
        if risk_tier:
            query += " AND pr.current_risk_tier = ?"
            params.append(risk_tier.upper())
        if search:
            query += " AND (p.name LIKE ? OR p.id LIKE ? OR p.hindi_name LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        query += " ORDER BY p.updated_at DESC;"
        cursor.execute(query, params)
        return cursor.fetchall()


def _get_patient_sqlite(patient_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE id = ?;", (patient_id,))
        p = cursor.fetchone()
        cursor.execute("SELECT * FROM pregnancies WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1;", (patient_id,))
        pr = cursor.fetchone()
        return p, pr
