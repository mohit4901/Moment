"""
MOMENT Central Clinical Alert & Escalation Engine
=================================================
Coordinates clinical risk evaluations, alert deduplication, dynamic recipient lookup,
Twilio SMS/Voice dispatch, dashboard alerts, and acknowledgement lifecycles.
"""
import os
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from ..database import get_db
from .twilio_service import TwilioService

COOLDOWN_MINUTES = 15

class AlertEngine:
    _instance = None

    @classmethod
    def get_instance(cls) -> "AlertEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _is_duplicate(self, mother_id: str, event_type: str, severity: str) -> bool:
        """Checks if a matching alert was dispatched within the cooldown window."""
        with get_db() as conn:
            cursor = conn.cursor()
            cutoff = (datetime.now() - timedelta(minutes=COOLDOWN_MINUTES)).isoformat()
            cursor.execute("""
            SELECT id FROM alerts
            WHERE mother_id = ? AND event_type = ? AND severity = ?
              AND created_at >= ? AND is_resolved = 0
            LIMIT 1;
            """, (mother_id, event_type, severity, cutoff))
            return cursor.fetchone() is not None

    def _get_dynamic_recipients(self, mother_id: str) -> List[Dict[str, str]]:
        """Resolves attending doctor, nurse/ANM, hospital emergency desk, and family phone."""
        recipients = []
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT p.name, p.contact_phone, p.emergency_contact_phone, p.primary_facility_id,
                   p.assigned_doctor_id, p.registered_by_user_id,
                   f.name as facility_name, f.phone as facility_phone
            FROM patients p
            LEFT JOIN facilities f ON f.id = p.primary_facility_id
            WHERE p.id = ?;
            """, (mother_id,))
            pt = cursor.fetchone()
            if not pt:
                return [{"name": "On-Duty Obstetric Team", "phone": "+919812001108", "role": "ANM"}]

            # 1. Assigned Doctor
            if pt.get("assigned_doctor_id"):
                cursor.execute("SELECT full_name, phone, role FROM users WHERE id = ?;", (pt["assigned_doctor_id"],))
                doc = cursor.fetchone()
                if doc and doc.get("phone"):
                    recipients.append({"name": doc["full_name"], "phone": doc["phone"], "role": doc["role"]})

            # 2. Registering ANM / GNM
            if pt.get("registered_by_user_id"):
                cursor.execute("SELECT full_name, phone, role FROM users WHERE id = ?;", (pt["registered_by_user_id"],))
                staff = cursor.fetchone()
                if staff and staff.get("phone"):
                    recipients.append({"name": staff["full_name"], "phone": staff["phone"], "role": staff["role"]})

            # 3. Facility Emergency Desk
            if pt.get("facility_phone"):
                recipients.append({"name": f"{pt['facility_name']} Triage", "phone": pt["facility_phone"], "role": "HOSPITAL"})

            # 4. Emergency Family Contact
            if pt.get("emergency_contact_phone"):
                recipients.append({"name": f"Family Contact ({pt['name']})", "phone": pt["emergency_contact_phone"], "role": "FAMILY"})

        # Deduplicate by phone
        seen_phones = set()
        unique_recipients = []
        for r in recipients:
            if r["phone"] and r["phone"] not in seen_phones:
                seen_phones.add(r["phone"])
                unique_recipients.append(r)

        return unique_recipients or [{"name": "Default Clinical Dispatch", "phone": "+918168884901", "role": "CLINICAL"}]

    def trigger_clinical_alert(
        self,
        mother_id: str,
        event_type: str,
        severity: str,
        trigger_rule: str,
        details: Dict[str, Any],
        initiated_by: Optional[str] = "SYSTEM"
    ) -> Dict[str, Any]:
        """
        Evaluates deduplication, generates alert, notifies dashboard,
        dispatches Twilio SMS and Voice escalation if critical.
        """
        # 1. Check Deduplication
        if self._is_duplicate(mother_id, event_type, severity):
            return {
                "status": "DEDUPLICATED",
                "message": f"Identical {severity} alert for mother {mother_id} dispatched recently. Cooldown active.",
                "cooldown_minutes": COOLDOWN_MINUTES
            }

        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now().isoformat()
        recipients = self._get_dynamic_recipients(mother_id)
        twilio_svc = TwilioService.get_instance()

        mother_name = details.get("mother_name") or mother_id
        blood_loss = details.get("blood_loss_ml")
        shock_index = details.get("shock_index")

        # 2. Compose Concise Emergency Message
        sms_body = (
            f"🚨 MOMENT EMERGENCY PPH ALERT\n"
            f"Mother: {mother_name} (ID: {mother_id})\n"
            f"Severity: {severity} | Trigger: {trigger_rule}\n"
        )
        if blood_loss is not None:
            sms_body += f"Blood Loss: ~{blood_loss:.0f} mL\n"
        if shock_index is not None:
            sms_body += f"Shock Index: {shock_index:.2f}\n"
        sms_body += f"Time: {datetime.now().strftime('%H:%M:%S')}. Immediate clinical assessment required."

        # 3. Dispatch Twilio SMS
        sms_results = []
        primary_sid = None
        for r in recipients:
            res = twilio_svc.send_sms(
                to_phone=r["phone"],
                message_body=sms_body,
                recipient_name=r["name"],
                alert_id=alert_id
            )
            sms_results.append(res)
            if not primary_sid and res.get("provider_sid"):
                primary_sid = res["provider_sid"]

        # 3b. Dispatch WhatsApp Alert (using Twilio Content Template or text)
        wa_target = os.environ.get("DEFAULT_EMERGENCY_WHATSAPP", "whatsapp:+918168884901")
        try:
            wa_res = twilio_svc.send_whatsapp(
                to_phone=wa_target,
                message_body=sms_body,
                content_sid=os.environ.get("TWILIO_CONTENT_SID", "HX6a0f411e81d092c214c00d5e2727cc36"),
                recipient_name=mother_name,
                referral_id=alert_id
            )
            if not primary_sid and wa_res.get("provider_sid"):
                primary_sid = wa_res["provider_sid"]
        except Exception as wa_err:
            print(f"⚠️ [AlertEngine] WhatsApp dispatch notice: {wa_err}")

        # 4. Automated Twilio Voice Call for CRITICAL events
        voice_res = None
        if severity == "CRITICAL":
            facility_name = "उप-स्वास्थ्य केंद्र खेड़ी साध"
            staff_label = "स्टाफ"
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT p.name, p.registered_by_name, f.name as facility_name
                FROM patients p
                LEFT JOIN facilities f ON f.id = p.primary_facility_id
                WHERE p.id = ?;
                """, (mother_id,))
                row = cursor.fetchone()
                if row:
                    if row.get("facility_name"):
                        facility_name = row["facility_name"]
                    if row.get("registered_by_name"):
                        staff_label = row["registered_by_name"]

            report_exp = f"शॉक इंडेक्स {shock_index:.2f} और अनुमानित रक्तस्राव {blood_loss or 500} मिलीलीटर" if shock_index else trigger_rule

            voice_prompt = (
                f"आपातकालीन अलर्ट! आपके अस्पताल {facility_name} के {staff_label} के अंतर्गत मरीज {mother_name} का मोमेंट चेकअप क्रिटिकल आया है। "
                f"रिपोर्ट व्याख्या: {report_exp}। "
                f"मरीज में पोस्टपार्टम रक्तस्राव का गंभीर खतरा है। कृपया आप तुरंत अस्पताल पहुंचें।"
            )

            # Call primary clinician (fallback to default emergency phone)
            lead_phone = recipients[0]["phone"] if recipients else os.environ.get("DEFAULT_EMERGENCY_WHATSAPP", "+918168884901").replace("whatsapp:", "")
            lead_name = recipients[0]["name"] if recipients else "Attending Clinician"
            voice_res = twilio_svc.make_call(
                to_phone=lead_phone,
                spoken_text=voice_prompt,
                recipient_name=lead_name
            )

        # 5. Save Alert in Database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO alerts (
                id, mother_id, event_type, severity, trigger_rule, details_json,
                recipients_json, delivery_status, twilio_sid, is_acknowledged,
                is_resolved, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DELIVERED', ?, 0, 0, ?);
            """, (
                alert_id,
                mother_id,
                event_type,
                severity,
                trigger_rule,
                json.dumps(details),
                json.dumps(recipients),
                primary_sid,
                now_str
            ))

            # Audit Log
            cursor.execute("""
            INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details_json, timestamp)
            VALUES (?, ?, 'ALERT_TRIGGERED', 'ALERT', ?, ?, ?);
            """, (f"AUD-{uuid.uuid4().hex[:8]}", initiated_by, alert_id, json.dumps({"severity": severity, "event_type": event_type}), now_str))

        return {
            "status": "DISPATCHED",
            "alert_id": alert_id,
            "severity": severity,
            "recipients_notified": len(recipients),
            "sms_results": sms_results,
            "voice_call": voice_res,
            "timestamp": now_str
        }

    def list_alerts(self, mother_id: Optional[str] = None, unresolved_only: bool = False) -> List[Dict[str, Any]]:
        """Returns alerts with mother demographic details."""
        with get_db() as conn:
            cursor = conn.cursor()
            query = """
            SELECT a.*, p.name as mother_name, p.hindi_name, p.age as mother_age, p.blood_group
            FROM alerts a
            JOIN patients p ON p.id = a.mother_id
            WHERE 1=1
            """
            params = []
            if mother_id:
                query += " AND a.mother_id = ?"
                params.append(mother_id)
            if unresolved_only:
                query += " AND a.is_resolved = 0"
            query += " ORDER BY a.created_at DESC LIMIT 50;"
            cursor.execute(query, params)
            return cursor.fetchall()

    def acknowledge_alert(self, alert_id: str, user_name: str) -> Dict[str, Any]:
        now_str = datetime.now().isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE alerts
            SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
            WHERE id = ?;
            """, (user_name, now_str, alert_id))

            cursor.execute("""
            INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details_json, timestamp)
            VALUES (?, ?, 'ALERT_ACKNOWLEDGED', 'ALERT', ?, ?, ?);
            """, (f"AUD-{uuid.uuid4().hex[:8]}", user_name, alert_id, json.dumps({"acknowledged_at": now_str}), now_str))

        return {"status": "SUCCESS", "alert_id": alert_id, "acknowledged_by": user_name, "acknowledged_at": now_str}

    def resolve_alert(self, alert_id: str, user_name: str, resolution_notes: str = "") -> Dict[str, Any]:
        now_str = datetime.now().isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE alerts
            SET is_resolved = 1, resolved_by = ?, resolved_at = ?
            WHERE id = ?;
            """, (user_name, now_str, alert_id))

            cursor.execute("""
            INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details_json, timestamp)
            VALUES (?, ?, 'ALERT_RESOLVED', 'ALERT', ?, ?, ?);
            """, (f"AUD-{uuid.uuid4().hex[:8]}", user_name, alert_id, json.dumps({"notes": resolution_notes}), now_str))

        return {"status": "SUCCESS", "alert_id": alert_id, "resolved_by": user_name, "resolved_at": now_str}
