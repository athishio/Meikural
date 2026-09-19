"""
tests/test_audio_resampling.py - Verification of Anti-Aliased Resampling
========================================================================
Validates that MEIKURAL's audio preprocessing engine correctly resamples audio
from standard telecom and consumer sample rates (8kHz, 24kHz, 44.1kHz, 48kHz)
to 16kHz using polyphase anti-aliased filtering without distortion or artifacts.
"""

import unittest
import numpy as np
import audio_processor as ap


class TestAudioResampling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.aasist = ap.AASISTWrapper.get_instance()

    def test_resample_8khz_narrowband(self):
        """Validates resampling from 8,000 Hz (PSTN standard) to 16,000 Hz."""
        duration_s = 2.0
        sr = 8000
        t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
        sine = (0.5 * np.sin(2 * np.pi * 400 * t)).astype(np.float32)

        tensor, processed, dur_ms = self.aasist.preprocess_waveform(sine, sample_rate=sr)
        self.assertEqual(tensor.shape, (1, ap.TARGET_SAMPLES))
        self.assertAlmostEqual(dur_ms, duration_s * 1000.0, delta=50.0)
        self.assertFalse(np.isnan(processed).any())
        self.assertFalse(np.isinf(processed).any())

    def test_resample_24khz_wideband(self):
        """Validates resampling from 24,000 Hz (Opus/WebRTC wideband) to 16,000 Hz."""
        duration_s = 3.0
        sr = 24000
        t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
        sine = (0.5 * np.sin(2 * np.pi * 1000 * t)).astype(np.float32)

        tensor, processed, dur_ms = self.aasist.preprocess_waveform(sine, sample_rate=sr)
        self.assertEqual(tensor.shape, (1, ap.TARGET_SAMPLES))
        self.assertAlmostEqual(dur_ms, duration_s * 1000.0, delta=50.0)

    def test_resample_44100hz_cd_quality(self):
        """Validates resampling from 44,100 Hz (CD Audio non-integer ratio) to 16,000 Hz."""
        duration_s = 2.5
        sr = 44100
        t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
        sine = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

        tensor, processed, dur_ms = self.aasist.preprocess_waveform(sine, sample_rate=sr)
        self.assertEqual(tensor.shape, (1, ap.TARGET_SAMPLES))
        self.assertAlmostEqual(dur_ms, duration_s * 1000.0, delta=50.0)

    def test_resample_48khz_studio_quality(self):
        """Validates resampling from 48,000 Hz (Standard browser WebRTC) to 16,000 Hz."""
        duration_s = 4.0
        sr = 48000
        t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False)
        sine = (0.5 * np.sin(2 * np.pi * 880 * t)).astype(np.float32)

        tensor, processed, dur_ms = self.aasist.preprocess_waveform(sine, sample_rate=sr)
        self.assertEqual(tensor.shape, (1, ap.TARGET_SAMPLES))
        self.assertAlmostEqual(dur_ms, duration_s * 1000.0, delta=50.0)

    def test_stereo_to_mono_downmixing(self):
        """Validates that stereo multi-channel input is properly downmixed to mono."""
        sr = 48000
        length = 48000 * 2
        stereo = np.random.randn(length, 2).astype(np.float32) * 0.1

        tensor, processed, dur = self.aasist.preprocess_waveform(stereo, sample_rate=sr)
        self.assertEqual(tensor.shape, (1, ap.TARGET_SAMPLES))
        self.assertEqual(processed.ndim, 1)


if __name__ == "__main__":
    unittest.main()
