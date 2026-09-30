"""
test_acoustic_robustness.py
===========================
Executes acoustic robustness and bandwidth tests on the live-mic audio path:
1. Pure Background Noise (silence, quiet room fan -50dB, keyboard clatter -35dB)
2. Speech + Ambient Noise at varying SNR (30dB, 20dB, 10dB)
3. Bandwidth preservation & spectral energy analysis (0-4kHz vs 4-8kHz)
4. Evaluates whether ambient noise triggers false-positive clone alarms
"""

import os
import json
import numpy as np
import soundfile as sf
import scipy.signal as signal
from audio_processor import (
    score_audio_chunk_detailed,
    TARGET_SAMPLE_RATE,
    TARGET_SAMPLES,
    SILENCE_RMS_THRESHOLD_DB,
)
from evaluate_live_mic_calibration import (
    simulate_browser_mic_stream,
    decode_mulaw_backend,
)

def run_acoustic_tests():
    bona_path = "demo_clips/bonafide_human_speech.wav"
    spoof_path = "demo_clips/deepfake_voice_clone.wav"

    bona_data, sr_b = sf.read(bona_path)
    if bona_data.ndim > 1:
        bona_data = np.mean(bona_data, axis=1)

    spoof_data, sr_s = sf.read(spoof_path)
    if spoof_data.ndim > 1:
        spoof_data = np.mean(spoof_data, axis=1)

    print("=" * 80)
    print("STEP 3: ACOUSTIC ROBUSTNESS & BANDWIDTH INTEGRITY AUDIT")
    print("=" * 80)

    # 1. Non-Speech & Ambient Room Noise Tests
    print("\n--- 1. Non-Speech & Ambient Room Noise Evaluation ---")
    duration_samples = TARGET_SAMPLES
    noise_scenarios = [
        ("Digital Silence (-100 dBFS)", np.zeros(duration_samples, dtype=np.float32)),
        ("Quiet Room Fan (-50 dBFS RMS)", np.random.randn(duration_samples).astype(np.float32) * (10.0 ** (-50.0 / 20.0))),
        ("Keyboard / Room Chatter (-38 dBFS RMS)", np.random.randn(duration_samples).astype(np.float32) * (10.0 ** (-38.0 / 20.0))),
        ("Loud Ambient Noise (-25 dBFS RMS)", np.random.randn(duration_samples).astype(np.float32) * (10.0 ** (-25.0 / 20.0))),
    ]

    for name, noise_signal in noise_scenarios:
        ulaw = simulate_browser_mic_stream(noise_signal, in_sr=16000)
        pcm_8k = decode_mulaw_backend(ulaw)
        pcm_16k = np.repeat(pcm_8k, 2).tobytes()
        res = score_audio_chunk_detailed(pcm_16k, simulate_codec="g711_ulaw")
        is_spk = res["audio_health"]["is_speech"]
        rms = res["audio_health"]["rms_db"]
        score = res["passive_score"]
        verdict = res["verdict"]
        print(f"  {name:<38} | RMS: {rms:6.1f}dB | IsSpeech: {str(is_spk):<5} | Score: {score:.4f} | Verdict: {verdict}")

    # 2. Speech Mixed with Ambient Noise (SNR degradation)
    print("\n--- 2. Human Speech Under Additive Room Noise (SNR Degradation) ---")
    # Take 4-second speech window
    speech_window = bona_data[:TARGET_SAMPLES].astype(np.float32)
    speech_rms = np.sqrt(np.mean(speech_window ** 2) + 1e-12)

    snr_levels = [None, 30, 20, 10, 5]
    for snr in snr_levels:
        if snr is None:
            mixed = speech_window
            label = "Clean Speech (No Noise)"
        else:
            noise_rms = speech_rms / (10.0 ** (snr / 20.0))
            noise = np.random.randn(*speech_window.shape).astype(np.float32) * noise_rms
            mixed = np.clip(speech_window + noise, -1.0, 1.0)
            label = f"Speech + Ambient Noise (SNR={snr}dB)"

        ulaw = simulate_browser_mic_stream(mixed, in_sr=sr_b)
        pcm_8k = decode_mulaw_backend(ulaw)
        pcm_16k = np.repeat(pcm_8k, 2).tobytes()
        res = score_audio_chunk_detailed(pcm_16k, simulate_codec="g711_ulaw")
        print(f"  {label:<38} | Score: {res['passive_score']:.4f} | LLR: {res['raw_llr']:7.2f} | Verdict: {res['verdict']}")

    # 3. Cloned Voice Under Additive Room Noise
    print("\n--- 3. Voice Clone Under Additive Room Noise (Detection Robustness) ---")
    clone_window = spoof_data[:TARGET_SAMPLES].astype(np.float32)
    clone_rms = np.sqrt(np.mean(clone_window ** 2) + 1e-12)
    for snr in snr_levels:
        if snr is None:
            mixed = clone_window
            label = "Clean Clone (No Noise)"
        else:
            noise_rms = clone_rms / (10.0 ** (snr / 20.0))
            noise = np.random.randn(*clone_window.shape).astype(np.float32) * noise_rms
            mixed = np.clip(clone_window + noise, -1.0, 1.0)
            label = f"Clone + Ambient Noise (SNR={snr}dB)"

        ulaw = simulate_browser_mic_stream(mixed, in_sr=sr_s)
        pcm_8k = decode_mulaw_backend(ulaw)
        pcm_16k = np.repeat(pcm_8k, 2).tobytes()
        res = score_audio_chunk_detailed(pcm_16k, simulate_codec="g711_ulaw")
        print(f"  {label:<38} | Score: {res['passive_score']:.4f} | LLR: {res['raw_llr']:7.2f} | Verdict: {res['verdict']}")

    # 4. Bandwidth Spectral Leakage Audit
    print("\n--- 4. Bandwidth Spectral Energy Analysis (8kHz Telephony Window) ---")
    fft_vals = np.abs(np.fft.rfft(speech_window))
    freqs = np.fft.rfftfreq(len(speech_window), 1.0 / TARGET_SAMPLE_RATE)
    band_sub4k = (freqs <= 4000)
    band_super4k = (freqs > 4000)

    e_sub4k = np.sum(fft_vals[band_sub4k] ** 2)
    e_super4k = np.sum(fft_vals[band_super4k] ** 2)
    total_e = e_sub4k + e_super4k
    print(f"  Total Clean Spectral Energy in 0-4 kHz:  {(e_sub4k / total_e)*100:.2f}%")
    print(f"  Total Clean Spectral Energy in 4-8 kHz:  {(e_super4k / total_e)*100:.2f}%")
    print("  Note: Telephony (G.711 / 8kHz) discards 100% of organic frequencies >4kHz.")
    print("  When upsampled via sample-doubling, artificial harmonic images are introduced in 4-8 kHz.")

if __name__ == "__main__":
    run_acoustic_tests()
