"""
tests/test_inference_integrity.py - Verification of Inference Integrity & Anti-Tamper Overrides
=============================================================================================
Validates that:
1. In production / non-demo mode (DEMO_MODE=False), uploaded filenames (e.g. "bonafide_human_speech.wav")
   do NOT bypass or forge the AASIST acoustic neural network inference score.
2. Demo mode calibration only executes when explicitly enabled via DEMO_MODE=True.
"""

import io
import unittest
import numpy as np
import soundfile as sf
from starlette.testclient import TestClient

import app as app_module
from app import app


class TestInferenceIntegrity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Generate 2 seconds of pure noise (which AASIST will classify as synthetic/spoof, definitely not 0.021)
        sr = 16000
        noise = (np.random.randn(sr * 2) * 0.1).astype(np.float32)
        buf = io.BytesIO()
        sf.write(buf, noise, sr, format="WAV")
        self.noise_wav_bytes = buf.getvalue()

    def test_bonafide_filename_does_not_override_in_real_mode(self):
        """
        Validates that when DEMO_MODE is False (default), uploading an audio file
        named 'bonafide_human_speech.wav' does NOT return the hardcoded 0.021 demo score.
        """
        orig_demo_mode = app_module.DEMO_MODE
        try:
            app_module.DEMO_MODE = False
            files = {
                "file": ("bonafide_human_speech.wav", self.noise_wav_bytes, "audio/wav")
            }
            response = self.client.post("/score", files=files)
            self.assertEqual(response.status_code, 200)
            data = response.json()

            # Verify that demo_mode flag is False in telemetry broadcast
            self.assertFalse(data["demo_mode"])

            # Verify that the score is the genuine AASIST model computation, NOT the fake 0.021
            self.assertNotEqual(data["score"], 0.021)
            self.assertNotEqual(data["anti_spoofing"]["raw_logits"], [-5.2, 5.8])
        finally:
            app_module.DEMO_MODE = orig_demo_mode

    def test_demo_mode_calibration_when_explicitly_enabled(self):
        """
        Validates that when DEMO_MODE is explicitly enabled (DEMO_MODE=True),
        the benchmark demo clips are properly calibrated for offline rehearsed demonstrations.
        """
        orig_demo_mode = app_module.DEMO_MODE
        try:
            app_module.DEMO_MODE = True
            files = {
                "file": ("bonafide_human_speech.wav", self.noise_wav_bytes, "audio/wav")
            }
            response = self.client.post("/score", files=files)
            self.assertEqual(response.status_code, 200)
            data = response.json()

            self.assertTrue(data["demo_mode"])
            self.assertEqual(data["score"], 0.021)
            self.assertEqual(data["anti_spoofing"]["verdict"], "bonafide")
            self.assertEqual(data["anti_spoofing"]["raw_logits"], [-5.2, 5.8])
        finally:
            app_module.DEMO_MODE = orig_demo_mode


if __name__ == "__main__":
    unittest.main()
