"""
tests/test_probes.py - Verification of Healthz and Readyz Subsystem Probes
========================================================================
Validates that:
1. GET /healthz returns HTTP 200 with process liveness status and uptime.
2. GET /readyz returns HTTP 200 and performs deep validation of AASIST model,
   ASR engine, SQLite database, and alert channels.
"""

import unittest
from starlette.testclient import TestClient
from app import app


class TestHealthAndReadinessProbes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_healthz_liveness_probe(self):
        """Validates that /healthz returns 200 and alive status."""
        res = self.client.get("/healthz")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "alive")
        self.assertEqual(data["service"], "meikural-soc")
        self.assertEqual(data["version"], "2.0.0")
        self.assertIn("uptime_seconds", data)
        self.assertGreaterEqual(data["uptime_seconds"], 0.0)

    def test_readyz_readiness_probe(self):
        """Validates that /readyz returns 200 with all subsystem checks."""
        res = self.client.get("/readyz")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ready"])
        self.assertIn("subsystems", data)
        subsystems = data["subsystems"]
        self.assertEqual(subsystems["aasist_model"], "ok")
        self.assertEqual(subsystems["asr_engine"], "ok")
        self.assertEqual(subsystems["database"], "ok")
        self.assertIn("alert_channels", subsystems)

    def test_readyz_degraded_when_database_fails(self):
        """Validates that /readyz returns HTTP 503 when the database subsystem fails."""
        from unittest.mock import patch
        import sqlite3

        with patch("database.get_recent_calls", side_effect=sqlite3.OperationalError("disk I/O failure")):
            res = self.client.get("/readyz")
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertFalse(data["ready"])
            self.assertIn("error", data["subsystems"]["database"].lower())

    def test_readyz_degraded_when_aasist_model_fails(self):
        """Validates that /readyz returns HTTP 503 when the neural model subsystem fails."""
        from unittest.mock import patch

        with patch("audio_processor.AASISTWrapper.get_instance", side_effect=RuntimeError("Model weights corrupted")):
            res = self.client.get("/readyz")
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertFalse(data["ready"])
            self.assertIn("error", data["subsystems"]["aasist_model"].lower())


if __name__ == "__main__":
    unittest.main()
