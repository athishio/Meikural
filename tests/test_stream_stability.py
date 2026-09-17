"""
tests/test_stream_stability.py - Stream Stability & Challenge Storm Prevention Suite
=====================================================================================
Validates that MEIKURAL's real-time audio scoring and fusion pipeline:
1. Smooths high-frequency score jitter via speech-gated EMA.
2. Freezes scores during silence / breath intervals without producing spurious alarms.
3. Dispatches active challenges strictly once upon sustained threat (single-dispatch).
4. Strictly enforces post-challenge cooldown (25s) and session challenge caps (2 max).
5. Clamps silent audio to spoof_prob=0.0 and verdict='silence' in audio_processor.
"""

import unittest
import numpy as np
import audio_processor as ap
from fusion import (
    FusionEngine,
    ChallengeEngine,
    ChallengeStatus,
    EventType,
    RiskVerdict,
)


class TestStreamStability(unittest.TestCase):
    def setUp(self):
        self.fusion = FusionEngine(ema_alpha=0.20)
        self.session_id = "test_session_stability_001"

    def test_jitter_suppression(self):
        """Validates that EMA filtering suppresses erratic frame-to-frame score fluctuations."""
        raw_scores = [0.20, 0.75, 0.25, 0.80, 0.30, 0.85, 0.25]
        smoothed_scores = []

        t = 1000.0
        for score in raw_scores:
            res = self.fusion.process_chunk(
                session_id=self.session_id,
                passive_score=score,
                is_speech=True,
                timestamp=t,
            )
            smoothed_scores.append(res["fused_risk_score"])
            t += 2.0

        raw_std = float(np.std(raw_scores))
        smoothed_std = float(np.std(smoothed_scores))

        # Smoothed standard deviation must be noticeably lower than raw jitter
        self.assertLess(smoothed_std, raw_std * 0.7)

    def test_silence_freeze(self):
        """Validates that during non-speech/silence intervals, the smoothed score is frozen."""
        # Prime with a speech chunk
        res_speech = self.fusion.process_chunk(
            session_id=self.session_id,
            passive_score=0.45,
            is_speech=True,
            timestamp=100.0,
        )
        score_before_silence = res_speech["fused_risk_score"]

        # Feed multiple silence chunks with different hypothetical passive scores
        for i in range(5):
            res_silence = self.fusion.process_chunk(
                session_id=self.session_id,
                passive_score=0.90,  # Even if raw score jumped, is_speech=False
                is_speech=False,
                timestamp=102.0 + (i * 2.0),
            )
            self.assertEqual(res_silence["fused_risk_score"], score_before_silence)

    def test_single_challenge_firing_under_sustained_risk(self):
        """Confirms that sustained deepfake risk fires CHALLENGE_FIRED strictly once, not continuously."""
        fired_events = 0
        normal_events = 0
        challenge_ids = set()

        t = 500.0
        # Feed 6 consecutive high-risk speech chunks (each chunk = 2s)
        for i in range(6):
            res = self.fusion.process_chunk(
                session_id=self.session_id,
                passive_score=0.95,
                is_speech=True,
                timestamp=t,
            )
            ev = res["challenge_state"].event
            ch_id = res["challenge_state"].challenge_id

            if ev == EventType.CHALLENGE_FIRED:
                fired_events += 1
                challenge_ids.add(ch_id)
            elif ev == EventType.NORMAL:
                normal_events += 1

            t += 2.0

        # Must fire CHALLENGE_FIRED strictly once
        self.assertEqual(fired_events, 1, f"Expected exactly 1 CHALLENGE_FIRED event, got {fired_events}")
        # Only 1 unique challenge ID created
        self.assertEqual(len(challenge_ids), 1)
        # Remaining chunks while pending must be NORMAL
        self.assertGreaterEqual(normal_events, 4)

    def test_challenge_cooldown_and_session_limit(self):
        """Validates 25s cooldown enforcement and 2-challenge session cap."""
        engine = ChallengeEngine()
        sid = "cooldown_test_session"
        t0 = 1000.0

        # Initially eligible
        self.assertTrue(engine.can_issue_challenge(sid, now=t0))

        # 1. Issue first challenge
        ch1 = engine.issue_challenge(sid, timestamp=t0)
        self.assertFalse(engine.can_issue_challenge(sid, now=t0 + 1.0))

        # Resolve first challenge at t0 + 5.0
        engine.evaluate_response(sid, is_speech=True, rms_db=-18.0, manual_passed=True, timestamp=t0 + 5.0)

        # In cooldown immediately after resolution (cooldown = 25s, so active until t0 + 30.0)
        self.assertFalse(engine.can_issue_challenge(sid, now=t0 + 10.0))
        self.assertFalse(engine.can_issue_challenge(sid, now=t0 + 29.0))

        # Cooldown expires at t0 + 30.1
        self.assertTrue(engine.can_issue_challenge(sid, now=t0 + 31.0))

        # 2. Issue second challenge
        ch2 = engine.issue_challenge(sid, timestamp=t0 + 32.0)
        engine.evaluate_response(sid, is_speech=True, rms_db=-18.0, manual_passed=True, timestamp=t0 + 35.0)

        # After 2 challenges, session cap is reached; should NEVER allow another challenge
        self.assertFalse(engine.can_issue_challenge(sid, now=t0 + 70.0))
        self.assertFalse(engine.can_issue_challenge(sid, now=t0 + 1000.0))

    def test_audio_processor_silence_clamping(self):
        """Validates that VAD silence gating in audio_processor clamps spoof_prob to 0.0 and verdict to 'silence'."""
        # Generate 2 seconds of pure silence (zeros)
        silent_audio = np.zeros(32000, dtype=np.float32)
        detailed = ap.score_audio_chunk_detailed(silent_audio, sample_rate=16000)

        self.assertFalse(detailed["audio_health"]["is_speech"])
        self.assertEqual(detailed["passive_score"], 0.0)
        self.assertEqual(detailed["verdict"], "silence")


if __name__ == "__main__":
    unittest.main()
