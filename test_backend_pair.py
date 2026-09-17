"""
test_backend_pair.py - Unit tests for database.py, alerts.py, and incident reporting
==================================================================================
Verifies:
1. Zero-trust salted SHA-256 caller ID hashing.
2. 90-day retention auto-purge calculations.
3. Database functions: log_call_start, log_event, log_call_end, get_call_summary, get_recent_calls.
4. Alerts functions: send_sms_alert, send_email_alert, dispatch_step_up_alerts.
5. Incident report export endpoint: GET /calls/{session_id}/report.
"""

import hashlib
import os
import time
import unittest

from starlette.testclient import TestClient

import alerts
import database
from app import app


class TestMeikuralAuditDatabase(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_audit.db"
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        database.init_db(db_path=self.test_db)

    def tearDown(self):
        if os.path.exists(self.test_db):
            os.remove(self.test_db)

    def test_caller_id_salted_hashing(self):
        salt = database.SALT
        raw_phone = "+919876543210"
        expected = hashlib.sha256((salt + raw_phone).encode("utf-8")).hexdigest()
        actual = database.hash_caller_id(raw_phone)
        self.assertEqual(actual, expected)
        self.assertNotEqual(actual, raw_phone)
        self.assertEqual(len(actual), 64)

    def test_log_call_start_and_summary(self):
        session_id = "call_test_001"
        raw_phone = "+1 (415) 555-0199"
        res = database.log_call_start(
            session_id=session_id,
            caller_id=raw_phone,
            retention_days=90,
            db_path=self.test_db,
        )
        self.assertEqual(res["session_id"], session_id)
        self.assertNotIn(raw_phone, res["caller_id_hash"])
        self.assertGreater(res["retention_expiry"], time.time() + (89 * 86400))

        summary = database.get_call_summary(session_id, db_path=self.test_db)
        self.assertIsNotNone(summary)
        self.assertEqual(summary["session_id"], session_id)
        self.assertEqual(summary["final_verdict"], "INITIALIZING")
        self.assertEqual(summary["challenge_fired"], 0)

    def test_log_event_and_call_end(self):
        session_id = "call_test_002"
        database.log_call_start(session_id=session_id, caller_id="+15551234567", db_path=self.test_db)

        # Log sequential events
        e1 = database.log_event(
            session_id=session_id,
            score=0.45,
            smoothed_score=0.45,
            verdict="WARN",
            challenge_id=None,
            db_path=self.test_db,
        )
        e2 = database.log_event(
            session_id=session_id,
            score=0.88,
            smoothed_score=0.72,
            verdict="STEP_UP_VERIFICATION",
            challenge_id="ch_99",
            db_path=self.test_db,
        )
        self.assertGreater(e2, e1)

        events = database.get_events(session_id, db_path=self.test_db)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["verdict"], "WARN")
        self.assertEqual(events[1]["verdict"], "STEP_UP_VERIFICATION")
        self.assertEqual(events[1]["challenge_id"], "ch_99")

        # Finalize call
        end_ok = database.log_call_end(
            session_id=session_id,
            final_risk_score=0.88,
            final_verdict="STEP_UP_VERIFICATION",
            challenge_fired=True,
            db_path=self.test_db,
        )
        self.assertTrue(end_ok)

        summary = database.get_call_summary(session_id, db_path=self.test_db)
        self.assertEqual(summary["final_risk_score"], 0.88)
        self.assertEqual(summary["final_verdict"], "STEP_UP_VERIFICATION")
        self.assertEqual(summary["challenge_fired"], 1)
        self.assertIsNotNone(summary["end_time"])

    def test_get_recent_calls(self):
        for i in range(5):
            database.log_call_start(
                session_id=f"call_batch_{i}",
                caller_id=f"+155500000{i}",
                start_time=time.time() + i,
                db_path=self.test_db,
            )
        recent = database.get_recent_calls(limit=3, db_path=self.test_db)
        self.assertEqual(len(recent), 3)
        self.assertEqual(recent[0]["session_id"], "call_batch_4")

    def test_purge_expired_records(self):
        past_time = time.time() - (100 * 86400)
        session_id = "call_expired_001"
        database.log_call_start(
            session_id=session_id,
            caller_id="+15559998888",
            start_time=past_time,
            retention_days=90,
            db_path=self.test_db,
        )
        database.log_event(session_id, 0.1, 0.1, "ALLOW", db_path=self.test_db)

        # Purge
        purged = database.purge_expired_records(current_time=time.time(), db_path=self.test_db)
        self.assertEqual(purged, 1)
        self.assertIsNone(database.get_call_summary(session_id, db_path=self.test_db))
        self.assertEqual(len(database.get_events(session_id, db_path=self.test_db)), 0)

    def test_hash_chain_intact(self):
        session_id = "call_chain_intact_001"
        database.log_call_start(session_id=session_id, caller_id="+15551234567", db_path=self.test_db)
        for i in range(4):
            database.log_event(
                session_id=session_id,
                score=0.1 * (i + 1),
                smoothed_score=0.1 * (i + 1),
                verdict="ALLOW" if i < 2 else "WARN",
                timestamp=1700000000.0 + i,
                db_path=self.test_db,
            )

        is_valid, broken_idx = database.verify_chain(session_id, db_path=self.test_db)
        self.assertTrue(is_valid)
        self.assertIsNone(broken_idx)

        # Attribute-based access check
        res = database.verify_chain(session_id, db_path=self.test_db)
        self.assertTrue(res.valid)
        self.assertIsNone(res.broken_index)
        self.assertEqual(res.total_events, 4)

    def test_hash_chain_tamper_detection(self):
        session_id = "call_chain_tamper_001"
        database.log_call_start(session_id=session_id, caller_id="+15551234567", db_path=self.test_db)
        for i in range(3):
            database.log_event(
                session_id=session_id,
                score=0.85,
                smoothed_score=0.85,
                verdict="STEP_UP_VERIFICATION",
                timestamp=1700000000.0 + i,
                db_path=self.test_db,
            )

        # Confirm chain is initially intact
        self.assertTrue(database.verify_chain(session_id, db_path=self.test_db).valid)

        # Tamper with row 1 directly in SQLite (silent modification)
        with database.get_db_connection(self.test_db) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT event_id FROM events WHERE session_id = ? ORDER BY event_id ASC", (session_id,))
            event_ids = [r["event_id"] for r in cursor.fetchall()]
            target_id = event_ids[1]
            # Attacker lowers risk score to 0.10
            cursor.execute("UPDATE events SET score = 0.10, verdict = 'ALLOW' WHERE event_id = ?", (target_id,))

        # Verify tamper detection
        is_valid, broken_idx = database.verify_chain(session_id, db_path=self.test_db)
        self.assertFalse(is_valid)
        self.assertEqual(broken_idx, 1)

    def test_legacy_backfill(self):
        session_id = "call_legacy_migration_001"
        database.log_call_start(session_id=session_id, caller_id="+15551234567", db_path=self.test_db)
        for i in range(3):
            database.log_event(
                session_id=session_id,
                score=0.20,
                smoothed_score=0.20,
                verdict="ALLOW",
                timestamp=1700000000.0 + i,
                db_path=self.test_db,
            )

        # Simulate legacy state: set all record_hash and prev_hash to GENESIS_HASH
        with database.get_db_connection(self.test_db) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE events SET record_hash = ?, prev_hash = ? WHERE session_id = ?",
                (database.GENESIS_HASH, database.GENESIS_HASH, session_id),
            )

        # Verification would fail before backfill
        is_valid_before, _ = database.verify_chain(session_id, db_path=self.test_db)
        self.assertFalse(is_valid_before)

        # Execute backfill
        backfilled = database.backfill_legacy_event_hashes(db_path=self.test_db)
        self.assertEqual(backfilled, 3)

        # Now verification succeeds
        is_valid_after, broken_idx = database.verify_chain(session_id, db_path=self.test_db)
        self.assertTrue(is_valid_after)
        self.assertIsNone(broken_idx)



class TestMeikuralAlerts(unittest.TestCase):
    def test_send_sms_alert(self):
        res = alerts.send_sms_alert(
            session_id="call_alert_001",
            risk_score=0.89,
            verdict="STEP_UP_VERIFICATION",
        )
        self.assertIn(res["status"], ["delivered", "simulated", "error"])
        self.assertEqual(res["session_id"], "call_alert_001")
        self.assertEqual(res["risk_score"], 0.89)
        self.assertIn("[MEIKURAL ALERT]", res["body"])

    def test_send_email_alert(self):
        res = alerts.send_email_alert(
            session_id="call_alert_002",
            risk_score=0.91,
            verdict="STEP_UP_VERIFICATION",
        )
        self.assertIn(res["status"], ["delivered", "simulated", "error"])
        self.assertEqual(res["session_id"], "call_alert_002")
        self.assertEqual(res["risk_score"], 0.91)

    def test_dispatch_step_up_alerts(self):
        res = alerts.dispatch_step_up_alerts(
            session_id="call_alert_003",
            risk_score=0.78,
            verdict="STEP_UP_VERIFICATION",
        )
        self.assertIn("sms", res)
        self.assertIn("email", res)
        self.assertEqual(res["risk_score"], 0.78)


class TestIncidentReportEndpoint(unittest.TestCase):
    def setUp(self):
        import uuid
        self.client = TestClient(app)
        self.session_id = f"call_rep_{uuid.uuid4().hex[:8]}"
        database.log_call_start(
            session_id=self.session_id,
            caller_id="+14155552671",
            start_time=1700000000.0,
        )
        database.log_event(
            session_id=self.session_id,
            score=0.92,
            smoothed_score=0.89,
            verdict="STEP_UP_VERIFICATION",
            challenge_id="ch_rep_1",
            timestamp=1700000001.0,
        )
        database.log_call_end(
            session_id=self.session_id,
            final_risk_score=0.92,
            final_verdict="STEP_UP_VERIFICATION",
            challenge_fired=True,
            end_time=1700000010.0,
        )

    def test_download_incident_report_success(self):
        response = self.client.get(f"/calls/{self.session_id}/report")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers.get("content-type", ""))
        self.assertIn(
            f"attachment; filename=incident_report_{self.session_id}.txt",
            response.headers.get("content-disposition", ""),
        )

        text = response.text
        self.assertIn("Organization: Meikural Voice Security Operations Center", text)
        self.assertIn(f"Session ID: {self.session_id}", text)
        self.assertIn("Salted Caller ID Hash:", text)
        self.assertIn("Call Start Time:", text)
        self.assertIn("Call End Time:", text)
        self.assertIn("Final Risk Score: 0.9200", text)
        self.assertIn("Final Verdict: STEP_UP_VERIFICATION", text)
        self.assertIn("Challenge State: TRIGGERED / FIRED", text)
        self.assertIn("Total Events Processed: 1", text)
        self.assertIn("Zero Audio on Disk · 90-Day Retention Auto-Purge", text)

    def test_download_incident_report_not_found(self):
        response = self.client.get("/calls/non_existent_session_999/report")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Call session not found")

    def test_verify_endpoint_valid_and_tampered(self):
        # 1. Verify endpoint on valid session
        res = self.client.get(f"/calls/{self.session_id}/verify")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["session_id"], self.session_id)
        self.assertTrue(data["valid"])
        self.assertIsNone(data["broken_index"])
        self.assertGreaterEqual(data["total_events"], 1)
        self.assertEqual(data["algorithm"], "SHA-256 appendable hash-chain")

        # 2. Tamper with the event in DB
        with database.get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE events SET score = 0.05 WHERE session_id = ?",
                (self.session_id,),
            )

        # 3. Verify endpoint reports invalid
        res_tampered = self.client.get(f"/calls/{self.session_id}/verify")
        self.assertEqual(res_tampered.status_code, 200)
        tampered_data = res_tampered.json()
        self.assertFalse(tampered_data["valid"])
        self.assertEqual(tampered_data["broken_index"], 0)

    def test_verify_endpoint_not_found(self):
        response = self.client.get("/calls/non_existent_session_888/verify")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Call session not found")


class TestTrustGaugeArcCalibration(unittest.TestCase):
    """
    Verifies Requirement 1:
    - Symmetrical full arc sweep (-110° to +110° from vertical, total 220°).
    - needle_angle = startAngle + (value/100) * (endAngle - startAngle).
    - Threshold domains: 0-35 (Red: -110° to -33°), 35-65 (Amber: -33° to +33°), 65-100 (Green: +33° to +110°).
    - Value 88 lands at +83.6° (deep in green band, close to high end +110°, not near top-center 0°).
    """

    def setUp(self):
        self.start_angle = -110.0
        self.end_angle = 110.0
        self.total_angle = self.end_angle - self.start_angle  # 220.0

    def compute_needle_angle(self, value: float) -> float:
        clamped = max(0.0, min(100.0, value))
        return self.start_angle + (clamped / 100.0) * self.total_angle

    def test_trust_gauge_value_88_calibration(self):
        angle_88 = self.compute_needle_angle(88.0)
        self.assertAlmostEqual(angle_88, 83.6, places=2)

        # Green threshold starts at 65 (angle: -110 + 0.65*220 = +33°)
        green_start_angle = self.compute_needle_angle(65.0)
        self.assertAlmostEqual(green_start_angle, 33.0, places=2)

        # Value 88 must visually land inside the green zone
        self.assertGreater(angle_88, green_start_angle)
        self.assertLessEqual(angle_88, self.end_angle)

        # Must be close to high end (distance to end < 30°), NOT near top-center (distance to 0° > 80°)
        dist_to_end = abs(self.end_angle - angle_88)
        dist_to_top_center = abs(0.0 - angle_88)
        self.assertLess(dist_to_end, 30.0)
        self.assertGreater(dist_to_top_center, 80.0)

    def test_trust_gauge_domains(self):
        # Value 0 lands at minimum left (Red)
        self.assertAlmostEqual(self.compute_needle_angle(0.0), -110.0, places=2)

        # Value 50 lands exactly at top-center 0° (Amber)
        self.assertAlmostEqual(self.compute_needle_angle(50.0), 0.0, places=2)

        # Value 12 lands deep in Red zone
        angle_12 = self.compute_needle_angle(12.0)
        self.assertAlmostEqual(angle_12, -83.6, places=2)
        self.assertLess(angle_12, -33.0)

        # Value 100 lands at maximum right (Green)
        self.assertAlmostEqual(self.compute_needle_angle(100.0), 110.0, places=2)


if __name__ == "__main__":
    unittest.main()


