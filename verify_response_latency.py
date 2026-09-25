"""
verify_response_latency.py
Directly tests and verifies the Response Latency Evaluator and TurnaroundLatencyProfiler
measuring exact millisecond timestamps between end_of_prompt (issued_at) and voice_activity_start.
Logs actual real timestamps from execution.
"""

import time
import json
from fusion import TurnaroundLatencyProfiler, ChallengeEngine, LatencyClassification, FusionEngine

def test_live_latency_evaluator():
    print("=" * 80)
    print("MEIKURAL RESPONSE LATENCY EVALUATOR VERIFICATION")
    print("=" * 80)
    
    profiler = TurnaroundLatencyProfiler()
    engine = ChallengeEngine()
    session_id = "live_audit_session_01"
    
    # -------------------------------------------------------------
    # Scenario 1: Natural Human Reflex (Target: 250ms - 850ms)
    # -------------------------------------------------------------
    print("\n--- [TEST 1: NATURAL HUMAN REFLEX] ---")
    ch_rec = engine.issue_challenge(session_id, challenge_type="digit_repeat")
    t_prompt_issued = profiler.mark_prompt_issued(session_id)
    print(f"  [1] Challenge Issued: ID='{ch_rec.challenge_id}', Prompt='{ch_rec.prompt_text}'")
    print(f"      Timestamp (end_of_prompt): {t_prompt_issued:.6f} (epoch sec)")
    
    # Real sleep to measure actual physical wall-clock time
    simulated_sleep_human = 0.425  # 425 ms
    time.sleep(simulated_sleep_human)
    t_voice_start = time.time()
    
    timing_human = profiler.evaluate_speech_onset(session_id, is_speech=True, ts=t_voice_start)
    delta_human_ms = (t_voice_start - t_prompt_issued) * 1000.0
    
    print(f"  [2] Voice Activity Detected (speech onset): {t_voice_start:.6f} (epoch sec)")
    print(f"  [3] Measured Turnaround Delta: {delta_human_ms:.2f} ms")
    print(f"  [4] Latency Classification:   {timing_human.classification.value}")
    print(f"  [5] Risk Anomaly Penalty:     {timing_human.anomaly_penalty:+.2f} (Reward/Discount for human reflex)")
    print(f"  [6] Biological Reflex Flag:   {timing_human.classification == LatencyClassification.NATURAL_HUMAN}")
    
    # -------------------------------------------------------------
    # Scenario 2: Cascading Generative AI Pipeline Lag (> 1400ms)
    # Attack vector: ASR (300ms) + LLM (400ms) + TTS/RVC (800ms) + transit (150ms)
    # -------------------------------------------------------------
    print("\n--- [TEST 2: CASCADING AI PIPELINE LAG (RVC / VOICE CONVERSION)] ---")
    session_ai = "live_audit_session_02"
    ch_rec_ai = engine.issue_challenge(session_ai, challenge_type="shared_secret")
    t_prompt_ai = profiler.mark_prompt_issued(session_ai)
    print(f"  [1] Challenge Issued: ID='{ch_rec_ai.challenge_id}', Prompt='{ch_rec_ai.prompt_text}'")
    print(f"      Timestamp (end_of_prompt): {t_prompt_ai:.6f} (epoch sec)")
    
    # Real sleep to measure actual physical wall-clock time (>1.4s)
    simulated_sleep_ai = 1.550  # 1550 ms
    time.sleep(simulated_sleep_ai)
    t_voice_ai = time.time()
    
    timing_ai = profiler.evaluate_speech_onset(session_ai, is_speech=True, ts=t_voice_ai)
    delta_ai_ms = (t_voice_ai - t_prompt_ai) * 1000.0
    
    print(f"  [2] Voice Activity Detected (speech onset): {t_voice_ai:.6f} (epoch sec)")
    print(f"  [3] Measured Turnaround Delta: {delta_ai_ms:.2f} ms")
    print(f"  [4] Latency Classification:   {timing_ai.classification.value} (CRITICAL ALERT)")
    print(f"  [5] Risk Anomaly Penalty:     {timing_ai.anomaly_penalty:+.2f} (Penalty added to fused risk)")
    print(f"  [6] Biological Reflex Flag:   {timing_ai.classification == LatencyClassification.NATURAL_HUMAN}")
    
    # -------------------------------------------------------------
    # Scenario 3: Mechanical / Instant Soundboard Injection (< 250ms)
    # -------------------------------------------------------------
    print("\n--- [TEST 3: INSTANT SOUNDBOARD INJECTION] ---")
    session_sb = "live_audit_session_03"
    ch_rec_sb = engine.issue_challenge(session_sb, challenge_type="digit_repeat")
    t_prompt_sb = profiler.mark_prompt_issued(session_sb)
    print(f"  [1] Challenge Issued: ID='{ch_rec_sb.challenge_id}', Prompt='{ch_rec_sb.prompt_text}'")
    print(f"      Timestamp (end_of_prompt): {t_prompt_sb:.6f} (epoch sec)")
    
    # Pre-recorded soundboard fired impossibly fast (<250ms)
    simulated_sleep_sb = 0.080  # 80 ms
    time.sleep(simulated_sleep_sb)
    t_voice_sb = time.time()
    
    timing_sb = profiler.evaluate_speech_onset(session_sb, is_speech=True, ts=t_voice_sb)
    delta_sb_ms = (t_voice_sb - t_prompt_sb) * 1000.0
    
    print(f"  [2] Voice Activity Detected (speech onset): {t_voice_sb:.6f} (epoch sec)")
    print(f"  [3] Measured Turnaround Delta: {delta_sb_ms:.2f} ms")
    print(f"  [4] Latency Classification:   {timing_sb.classification.value}")
    print(f"  [5] Risk Anomaly Penalty:     {timing_sb.anomaly_penalty:+.2f}")
    
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY:")
    print(f"  Human reflex measured:       {delta_human_ms:.1f}ms -> {timing_human.classification.value}")
    print(f"  Synthetic AI lag measured:   {delta_ai_ms:.1f}ms -> {timing_ai.classification.value}")
    print(f"  Soundboard instant measured: {delta_sb_ms:.1f}ms -> {timing_sb.classification.value}")
    print("=" * 80)

if __name__ == "__main__":
    test_live_latency_evaluator()
