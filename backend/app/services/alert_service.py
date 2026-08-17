import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self):
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.dispatch_phone_number = os.getenv("DISPATCH_PHONE_NUMBER")

    def trigger_ambulance_alert(self, lane_id: str, count: int):
        """Logs and dispatches webhook / SMS dispatch alert when an ambulance is detected."""
        message = f"🚨 AMBULANCE EMERGENCY PRIORITY OVERRIDE: {count} ambulance(s) detected on {lane_id.upper()}. Immediate 60s Green Signal granted."
        logger.warning(f"[EMERGENCY ALERT] {message}")
        
        # Optional Twilio Integration if credentials exist
        if self.twilio_account_sid and self.twilio_auth_token and self.dispatch_phone_number:
            try:
                from twilio.rest import Client
                client = Client(self.twilio_account_sid, self.twilio_auth_token)
                client.messages.create(
                    body=message,
                    from_=self.twilio_phone_number,
                    to=self.dispatch_phone_number
                )
                logger.info(f"SMS alert dispatched to {self.dispatch_phone_number}")
            except Exception as e:
                logger.error(f"Failed to send SMS alert via Twilio: {e}")

    def trigger_anomaly_alert(self, lane_id: str, anomaly_type: str):
        """Logs and dispatches alert when a traffic anomaly (e.g. stopped vehicle / wrong way) occurs."""
        message = f"⚠️ TRAFFIC ANOMALY ALERT: {anomaly_type} detected on {lane_id.upper()}."
        logger.warning(f"[ANOMALY ALERT] {message}")

alert_service = AlertService()
