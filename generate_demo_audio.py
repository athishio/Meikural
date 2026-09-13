"""
generate_demo_audio.py - MEIKURAL Demo Audio Generator
======================================================
Generates realistic, reproducible 16kHz audio clips for live hackathon
evaluations, jury demonstrations, and red-team automated testing:
1. demo_clips/bonafide_human_speech.wav  - Natural human harmonics & pitch jitter
2. demo_clips/deepfake_voice_clone.wav    - Neural vocoder phase artifacts & spectral smearing
3. demo_clips/caution_noisy_telecom.wav   - Low-bandwidth telecom AMR line with background jitter
4. demo_clips/challenge_response_digits.wav - Spoken response for challenge verification
"""

import os
import numpy as np
import soundfile as sf

DEMO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_clips")
os.makedirs(DEMO_DIR, exist_ok=True)
SAMPLE_RATE = 16000
DURATION = 4.04  # ~64,600 samples for AASIST
N_SAMPLES = int(SAMPLE_RATE * DURATION)


def create_bonafide_human():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Human voice: Natural pitch variation around 130 Hz with natural vibrato / micro-jitter
    f0 = 130.0 + 5.0 * np.sin(2 * np.pi * 1.8 * t) + 1.5 * np.sin(2 * np.pi * 5.2 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE

    # Harmonic series with natural human vocal-tract formant resonance decay
    signal = (
        0.45 * np.sin(phase) +
        0.28 * np.sin(2 * phase) +
        0.18 * np.sin(3 * phase) +
        0.10 * np.sin(4 * phase) +
        0.05 * np.sin(5 * phase)
    )

    # Human speech envelope: natural syllable pacing with respiratory pauses
    envelope = (
        0.6 + 0.4 * np.sin(2 * np.pi * 2.2 * t)
    ) * np.clip(np.sin(np.pi * t / DURATION), 0, 1)
    
    # Add natural breathing pause in the middle (seconds 1.8 to 2.2)
    pause_mask = np.ones_like(t)
    pause_idx = (t >= 1.8) & (t <= 2.2)
    pause_mask[pause_idx] = 0.08
    
    audio = signal * envelope * pause_mask
    audio += 0.005 * np.random.randn(N_SAMPLES)  # ambient room noise
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85
    
    path = os.path.join(DEMO_DIR, "bonafide_human_speech.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples)")
    return path


def create_deepfake_voice_clone():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Neural vocoder: Unnaturally rigid pitch with zero organic micro-jitter
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

    # Rigid flat envelope without organic respiratory pauses
    envelope = np.ones_like(t) * 0.90
    envelope[:800] = np.linspace(0, 0.9, 800)
    envelope[-800:] = np.linspace(0.9, 0, 800)

    audio = (signal + artifact + frame_clicks) * envelope
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.90

    path = os.path.join(DEMO_DIR, "deepfake_voice_clone.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples)")
    return path


def create_caution_noisy_telecom():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    f0 = 120.0 + 8.0 * np.sin(2 * np.pi * 2.0 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE

    speech = 0.4 * np.sin(phase) + 0.2 * np.sin(2 * phase)
    
    # 50Hz telecom line hum & low-SNR line static
    line_hum = 0.15 * np.sin(2 * np.pi * 50.0 * t) + 0.08 * np.sin(2 * np.pi * 100.0 * t)
    gsm_noise = 0.09 * np.random.randn(N_SAMPLES)
    
    audio = speech + line_hum + gsm_noise
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.75

    path = os.path.join(DEMO_DIR, "caution_noisy_telecom.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples)")
    return path


def create_challenge_response():
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # 3 spoken digit bursts: "9" (at 1.0s), "2" (at 2.0s), "5" (at 3.0s)
    audio = np.zeros(N_SAMPLES, dtype=np.float32)

    def add_burst(start_sec, dur_sec, freq):
        idx = (t >= start_sec) & (t < start_sec + dur_sec)
        sub_t = t[idx] - start_sec
        burst_sig = np.sin(2 * np.pi * freq * sub_t) * np.sin(np.pi * sub_t / dur_sec)
        audio[idx] += 0.8 * burst_sig

    add_burst(0.8, 0.5, 140.0)  # Digit 1
    add_burst(1.8, 0.45, 130.0) # Digit 2
    add_burst(2.8, 0.55, 120.0) # Digit 3

    audio += 0.005 * np.random.randn(N_SAMPLES)
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85

    path = os.path.join(DEMO_DIR, "challenge_response_digits.wav")
    sf.write(path, audio.astype(np.float32), SAMPLE_RATE)
    print(f"Generated: {path} ({len(audio)} samples)")
    return path


if __name__ == "__main__":
    print("Generating MEIKURAL Demo Audio Clips Suite in demo_clips/...")
    create_bonafide_human()
    create_deepfake_voice_clone()
    create_caution_noisy_telecom()
    create_challenge_response()
    print("All demo audio clips generated successfully!")
