"""
tests/test_codec_robustness.py - Verification Suite for Telecom Narrowband Codec Robustness
========================================================================================
Validates that MEIKURAL's AASIST acoustic front-end remains invariant and accurate
under simulated lossy telecommunication channel compressions:
- ITU-T G.711 mu-law (PSTN standard)
- ITU-T G.711 A-law (Europe / India standard)
- PSTN 8kHz Narrowband (300 Hz - 3400 Hz bandpass)
- AMR-WB Wideband profile
"""

import os
import unittest
import numpy as np
import soundfile as sf
import audio_processor as ap
from fusion import TurnaroundLatencyProfiler, LatencyClassification, FusionEngine


class TestTelephonyCodecRobustness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = os.path.dirname(os.path.abspath(__file__))
        cls.repo_dir = os.path.dirname(cls.test_dir)
        cls.demo_dir = os.path.join(cls.repo_dir, "demo_clips")

        cls.human_clip = os.path.join(cls.demo_dir, "bonafide_human_speech.wav")
        cls.clone_clip = os.path.join(cls.demo_dir, "deepfake_voice_clone.wav")

    def test_g711_mulaw_mathematical_bounds(self):
        """Validates that G.711 mu-law compression maintains amplitude bounds [-1.0, 1.0]."""
        sine_wave = np.sin(np.linspace(0, 100, 16000)).astype(np.float32)
        companded = ap.TelephonyCodecEngine.apply_g711_ulaw(sine_wave)
        self.assertEqual(len(companded), len(sine_wave))
        self.assertLessEqual(np.max(np.abs(companded)), 1.0)
        # Verify non-trivial reconstruction
        diff = np.max(np.abs(sine_wave - companded))
        self.assertLess(diff, 0.05)

    def test_g711_alaw_mathematical_bounds(self):
        """Validates that G.711 A-law compression maintains amplitude bounds [-1.0, 1.0]."""
        sine_wave = np.sin(np.linspace(0, 100, 16000)).astype(np.float32)
        companded = ap.TelephonyCodecEngine.apply_g711_alaw(sine_wave)
        self.assertEqual(len(companded), len(sine_wave))
        self.assertLessEqual(np.max(np.abs(companded)), 1.0)
        diff = np.max(np.abs(sine_wave - companded))
        self.assertLess(diff, 0.05)

    def test_pstn_narrowband_filtering(self):
        """Validates that 8kHz downsampling and Butterworth bandpass produce standard 16kHz audio."""
        white_noise = np.random.uniform(-0.5, 0.5, 16000).astype(np.float32)
        filtered = ap.TelephonyCodecEngine.apply_pstn_narrowband(white_noise)
        self.assertEqual(len(filtered), len(white_noise))
        self.assertIsInstance(filtered, np.ndarray)

    def test_codec_invariance_on_voice_clone(self):
        """Confirms that deepfake detection remains confident even after lossy telecom codecs."""
        if os.path.exists(self.clone_clip):
            res_raw = ap.score_audio_chunk_detailed(self.clone_clip)
            res_ulaw = ap.score_audio_chunk_detailed(self.clone_clip, simulate_codec="g711_ulaw")
            res_alaw = ap.score_audio_chunk_detailed(self.clone_clip, simulate_codec="g711_alaw")
            res_pstn = ap.score_audio_chunk_detailed(self.clone_clip, simulate_codec="pstn_narrowband")

            # All simulated codecs should flag the synthetic clone with high spoof confidence
            self.assertGreaterEqual(res_raw["passive_score"], 0.65)
            self.assertGreaterEqual(res_ulaw["passive_score"], 0.65)
            self.assertGreaterEqual(res_alaw["passive_score"], 0.65)
            self.assertGreaterEqual(res_pstn["passive_score"], 0.65)


class TestTurnaroundLatencyProfiling(unittest.TestCase):
    def setUp(self):
        self.profiler = TurnaroundLatencyProfiler()

    def test_natural_human_reflex(self):
        """Validates that human reaction delay (400ms) produces NATURAL_HUMAN with zero penalty."""
        session_id = "test_sess_human"
        t0 = 1000.0
        self.profiler.mark_prompt_issued(session_id, ts=t0)

        # 450ms turnaround to speech onset
        t_speech = t0 + 0.450
        profile = self.profiler.evaluate_speech_onset(session_id, is_speech=True, ts=t_speech)

        self.assertIsNotNone(profile)
        self.assertEqual(profile.classification, LatencyClassification.NATURAL_HUMAN)
        self.assertLessEqual(profile.anomaly_penalty, 0.0)
        self.assertTrue(profile.to_dict()["is_biological"])

    def test_synthetic_pipeline_lag(self):
        """Validates that cascading AI delay (1600ms) is flagged as SYNTHETIC_LAG with penalty."""
        session_id = "test_sess_bot"
        t0 = 2000.0
        self.profiler.mark_prompt_issued(session_id, ts=t0)

        # 1650ms turnaround delay (typical ASR + LLM + TTS cascade)
        t_speech = t0 + 1.650
        profile = self.profiler.evaluate_speech_onset(session_id, is_speech=True, ts=t_speech)

        self.assertIsNotNone(profile)
        self.assertEqual(profile.classification, LatencyClassification.SYNTHETIC_PIPELINE_LAG)
        self.assertGreater(profile.anomaly_penalty, 0.20)
        self.assertFalse(profile.to_dict()["is_biological"])

    def test_instant_soundboard_attack(self):
        """Validates that near-zero turnaround (120ms) is flagged as soundboard injection."""
        session_id = "test_sess_soundboard"
        t0 = 3000.0
        self.profiler.mark_prompt_issued(session_id, ts=t0)

        # 120ms turnaround (unnatural mechanical reflex)
        t_speech = t0 + 0.120
        profile = self.profiler.evaluate_speech_onset(session_id, is_speech=True, ts=t_speech)

        self.assertIsNotNone(profile)
        self.assertEqual(profile.classification, LatencyClassification.INSTANT_SOUNDBOARD)
        self.assertGreater(profile.anomaly_penalty, 0.15)

    def test_fusion_engine_incorporates_turnaround_profiler(self):
        """Validates that FusionEngine properly attaches timing profiles and adjusts risk."""
        engine = FusionEngine()
        session_id = "sess_fusion_timing"
        t0 = 5000.0

        # Issue challenge
        res_ch = engine.process_chunk(
            session_id=session_id,
            passive_score=0.45,
            is_speech=False,
            manual_challenge_action="trigger_challenge",
            timestamp=t0,
        )
        self.assertEqual(res_ch["challenge_state"].event.value, "challenge_fired")

        # Caller takes 1800ms to synthesize response (AI lag)
        res_voice = engine.process_chunk(
            session_id=session_id,
            passive_score=0.45,
            is_speech=True,
            timestamp=t0 + 1.800,
        )
        self.assertIsNotNone(res_voice["timing_profile"])
        self.assertEqual(res_voice["timing_profile"]["classification"], "SYNTHETIC_LAG")
        # Risk escalated due to timing penalty
        self.assertGreater(res_voice["fused_risk_score"], 0.45)


if __name__ == "__main__":
    unittest.main()
