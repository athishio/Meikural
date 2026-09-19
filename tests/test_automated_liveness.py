"""
tests/test_automated_liveness.py - Verification of Automated ASR Challenge Liveness
==================================================================================
Validates that:
1. Spoken digits from transcriptions are accurately normalized to numeral strings.
2. The ASR engine accurately transcribes real human/TTS spoken digits from demo audio.
3. FusionEngine automatically matches detected digits against expected_answer,
   resolving liveness_passed=True on match and False on mismatch, without requiring
   human intervention while preserving manual escalation override.
"""

import os
import unittest
import numpy as np
import soundfile as sf

from asr_engine import ASREngine
from fusion import FusionEngine, ChallengeStatus, EventType


class TestAutomatedLiveness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.asr = ASREngine.get_instance()
        cls.demo_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "demo_clips")
        cls.digits_wav = os.path.join(cls.demo_dir, "challenge_response_digits.wav")

    def test_spoken_digit_normalization(self):
        """Validates that verbal words and numerals are cleanly normalized to digit strings."""
        cases = [
            ("Four eight two nine.", "4829"),
            ("Please repeat: 9 - 2 - 5", "925"),
            ("Verification code one seven", "17"),
            ("Zero three six eight", "0368"),
            ("Repeat 4 8 2 9", "4829"),
        ]
        for phrase, expected in cases:
            actual = self.asr.normalize_to_digits(phrase)
            self.assertEqual(actual, expected, f"Failed on phrase: {phrase}")

    def test_asr_audio_transcription(self):
        """Validates faster-whisper transcription on challenge_response_digits.wav."""
        audio, sr = sf.read(self.digits_wav)
        # Take the first 3 seconds containing '4 8 2 9'
        first_3s = audio[: sr * 3]
        digits, transcript, conf = self.asr.transcribe(first_3s)
        self.assertIn("4829", digits)
        self.assertGreater(conf, 0.3)

    def test_automated_liveness_correct_answer_resolves_passed(self):
        """Validates that matching detected_answer automatically marks challenge passed."""
        engine = FusionEngine()
        session_id = "test_liveness_pass_001"

        # 1. Issue challenge with expected_answer '4829'
        ch = engine.challenge_engine.issue_challenge(session_id)
        ch.expected_answer = "4829"

        # 2. Process chunk with matching detected_answer
        res = engine.process_chunk(
            session_id=session_id,
            passive_score=0.45,
            is_speech=True,
            rms_db=-18.0,
            detected_answer="4829",
            asr_confidence=0.92,
        )

        ch_state = res["challenge_state"]
        self.assertEqual(ch_state.event, EventType.CHALLENGE_RESPONSE)
        self.assertTrue(ch_state.liveness_passed)
        self.assertGreaterEqual(ch_state.liveness_score, 0.88)
        self.assertEqual(ch.status, ChallengeStatus.PASSED)

    def test_automated_liveness_wrong_answer_resolves_failed(self):
        """Validates that mismatched detected_answer marks challenge failed."""
        engine = FusionEngine()
        session_id = "test_liveness_fail_002"

        ch = engine.challenge_engine.issue_challenge(session_id)
        ch.expected_answer = "4829"

        # Caller said incorrect digits '1111'
        res = engine.process_chunk(
            session_id=session_id,
            passive_score=0.45,
            is_speech=True,
            rms_db=-18.0,
            detected_answer="1111",
            asr_confidence=0.90,
        )

        ch_state = res["challenge_state"]
        self.assertEqual(ch_state.event, EventType.CHALLENGE_RESPONSE)
        self.assertFalse(ch_state.liveness_passed)
        self.assertLessEqual(ch_state.liveness_score, 0.20)
        self.assertEqual(ch.status, ChallengeStatus.FAILED)

    def test_manual_operator_escalation_override(self):
        """Validates that manual operator action overrides automated decisions."""
        engine = FusionEngine()
        session_id = "test_liveness_override_003"

        ch = engine.challenge_engine.issue_challenge(session_id)
        ch.expected_answer = "4829"

        # Operator manual approval override
        res = engine.process_chunk(
            session_id=session_id,
            passive_score=0.45,
            is_speech=True,
            manual_challenge_action="resolve_challenge",
            manual_liveness_passed=True,
        )

        ch_state = res["challenge_state"]
        self.assertEqual(ch_state.event, EventType.CHALLENGE_RESPONSE)
        self.assertTrue(ch_state.liveness_passed)
        self.assertEqual(ch.status, ChallengeStatus.PASSED)


if __name__ == "__main__":
    unittest.main()
