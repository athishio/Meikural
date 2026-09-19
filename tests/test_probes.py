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


if __name__ == "__main__":
    unittest.main()
