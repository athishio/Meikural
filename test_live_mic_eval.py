import glob
import os
import math
import numpy as np
import soundfile as sf
import scipy.signal as signal
from audio_processor import AASISTWrapper, score_audio_chunk_detailed, CODEC_LLR_CALIBRATION_THRESHOLDS

def encode_sample_to_mulaw(sample):
    BIAS = 0x84
    CLIP = 32635
    sign = (sample >> 8) & 0x80
    if sign != 0:
        sample = -sample
    if sample > CLIP:
        sample = CLIP
    sample += BIAS
    exponent = 7
    expMask = 0x4000
    while (sample & expMask) == 0 and exponent > 0:
        exponent -= 1
        expMask >>= 1
    mantissa = (sample >> (exponent + 3)) & 0x0F
    ulawByte = ~(sign | (exponent << 4) | mantissa)
    return ulawByte & 0xFF

def simulate_browser_mic_stream(pcm_float, in_sr=48000):
    resample_ratio = in_sr / 8000.0
    mu_law_samples = []
    src_idx = 0.0
    while src_idx < len(pcm_float):
        i0 = int(math.floor(src_idx))
        i1 = min(i0 + 1, len(pcm_float) - 1)
        frac = src_idx - i0
        s = pcm_float[i0] + frac * (pcm_float[i1] - pcm_float[i0])
        clamped = max(-1.0, min(1.0, s))
        pcm16 = int(round(clamped * 32768)) if clamped < 0 else int(round(clamped * 32767))
        mu_law_samples.append(encode_sample_to_mulaw(pcm16))
        src_idx += resample_ratio
    return bytes(mu_law_samples)

def decode_mulaw_backend(ulaw_bytes):
    u = np.frombuffer(ulaw_bytes, dtype=np.uint8).astype(np.int32)
    u_inv = ~u & 0xFF
    sign = (u_inv & 0x80)
    exponent = (u_inv >> 4) & 0x07
    mantissa = u_inv & 0x0F
    sample = ((mantissa << 3) + 0x84) << exponent
    sample = sample - 0x84
    return np.where(sign != 0, -sample, sample).astype(np.int16)

def main():
    files = [
        ('demo_clips/bonafide_human_speech.wav', 'BONAFIDE'),
        ('demo_clips/deepfake_voice_clone.wav', 'SPOOF'),
        ('demo_clips/caution_noisy_telecom.wav', 'BONAFIDE_NOISY'),
        ('demo_clips/challenge_response_digits.wav', 'BONAFIDE'),
    ]
    for p in sorted(glob.glob('multilingual_real_test/*.wav')):
        label = 'SPOOF' if 'spoof' in p else 'BONAFIDE'
        files.append((p.replace('\\', '/'), label))

    print(f"{'File':<36} | {'Type':<14} | {'Direct_Score':<12} | {'LiveMic_Score':<13} | {'LiveMic_LLR':<12} | {'LiveMic_Verdict':<15}")
    print("-" * 102)

    for fpath, label in files:
        data, sr = sf.read(fpath)
        if data.ndim > 1:
            data = data.mean(axis=1)

        d_score = score_audio_chunk_detailed(fpath, simulate_codec='g711_ulaw')['passive_score']

        # Live mic pipeline simulation (browser resample -> encode -> backend decode -> repeat 2 -> score with g711_ulaw)
        ulaw_bytes = simulate_browser_mic_stream(data, in_sr=sr)
        pcm_8k = decode_mulaw_backend(ulaw_bytes)
        pcm_16k = np.repeat(pcm_8k, 2).tobytes()
        res_mic = score_audio_chunk_detailed(pcm_16k, simulate_codec='g711_ulaw')

        print(f"{os.path.basename(fpath):<36} | {label:<14} | {d_score:<12.4f} | {res_mic['passive_score']:<13.4f} | {res_mic['raw_llr']:<12.4f} | {res_mic['verdict']:<15}")

if __name__ == '__main__':
    main()
