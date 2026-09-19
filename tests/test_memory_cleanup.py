"""
tests/test_memory_cleanup.py - Verification of Per-Session Memory Cleanup
========================================================================
Validates that when a WebSocket disconnects or call ends, `cleanup_session`
completely purges all in-memory state tracking dictionaries across FusionEngine,
ChallengeEngine, and TurnaroundLatencyProfiler, preventing memory leaks.
"""

import unittest
import numpy as np
from fusion import FusionEngine


class TestMemoryCleanup(unittest.TestCase):
    def setUp(self):
        self.engine = FusionEngine()

    def test_complete_session_cleanup(self):
        session_id = "test_mem_cleanup_sess_001"

        # 1. Profiler mark prompt issued & in speech
        self.engine.timing_profiler.mark_prompt_issued(session_id)
        self.engine.timing_profiler._session_in_speech[session_id] = True
        self.engine.timing_profiler._session_turns[session_id] = [150.0]

        # 2. Challenge Engine issue challenge
        self.engine.challenge_engine.issue_challenge(session_id)

        # 3. Process chunk to populate FusionEngine state
        chunk = (np.random.randn(16000) * 0.1).astype(np.float32)
        res = self.engine.process_chunk(
            session_id=session_id,
            passive_score=0.85,
            is_speech=True,
            rms_db=-18.0,
        )

        # 4. Verify all dictionaries contain this session
        self.assertIn(session_id, self.engine._session_smoothed)
        self.assertIn(session_id, self.engine._session_consecutive_high)
        self.assertIn(session_id, self.engine._session_challenge_dispatched)
        self.assertIn(session_id, self.engine._session_verdict)

        self.assertIn(session_id, self.engine.timing_profiler._session_turns)
        self.assertIn(session_id, self.engine.timing_profiler._session_prompt_ts)
        self.assertIn(session_id, self.engine.timing_profiler._session_in_speech)

        self.assertIn(session_id, self.engine.challenge_engine._active_challenges)
        self.assertIn(session_id, self.engine.challenge_engine._session_challenge_count)

        # 5. Perform session cleanup
        self.engine.cleanup_session(session_id)

        # 6. Verify all dictionaries have been purged
        self.assertNotIn(session_id, self.engine._session_smoothed)
        self.assertNotIn(session_id, self.engine._session_consecutive_high)
        self.assertNotIn(session_id, self.engine._session_challenge_dispatched)
        self.assertNotIn(session_id, self.engine._session_verdict)

        self.assertNotIn(session_id, self.engine.timing_profiler._session_turns)
        self.assertNotIn(session_id, self.engine.timing_profiler._session_prompt_ts)
        self.assertNotIn(session_id, self.engine.timing_profiler._session_in_speech)

        self.assertNotIn(session_id, self.engine.challenge_engine._active_challenges)
        self.assertNotIn(session_id, self.engine.challenge_engine._session_challenge_count)
        self.assertNotIn(session_id, self.engine.challenge_engine._session_cooldown_until)


if __name__ == "__main__":
    unittest.main()
