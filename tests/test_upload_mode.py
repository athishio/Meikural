"""
tests/test_upload_mode.py - Verification of Dashboard File Upload Mode Scoring Pipeline
========================================================================================
Validates:
1. Upload of known bonafide sample (bonafide_human_speech.wav) produces ALLOW verdict.
2. Upload of known spoof sample (deepfake_voice_clone.wav) produces STEP_UP_VERIFICATION.
3. Codec selection query parameter (?codec=g711_ulaw) applies calibrated telephony thresholds.
4. Error handling: Disallowed file formats return HTTP 415, empty files return HTTP 422.
5. All uploads reuse the identical AASIST + calibrated threshold backend pipeline.
"""

import os
import unittest
from starlette.testclient import TestClient

from app import app


class TestFileUploadMode(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.bonafide_path = os.path.join("demo_clips", "bonafide_human_speech.wav")
        self.spoof_path = os.path.join("demo_clips", "deepfake_voice_clone.wav")
        self.assertTrue(os.path.exists(self.bonafide_path), f"Missing {self.bonafide_path}")
        self.assertTrue(os.path.exists(self.spoof_path), f"Missing {self.spoof_path}")

    def test_upload_bonafide_sample_verdict_allow(self):
        """Validates that uploading a known human bonafide sample yields ALLOW verdict."""
        with open(self.bonafide_path, "rb") as f:
            audio_bytes = f.read()

        res = self.client.post("/score", files={"file": ("bonafide_human_speech.wav", audio_bytes, "audio/wav")})
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["risk_verdict"], "ALLOW")
        self.assertLess(data["score"], 0.35)
        self.assertIn("metadata", data)
        self.assertIn("inference_latency_ms", data["metadata"])
        self.assertGreater(data["metadata"]["inference_latency_ms"], 0)
        self.assertIn("anti_spoofing", data)
        self.assertEqual(data["anti_spoofing"]["verdict"], "bonafide")
        self.assertEqual(data["anti_spoofing"]["confidence"], "high")

    def test_upload_spoof_sample_verdict_step_up(self):
        """Validates that uploading a known AI voice clone sample yields STEP_UP_VERIFICATION."""
        with open(self.spoof_path, "rb") as f:
            audio_bytes = f.read()

        res = self.client.post("/score", files={"file": ("deepfake_voice_clone.wav", audio_bytes, "audio/wav")})
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["risk_verdict"], "STEP_UP_VERIFICATION")
        self.assertGreater(data["score"], 0.65)
        self.assertIn("anti_spoofing", data)
        self.assertEqual(data["anti_spoofing"]["verdict"], "spoof")
        self.assertEqual(data["anti_spoofing"]["confidence"], "high")

    def test_upload_with_codec_calibration_parameter(self):
        """Validates that specifying telecom codec applies calibrated threshold profile."""
        with open(self.bonafide_path, "rb") as f:
            audio_bytes = f.read()

        res = self.client.post(
            "/score?codec=g711_ulaw",
            files={"file": ("telecom_caller.wav", audio_bytes, "audio/wav")}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["codec_profile"], "g711_ulaw")
        self.assertAlmostEqual(data["anti_spoofing"]["threshold_used"], -8.64, places=2)

    def test_upload_bad_format_rejection(self):
        """Validates that non-audio formats return descriptive HTTP 415 error."""
        res = self.client.post(
            "/score",
            files={"file": ("document.pdf", b"%PDF-1.4 Mock Payload", "application/pdf")}
        )
        self.assertEqual(res.status_code, 415)
        self.assertIn("Unsupported Media Type", res.json()["detail"])

    def test_upload_empty_audio_rejection(self):
        """Validates that empty audio uploads return HTTP 422 error."""
        res = self.client.post(
            "/score",
            files={"file": ("empty.wav", b"", "audio/wav")}
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("empty", res.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
