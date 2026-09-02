"""
test_backend_pair.py - Unit tests for database.py and alerts.py
==============================================================
Verifies:
1. Zero-trust salted SHA-256 caller ID hashing.
2. 90-day retention auto-purge calculations.
3. Database functions: log_call_start, log_event, log_call_end, get_call_summary, get_recent_calls.
4. Alerts functions: send_sms_alert, send_email_alert, dispatch_step_up_alerts.
"""

import hashlib
import os
import time
import unittest

import alerts
import database


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


if __name__ == "__main__":
    unittest.main()
