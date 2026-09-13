# tests/multilingual/generate_dataset.py
"""
Multilingual Acoustic Dataset Generator for Meikural
Generates representative synthetic and acoustic speech fixtures for Tamil, Hindi, and English controls.
Covers both bonafide human vocal dynamics (natural pitch micro-jitter, formant decay, pauses)
and deepfake synthetic artifacts (vocoder phase discontinuities, >7.5kHz artifacts, frame glitches).
"""

import os
import json
import numpy as np
import soundfile as sf

AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
MANIFEST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dataset_manifest.json')
SAMPLE_RATE = 16000
DURATION = 4.04  # ~64,600 samples for AASIST window
N_SAMPLES = int(SAMPLE_RATE * DURATION)

def synthesize_bonafide(f0_contour, formants, cadence_pauses, amp=0.035):
    """
    Synthesizes speech-like bonafide acoustic signal with natural vocal-tract harmonics,
    prosodic f0 contour with micro-jitter, and natural respiratory pauses.
    Signal calibrated to speech RMS (-30 to -35 dB).
    """
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Pitch contour with natural micro-jitter
    f0 = f0_contour + 2.5 * np.sin(2 * np.pi * 3.8 * t) + 1.2 * np.sin(2 * np.pi * 7.2 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SAMPLE_RATE

    # Vocal tract harmonics with organic physical decay
    signal = (
        0.50 * np.sin(phase) +
        0.28 * np.sin(2 * phase) +
        0.16 * np.sin(3 * phase) +
        0.08 * np.sin(4 * phase)
    )

    # Apply formant resonant shaping
    for f_center, weight in formants:
        signal += weight * np.sin(2 * np.pi * f_center * t) * np.sin(phase)

    # Cadence envelope with organic syllable attack/decay
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.0 * t)
    envelope = envelope * np.clip(np.sin(np.pi * t / DURATION), 0, 1)

    # Respiratory/syllable pause masking
    pause_mask = np.ones_like(t)
    for start_t, end_t in cadence_pauses:
        idx = (t >= start_t) & (t <= end_t)
        pause_mask[idx] = 0.05

    audio = amp * signal * envelope * pause_mask
    audio += 0.002 * np.random.randn(N_SAMPLES)  # Realistic ambient room floor
    return audio.astype(np.float32)

def synthesize_spoof(f0_base, vocoder_freq1=7800.0, vocoder_freq2=7950.0, frame_rate=40.0, amp=0.035):
    """
    Synthesizes neural vocoder deepfake acoustic signal with mechanical static pitch,
    high-frequency phase discontinuities (>7.5 kHz), and frame boundary aliasing glitches.
    """
    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)
    # Rigid mechanical pitch (zero natural micro-jitter)
    phase = 2 * np.pi * f0_base * t

    signal = (
        0.48 * np.sin(phase) +
        0.32 * np.sin(2 * phase) +
        0.20 * np.sin(3 * phase) +
        0.12 * np.sin(4 * phase)
    )

    # Neural vocoder phase artifact signatures (>7.5 kHz high-frequency spectral leak)
    vocoder_leak = (
        0.10 * np.sin(2 * np.pi * vocoder_freq1 * t) +
        0.08 * np.sin(2 * np.pi * vocoder_freq2 * t)
    )

    # Neural synthesis frame-boundary glitches (e.g. 25ms / 40Hz frame periodic glitches)
    frame_glitch = 0.05 * (np.sin(2 * np.pi * frame_rate * t) ** 16)

    # Rigid artificial envelope
    envelope = np.ones_like(t) * 0.90
    envelope[:600] = np.linspace(0, 0.9, 600)
    envelope[-600:] = np.linspace(0.9, 0, 600)

    audio = (signal * 0.02 + vocoder_leak + frame_glitch) * envelope
    return audio.astype(np.float32)

def generate_all():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    manifest = []

    t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False)

    # 1. English Dataset
    en_f0_1 = 135.0 + 8.0 * np.sin(2 * np.pi * 1.5 * t)
    en_b1 = synthesize_bonafide(en_f0_1, [(750, 0.15), (1200, 0.10)], [(1.5, 1.8), (3.0, 3.2)], amp=0.035)
    path_en_b1 = os.path.join(AUDIO_DIR, 'en_bonafide_01.wav')
    sf.write(path_en_b1, en_b1, SAMPLE_RATE)
    manifest.append({'id': 'en_bonafide_01', 'language': 'en', 'label': 'bonafide', 'path': 'audio/en_bonafide_01.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (English conversational formant profile) — sine-harmonic synthesis with f0 micro-jitter, not recorded/TTS speech'})

    en_f0_2 = 140.0 + 15.0 * (t / DURATION)
    en_b2 = synthesize_bonafide(en_f0_2, [(500, 0.18), (1800, 0.12)], [(1.8, 2.1)], amp=0.035)
    path_en_b2 = os.path.join(AUDIO_DIR, 'en_bonafide_02.wav')
    sf.write(path_en_b2, en_b2, SAMPLE_RATE)
    manifest.append({'id': 'en_bonafide_02', 'language': 'en', 'label': 'bonafide', 'path': 'audio/en_bonafide_02.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (English rising-intonation formant profile) — sine-harmonic synthesis, not recorded/TTS speech'})

    en_s1 = synthesize_spoof(145.0, vocoder_freq1=7820.0, vocoder_freq2=7940.0, frame_rate=40.0)
    path_en_s1 = os.path.join(AUDIO_DIR, 'en_spoof_01.wav')
    sf.write(path_en_s1, en_s1, SAMPLE_RATE)
    manifest.append({'id': 'en_spoof_01', 'language': 'en', 'label': 'spoof', 'path': 'audio/en_spoof_01.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (HiFi-GAN vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 40Hz frame glitch, not neural TTS audio'})

    en_s2 = synthesize_spoof(155.0, vocoder_freq1=7750.0, vocoder_freq2=7910.0, frame_rate=50.0)
    path_en_s2 = os.path.join(AUDIO_DIR, 'en_spoof_02.wav')
    sf.write(path_en_s2, en_s2, SAMPLE_RATE)
    manifest.append({'id': 'en_spoof_02', 'language': 'en', 'label': 'spoof', 'path': 'audio/en_spoof_02.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (WaveGlow vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 50Hz frame glitch, not neural TTS audio'})

    # 2. Tamil Dataset
    ta_f0_1 = 125.0 + 7.0 * np.sin(2 * np.pi * 2.1 * t)
    ta_b1 = synthesize_bonafide(ta_f0_1, [(400, 0.15), (1300, 0.12), (2700, 0.08)], [(1.2, 1.4), (2.4, 2.7)], amp=0.035)
    path_ta_b1 = os.path.join(AUDIO_DIR, 'ta_bonafide_01.wav')
    sf.write(path_ta_b1, ta_b1, SAMPLE_RATE)
    manifest.append({'id': 'ta_bonafide_01', 'language': 'ta', 'label': 'bonafide', 'path': 'audio/ta_bonafide_01.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (Tamil retroflex formant profile) — sine-harmonic synthesis with f0 micro-jitter, not recorded/TTS speech'})

    ta_f0_2 = 130.0 + 6.0 * np.cos(2 * np.pi * 2.8 * t)
    ta_b2 = synthesize_bonafide(ta_f0_2, [(600, 0.16), (1600, 0.10)], [(1.6, 1.9)], amp=0.035)
    path_ta_b2 = os.path.join(AUDIO_DIR, 'ta_bonafide_02.wav')
    sf.write(path_ta_b2, ta_b2, SAMPLE_RATE)
    manifest.append({'id': 'ta_bonafide_02', 'language': 'ta', 'label': 'bonafide', 'path': 'audio/ta_bonafide_02.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (Tamil narrative cadence formant profile) — sine-harmonic synthesis, not recorded/TTS speech'})

    ta_s1 = synthesize_spoof(135.0, vocoder_freq1=7800.0, vocoder_freq2=7960.0, frame_rate=40.0)
    path_ta_s1 = os.path.join(AUDIO_DIR, 'ta_spoof_01.wav')
    sf.write(path_ta_s1, ta_s1, SAMPLE_RATE)
    manifest.append({'id': 'ta_spoof_01', 'language': 'ta', 'label': 'spoof', 'path': 'audio/ta_spoof_01.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (Tamil clone vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 40Hz frame glitch, not neural TTS audio'})

    ta_s2 = synthesize_spoof(142.0, vocoder_freq1=7780.0, vocoder_freq2=7920.0, frame_rate=45.0)
    path_ta_s2 = os.path.join(AUDIO_DIR, 'ta_spoof_02.wav')
    sf.write(path_ta_s2, ta_s2, SAMPLE_RATE)
    manifest.append({'id': 'ta_spoof_02', 'language': 'ta', 'label': 'spoof', 'path': 'audio/ta_spoof_02.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (Tamil VC vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 45Hz frame glitch, not neural TTS audio'})

    # 3. Hindi Dataset
    hi_f0_1 = 128.0 + 9.0 * np.sin(2 * np.pi * 1.8 * t)
    hi_b1 = synthesize_bonafide(hi_f0_1, [(500, 0.16), (1500, 0.12)], [(1.3, 1.5), (2.8, 3.0)], amp=0.035)
    path_hi_b1 = os.path.join(AUDIO_DIR, 'hi_bonafide_01.wav')
    sf.write(path_hi_b1, hi_b1, SAMPLE_RATE)
    manifest.append({'id': 'hi_bonafide_01', 'language': 'hi', 'label': 'bonafide', 'path': 'audio/hi_bonafide_01.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (Hindi dental/aspirated formant profile) — sine-harmonic synthesis with f0 micro-jitter, not recorded/TTS speech'})

    hi_f0_2 = 138.0 + 7.5 * np.cos(2 * np.pi * 2.2 * t)
    hi_b2 = synthesize_bonafide(hi_f0_2, [(650, 0.14), (1800, 0.11)], [(1.9, 2.2)], amp=0.035)
    path_hi_b2 = os.path.join(AUDIO_DIR, 'hi_bonafide_02.wav')
    sf.write(path_hi_b2, hi_b2, SAMPLE_RATE)
    manifest.append({'id': 'hi_bonafide_02', 'language': 'hi', 'label': 'bonafide', 'path': 'audio/hi_bonafide_02.wav', 'description': 'Synthetic bonafide-pattern acoustic fixture (Hindi continuous cadence formant profile) — sine-harmonic synthesis, not recorded/TTS speech'})

    hi_s1 = synthesize_spoof(140.0, vocoder_freq1=7830.0, vocoder_freq2=7950.0, frame_rate=40.0)
    path_hi_s1 = os.path.join(AUDIO_DIR, 'hi_spoof_01.wav')
    sf.write(path_hi_s1, hi_s1, SAMPLE_RATE)
    manifest.append({'id': 'hi_spoof_01', 'language': 'hi', 'label': 'spoof', 'path': 'audio/hi_spoof_01.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (Hindi TTS vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 40Hz frame glitch, not neural TTS audio'})

    hi_s2 = synthesize_spoof(150.0, vocoder_freq1=7790.0, vocoder_freq2=7930.0, frame_rate=50.0)
    path_hi_s2 = os.path.join(AUDIO_DIR, 'hi_spoof_02.wav')
    sf.write(path_hi_s2, hi_s2, SAMPLE_RATE)
    manifest.append({'id': 'hi_spoof_02', 'language': 'hi', 'label': 'spoof', 'path': 'audio/hi_spoof_02.wav', 'description': 'Synthetic deepfake-pattern acoustic fixture (Hindi VC vocoder artifact simulation) — algorithmic phase leakage (>7.5kHz) & 50Hz frame glitch, not neural TTS audio'})

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print(f'Generated {len(manifest)} audio files in {AUDIO_DIR}')
    print(f'Wrote manifest to {MANIFEST_PATH}')
    return manifest

if __name__ == '__main__':
    generate_all()
