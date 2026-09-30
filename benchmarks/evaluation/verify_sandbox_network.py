"""
verify_sandbox_network.py - Verifies that SMS and Email alert functions make ZERO outbound network calls when credentials are absent.
"""
import sys
import logging
from unittest.mock import MagicMock, patch
import alerts

def test_sandbox_network_isolation():
    print("======================================================================")
    print(" VERIFYING ZERO OUTBOUND NETWORK CALLS IN SANDBOX DISPATCH")
    print("======================================================================")

    # Capture logs to verify simulated event logging
    logger = logging.getLogger("meikural_alerts")
    logger.setLevel(logging.DEBUG)
    log_messages = []
    class ListHandler(logging.Handler):
        def emit(self, record):
            log_messages.append(self.format(record))
    handler = ListHandler()
    logger.addHandler(handler)

    # Mock twilio module and smtplib.SMTP
    mock_twilio = MagicMock()
    mock_twilio_client = MagicMock()
    mock_twilio.rest.Client = MagicMock(return_value=mock_twilio_client)
    sys.modules["twilio"] = mock_twilio
    sys.modules["twilio.rest"] = mock_twilio.rest

    with patch("alerts.smtplib.SMTP") as mock_smtp:
        print("\n[TEST 1] Triggering send_sms_alert without TWILIO credentials...")
        sms_res = alerts.send_sms_alert(
            session_id="test_sandbox_sess_01",
            risk_score=0.92,
            verdict="STEP_UP_VERIFICATION"
        )
        print("  Returned payload status:", sms_res.get("status"))
        print("  Twilio Client instantiated:", mock_twilio.rest.Client.called)
        print("  Twilio messages.create called:", mock_twilio_client.messages.create.called)
        assert sms_res["status"] == "simulated", "Expected status to be simulated"
        assert not mock_twilio.rest.Client.called, "Twilio Client must NOT be instantiated"
        assert not mock_twilio_client.messages.create.called, "Twilio create() must NOT be called"

        print("\n[TEST 2] Triggering send_email_alert without SMTP credentials...")
        email_res = alerts.send_email_alert(
            session_id="test_sandbox_sess_02",
            risk_score=0.92,
            verdict="STEP_UP_VERIFICATION"
        )
        print("  Returned payload:", email_res)
        print("  smtplib.SMTP instantiated:", mock_smtp.called)
        print("  SMTP sendmail called:", mock_smtp.return_value.sendmail.called)
        assert email_res["status"] == "simulated", "Expected status to be simulated"
        assert not mock_smtp.called, "smtplib.SMTP must NOT be instantiated"
        assert not mock_smtp.return_value.sendmail.called, "SMTP sendmail must NOT be called"

        print("\n[TEST 3] Triggering dispatch_step_up_alerts (multi-channel dispatcher)...")
        multi_res = alerts.dispatch_step_up_alerts(
            session_id="test_sandbox_sess_03",
            risk_score=0.95
        )
        print("  Multi-channel status: sms =", multi_res["sms"]["status"], ", email =", multi_res["email"]["status"])
        assert multi_res["sms"]["status"] == "simulated"
        assert multi_res["email"]["status"] == "simulated"
        assert not mock_twilio.rest.Client.called
        assert not mock_smtp.called

    print("\n[LOG TELEMETRY CAPTURED]")
    for msg in log_messages:
        print("  LOG:", msg)

    print("\n----------------------------------------------------------------------")
    print(" VERIFICATION SUCCESS: ZERO OUTBOUND NETWORK CALLS OCCUR")
    print("----------------------------------------------------------------------")

if __name__ == "__main__":
    test_sandbox_network_isolation()
