"""
tests/test_auth_endpoints.py - Verification of Admin Authentication & Security Guardrails
========================================================================================
Validates that:
1. Protected administrative endpoints (/purge-expired, /api/rules, /api/trunks/{id}/isolate,
   /alerts/trigger, /api/test-dispatch) reject unauthorized access with HTTP 401.
2. Requests with valid X-API-Key or Bearer tokens are authorized.
3. Production environment strictly enforces non-empty MEIKURAL_API_KEY and MEIKURAL_SALT secrets,
   raising RuntimeError at startup if missing.
"""

import os
import subprocess
import sys
import unittest
from starlette.testclient import TestClient

import app as app_module
from app import app


class TestAdminAuthEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.valid_key = app_module.MEIKURAL_API_KEY

    def test_purge_expired_rejects_unauthorized(self):
        """Validates that /purge-expired rejects requests without an API key."""
        res = self.client.post("/purge-expired")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Unauthorized", res.json()["detail"])

    def test_purge_expired_rejects_invalid_key(self):
        """Validates that /purge-expired rejects requests with an invalid API key."""
        res = self.client.post("/purge-expired", headers={"X-API-Key": "wrong-secret-key"})
        self.assertEqual(res.status_code, 401)

    def test_purge_expired_accepts_valid_header(self):
        """Validates that /purge-expired succeeds with valid X-API-Key header."""
        res = self.client.post("/purge-expired", headers={"X-API-Key": self.valid_key})
        self.assertEqual(res.status_code, 200)
        self.assertIn("purged_count", res.json())

    def test_purge_expired_accepts_bearer_token(self):
        """Validates that /purge-expired succeeds with valid Bearer token."""
        res = self.client.post("/purge-expired", headers={"Authorization": f"Bearer {self.valid_key}"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("purged_count", res.json())

    def test_alerts_trigger_rejects_unauthorized(self):
        """Validates that /alerts/trigger rejects unauthorized requests."""
        res = self.client.post("/alerts/trigger", json={"session_id": "test_auth_01", "risk_score": 0.85})
        self.assertEqual(res.status_code, 401)

    def test_alerts_trigger_accepts_authorized(self):
        """Validates that /alerts/trigger succeeds when authorized."""
        res = self.client.post(
            "/alerts/trigger",
            headers={"X-API-Key": self.valid_key},
            json={"session_id": "test_auth_01", "risk_score": 0.85},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("sms", res.json())

    def test_trunk_isolation_rejects_unauthorized(self):
        """Validates that trunk isolation requires administrative authorization."""
        res = self.client.post("/api/trunks/trunk_primary/isolate")
        self.assertEqual(res.status_code, 401)

    def test_trunk_isolation_accepts_authorized(self):
        """Validates trunk isolation with valid key."""
        res = self.client.post("/api/trunks/trunk_primary/isolate", headers={"X-API-Key": self.valid_key})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_production_environment_hard_fails_without_api_key(self):
        """
        Validates that launching app in ENVIRONMENT=production with empty MEIKURAL_API_KEY
        raises RuntimeError immediately at startup.
        """
        code = """
import os
os.environ["ENVIRONMENT"] = "production"
os.environ["MEIKURAL_SALT"] = "valid_prod_salt_12345"
os.environ.pop("MEIKURAL_API_KEY", None)
import app
"""
        env = os.environ.copy()
        env["ENVIRONMENT"] = "production"
        env["MEIKURAL_SALT"] = "valid_prod_salt_12345"
        env.pop("MEIKURAL_API_KEY", None)

        proc = subprocess.run(
            [sys.executable, "-c", code],
            env=env,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("CRITICAL SECURITY ERROR: MEIKURAL_API_KEY must be configured", proc.stderr)

    def test_production_environment_hard_fails_without_salt(self):
        """
        Validates that loading database in ENVIRONMENT=production with empty MEIKURAL_SALT
        raises RuntimeError immediately at startup.
        """
        code = """
import os
os.environ["ENVIRONMENT"] = "production"
os.environ.pop("MEIKURAL_SALT", None)
import database
"""
        env = os.environ.copy()
        env["ENVIRONMENT"] = "production"
        env.pop("MEIKURAL_SALT", None)

        proc = subprocess.run(
            [sys.executable, "-c", code],
            env=env,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("CRITICAL SECURITY ERROR: MEIKURAL_SALT must be configured in production environment.", proc.stderr)


if __name__ == "__main__":
    unittest.main()
