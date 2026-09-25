"""
tests/test_sip_signaling.py - Verification of SIP Telephony Signaling Actions
=============================================================================
Validates:
1. ALLOW verdict generates SIP/2.0 200 OK with ROUTE_CALL_DIRECT and valid SDP.
2. WARN verdict generates SIP/2.0 183 Session Progress with INJECT_EARLY_MEDIA_CHALLENGE.
3. STEP_UP_VERIFICATION verdict generates SIP/2.0 488 Not Acceptable Here with ISOLATE_TRUNK_AND_ALERT.
4. Correct RFC 3261 header formatting (Via, From, To, Call-ID, CSeq).
5. Integration endpoint in FastAPI returns valid SIP payloads.
"""

import unittest
from starlette.testclient import TestClient

from app import app
import sip_signaler


class TestSIPSignaling(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_allow_generates_sip_200_ok(self):
        packet = sip_signaler.trigger_sip_action(
            session_id="call_test_allow_001",
            verdict="ALLOW",
            risk_score=0.12,
        )
        self.assertEqual(packet["status_code"], 200)
        self.assertEqual(packet["reason_phrase"], "OK")
        self.assertEqual(packet["headers"]["X-Meikural-Verdict"], "ALLOW")
        self.assertEqual(packet["headers"]["X-Meikural-Action"], "ROUTE_CALL_DIRECT")
        self.assertIn("SIP/2.0 200 OK", packet["raw_sip_message"])
        self.assertIn("v=0\r\n", packet["body"])

    def test_warn_generates_sip_183_session_progress(self):
        prompt = "Security challenge: repeat 4 - 8 - 2."
        packet = sip_signaler.trigger_sip_action(
            session_id="call_test_warn_002",
            verdict="WARN",
            challenge_prompt=prompt,
            risk_score=0.48,
        )
        self.assertEqual(packet["status_code"], 183)
        self.assertEqual(packet["reason_phrase"], "Session Progress")
        self.assertEqual(packet["headers"]["X-Meikural-Verdict"], "WARN")
        self.assertEqual(packet["headers"]["X-Meikural-Action"], "INJECT_EARLY_MEDIA_CHALLENGE")
        self.assertEqual(packet["headers"]["X-Meikural-Challenge-Prompt"], prompt)
        self.assertIn("SIP/2.0 183 Session Progress", packet["raw_sip_message"])
        self.assertIn("application/meikural-challenge+json", packet["headers"]["Content-Type"])

    def test_step_up_generates_sip_488_not_acceptable(self):
        packet = sip_signaler.trigger_sip_action(
            session_id="call_test_step_up_003",
            verdict="STEP_UP_VERIFICATION",
            risk_score=0.92,
        )
        self.assertEqual(packet["status_code"], 488)
        self.assertEqual(packet["reason_phrase"], "Not Acceptable Here")
        self.assertEqual(packet["headers"]["X-Meikural-Verdict"], "STEP_UP_VERIFICATION")
        self.assertEqual(packet["headers"]["X-Meikural-Action"], "ISOLATE_TRUNK_AND_ALERT")
        self.assertIn("SIP/2.0 488 Not Acceptable Here", packet["raw_sip_message"])
        self.assertIn("Q.850;cause=88", packet["headers"]["Reason"])

    def test_sip_headers_rfc3261_compliance(self):
        packet = sip_signaler.trigger_sip_action(
            session_id="call_rfc_test_004",
            verdict="ALLOW",
        )
        headers = packet["headers"]
        self.assertIn("Via", headers)
        self.assertIn("From", headers)
        self.assertIn("To", headers)
        self.assertIn("Call-ID", headers)
        self.assertIn("CSeq", headers)
        self.assertTrue(headers["Via"].startswith("SIP/2.0/UDP"))
        self.assertIn("z9hG4bK", headers["Via"])

    def test_sip_action_endpoint(self):
        res = self.client.post(
            "/api/sip/action",
            json={"session_id": "call_ep_005", "verdict": "STEP_UP_VERIFICATION", "risk_score": 0.88},
            headers={"X-API-Key": "meikural-dev-key-2026"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status_code"], 488)
        self.assertEqual(data["verdict"], "STEP_UP_VERIFICATION")


if __name__ == "__main__":
    unittest.main()
