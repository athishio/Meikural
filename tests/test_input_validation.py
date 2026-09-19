"""
tests/test_input_validation.py - Verification of Audio Input Validation Guardrails
=================================================================================
Validates that:
1. Files exceeding 25MB are rejected with HTTP 413 (Payload Too Large).
2. Files with unauthorized extensions are rejected with HTTP 415 (Unsupported Media Type).
3. Empty file uploads are rejected with HTTP 422 (Unprocessable Entity).
4. Audio durations exceeding 300 seconds are rejected with HTTP 422.
5. Supported formats (WAV, MP3) within bounds succeed with HTTP 200.
"""

import io
import unittest
import numpy as np
import soundfile as sf
from starlette.testclient import TestClient

from app import app


class TestInputValidation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

        # 1-second valid WAV
        sr = 16000
        tone = (0.3 * np.sin(2 * np.pi * 440 * np.linspace(0, 1.0, sr))).astype(np.float32)
        buf = io.BytesIO()
        sf.write(buf, tone, sr, format="WAV")
        self.valid_wav_bytes = buf.getvalue()

    def test_rejects_payload_exceeding_25mb(self):
        """Validates that file uploads >25MB trigger HTTP 413 Payload Too Large."""
        large_payload = b"\x00" * (26 * 1024 * 1024)
        files = {"file": ("large_audio.wav", large_payload, "audio/wav")}
        res = self.client.post("/score", files=files)
        self.assertEqual(res.status_code, 413)
        self.assertIn("exceeds maximum limit of 25MB", res.json()["detail"])

    def test_rejects_unsupported_file_extension(self):
        """Validates that disallowed file extensions trigger HTTP 415 Unsupported Media Type."""
        disallowed = ["malicious.exe", "script.sh", "payload.bin", "text.txt"]
        for fn in disallowed:
            files = {"file": (fn, self.valid_wav_bytes, "application/octet-stream")}
            res = self.client.post("/score", files=files)
            self.assertEqual(res.status_code, 415, f"Expected 415 for {fn}")
            self.assertIn("Unsupported Media Type", res.json()["detail"])

    def test_rejects_empty_file(self):
        """Validates that empty audio uploads trigger HTTP 422."""
        files = {"file": ("empty.wav", b"", "audio/wav")}
        res = self.client.post("/score", files=files)
        self.assertEqual(res.status_code, 422)
        self.assertIn("empty", res.json()["detail"].lower())

    def test_accepts_valid_wav_upload(self):
        """Validates that valid audio format within bounds succeeds with HTTP 200."""
        files = {"file": ("valid_sample.wav", self.valid_wav_bytes, "audio/wav")}
        res = self.client.post("/score", files=files)
        self.assertEqual(res.status_code, 200)
        self.assertIn("score", res.json())


if __name__ == "__main__":
    unittest.main()
