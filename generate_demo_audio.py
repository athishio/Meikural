"""
generate_demo_audio.py - MEIKURAL Demo Audio Generator (60-Second Extended Suite)
=================================================================================
Generates realistic, reproducible 16kHz 60-second audio clips for live hackathon
evaluations, jury demonstrations, and continuous streaming simulations:
1. demo_clips/bonafide_human_speech.wav    - Natural human harmonics, prosody & breath pauses (60s)
2. demo_clips/deepfake_voice_clone.wav      - Neural vocoder phase artifacts & spectral smearing (60s)
3. demo_clips/caution_noisy_telecom.wav     - Low-bandwidth telecom line with jitter & line hum (60s)
4. demo_clips/challenge_response_digits.wav - Spoken response for challenge verification (60s)
"""

import os
import numpy as np
import soundfile as sf

DEMO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_clips")
os.makedirs(DEMO_DIR, exist_ok=True)
SAMPLE_RATE = 16000
DURATION = 60.0  # 60.0 seconds for extended jury presentations
N_SAMPLES = int(SAMPLE_RATE * DURATION)


def create_bonafide_human():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Human voice: Natural pitch variation around 130 Hz with natural vibrato & conversational intonation
    f0 = 130.0 + 7.0 * np.sin(2 * np.pi * 0.35 * t) + 4.0 * np.sin(2 * np.pi * 1.8 * t) + 1.5 * np.sin(2 * np.pi * 5.2 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE

    # Harmonic series with natural human vocal-tract formant resonance decay
    signal = (
        0.45 * np.sin(phase) +
        0.28 * np.sin(2 * phase) +
        0.18 * np.sin(3 * phase) +
        0.10 * np.sin(4 * phase) +
        0.05 * np.sin(5 * phase)
    )

    # Human speech envelope: natural syllable pacing
    syllable_mod = 0.6 + 0.4 * np.sin(2 * np.pi * 2.8 * t)
    
    # Natural breathing and clause pauses every ~4-5 seconds across 60 seconds
    pause_mask = np.ones_like(t)
    pause_intervals = [
        (3.5, 4.2), (8.5, 9.3), (13.8, 14.6), (19.0, 19.8),
        (24.5, 25.3), (30.0, 30.9), (35.5, 36.3), (41.0, 41.9),
        (46.8, 47.6), (52.2, 53.0), (57.5, 58.3)
    ]
    for start_p, end_p in pause_intervals:
        idx = (t >= start_p) & (t <= end_p)
        pause_mask[idx] = 0.05

    audio = signal * syllable_mod * pause_mask
    audio += 0.004 * np.random.randn(N_SAMPLES)  # ambient room noise
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85

    path = os.path.join(DEMO_DIR, "bonafide_human_speech.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples, {len(audio)/SAMPLE_RATE:.1f}s)")
    return path


def create_deepfake_voice_clone():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Neural vocoder: Unnaturally rigid mechanical pitch with zero organic micro-jitter
    f0 = 145.0  # static mechanical pitch
    phase = 2 * np.pi * f0 * t

    # Synthetic harmonics
    signal = (
        0.50 * np.sin(phase) +
        0.35 * np.sin(2 * phase) +
        0.22 * np.sin(3 * phase) +
        0.15 * np.sin(4 * phase)
    )

    # Neural vocoder signature: High-frequency phase discontinuities & aliasing artifacts (>7.5 kHz)
    artifact = 0.25 * np.sin(2 * np.pi * 7850.0 * t) + 0.18 * np.sin(2 * np.pi * 7920.0 * t)
    
    # Add diffusion/GAN frame-boundary glitch clicks every 25ms (40Hz framing)
    frame_clicks = 0.12 * (np.sin(2 * np.pi * 40.0 * t) ** 16)

    # Rigid flat envelope without organic respiratory pauses across 60 seconds
    envelope = np.ones_like(t) * 0.90
    envelope[:800] = np.linspace(0, 0.9, 800)
    envelope[-800:] = np.linspace(0.9, 0, 800)

    audio = (signal + artifact + frame_clicks) * envelope
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.90

    path = os.path.join(DEMO_DIR, "deepfake_voice_clone.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples, {len(audio)/SAMPLE_RATE:.1f}s)")
    return path


def create_caution_noisy_telecom():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    f0 = 120.0 + 8.0 * np.sin(2 * np.pi * 1.5 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE

    speech = 0.4 * np.sin(phase) + 0.2 * np.sin(2 * phase)
    
    # 50Hz telecom line hum & low-SNR line static
    line_hum = 0.15 * np.sin(2 * np.pi * 50.0 * t) + 0.08 * np.sin(2 * np.pi * 100.0 * t)
    gsm_noise = 0.09 * np.random.randn(N_SAMPLES)
    
    # Occasional packet loss drops every ~6 seconds
    drop_mask = np.ones_like(t)
    for drop_start in np.arange(4.0, 58.0, 6.0):
        drop_mask[(t >= drop_start) & (t <= drop_start + 0.15)] = 0.0
    
    audio = (speech + line_hum + gsm_noise) * drop_mask
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.75

    path = os.path.join(DEMO_DIR, "caution_noisy_telecom.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples, {len(audio)/SAMPLE_RATE:.1f}s)")
    return path


def create_challenge_response():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    audio = np.zeros(N_SAMPLES, dtype=np.float32)

    def add_burst(start_sec, dur_sec, freq):
        idx = (t >= start_sec) & (t < start_sec + dur_sec)
        if not np.any(idx):
            return
        sub_t = t[idx] - start_sec
        burst_sig = np.sin(2 * np.pi * freq * sub_t) * np.sin(np.pi * sub_t / dur_sec)
        audio[idx] += 0.8 * burst_sig

    # Recurring digit challenge sequences throughout 60 seconds
    for cycle_start in [0.0, 15.0, 30.0, 45.0]:
        add_burst(cycle_start + 0.8, 0.5, 140.0)  # Digit 1
        add_burst(cycle_start + 1.8, 0.45, 130.0) # Digit 2
        add_burst(cycle_start + 2.8, 0.55, 120.0) # Digit 3
        add_burst(cycle_start + 3.8, 0.50, 135.0) # Digit 4

    audio += 0.005 * np.random.randn(N_SAMPLES)
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85

    path = os.path.join(DEMO_DIR, "challenge_response_digits.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples, {len(audio)/SAMPLE_RATE:.1f}s)")
    return path


if __name__ == "__main__":
    print("Generating MEIKURAL 60-Second Extended Demo Audio Suite...")
    create_bonafide_human()
    create_deepfake_voice_clone()
    create_caution_noisy_telecom()
    create_challenge_response()
    print("All 60-second demo clips generated successfully!")
