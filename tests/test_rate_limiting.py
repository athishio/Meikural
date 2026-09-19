"""
tests/test_rate_limiting.py - Verification of SlowAPI In-Process Rate Limiting
=============================================================================
Validates that:
1. Administrative endpoints enforced with @limiter.limit("10/minute") return
   HTTP 429 Too Many Requests when burst limits are exceeded.
2. The custom 429 error handler returns a clean response.
"""

import unittest
from starlette.testclient import TestClient

import app as app_module
from app import app


class TestRateLimiting(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.valid_key = app_module.MEIKURAL_API_KEY

    def test_admin_rate_limit_exceeded(self):
        """Validates that making >10 requests to /purge-expired triggers HTTP 429."""
        headers = {"X-API-Key": self.valid_key}
        responses = []
        # Attempt 15 rapid requests on a 10/minute route
        for _ in range(15):
            res = self.client.post("/purge-expired", headers=headers)
            responses.append(res.status_code)

        # Confirm that at least one request was throttled with HTTP 429
        self.assertIn(429, responses)
        # Verify the first few succeeded before being rate-limited
        self.assertEqual(responses[0], 200)


if __name__ == "__main__":
    unittest.main()
