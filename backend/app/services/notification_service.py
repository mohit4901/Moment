"""
MOMENT Emergency Notification Service (Twilio SMS Integration)
============================================================
Handles real SMS dispatches to emergency contacts, receiving hospital triage,
and ambulance drivers. Transparently flags unconfigured state without faking.
"""
import os
import uuid
import urllib.request
import urllib.parse
import base64
import json
from datetime import datetime
from typing import Dict, Any, Optional
from ..database import get_db

class EmergencyNotificationService:
    _instance = None

    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.from_phone = os.environ.get("TWILIO_PHONE_NUMBER")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_phone)

    def send_emergency_sms(
        self,
        to_phone: str,
        message_body: str,
        recipient_name: Optional[str] = None,
        referral_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches SMS via Twilio if configured, else logs locally with NOT_CONFIGURED status."""
        notification_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now().isoformat()

        if self.is_configured():
            try:
                # Real Twilio API Call
                url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
                data = urllib.parse.urlencode({
                    "To": to_phone,
                    "From": self.from_phone,
                    "Body": message_body
                }).encode("utf-8")
                
                req = urllib.request.Request(url, data=data, method="POST")
                credentials = f"{self.account_sid}:{self.auth_token}"
                encoded_creds = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")
                req.add_header("Authorization", f"Basic {encoded_creds}")

                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    provider_sid = res_body.get("sid", "UNKNOWN_SID")
                    status = "SENT"

            except Exception as e:
                provider_sid = None
                status = f"FAILED: {str(e)}"
        else:
            provider_sid = "DEV_LOCAL_NO_TWILIO_ENV"
            status = "NOT_CONFIGURED_DEV"

        # Record in notifications table
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO notifications (id, referral_id, recipient_phone, recipient_name, channel, message_body, provider, provider_sid, status, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (notification_id, referral_id, to_phone, recipient_name, "SMS", message_body, "TWILIO", provider_sid, status, now_str))

        return {
            "notification_id": notification_id,
            "status": status,
            "recipient_phone": to_phone,
            "is_live_dispatched": status == "SENT",
            "message_body": message_body,
            "timestamp": now_str
        }
