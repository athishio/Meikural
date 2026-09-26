import os
import glob
import math
import json
import numpy as np
import soundfile as sf
import torch
from audio_processor import AASISTWrapper, TARGET_SAMPLE_RATE, TARGET_SAMPLES
from evaluate_live_mic_calibration import (
    extract_uniform_chunks,
    simulate_browser_mic_stream,
    decode_mulaw_backend,
)

sources = [
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789807675561.wav", "speaker_ron_banking", "bonafide"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789807675561.wav", "speaker_ron_digits", "bonafide"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789811058548.wav", "speaker_rohan_transfer", "bonafide"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789811058548.wav", "speaker_ron_alt", "bonafide"),
    ("demo_clips/caution_noisy_telecom.wav", "speaker_karthik_telecom", "bonafide"),
    ("demo_clips/bonafide_human_speech.wav", "speaker_karthik_clean", "bonafide"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789807675561.wav", "clone_priya_xtts", "spoof"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789811058548.wav", "clone_rohan_xtts", "spoof"),
    ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_3_1789811058548.wav", "clone_digits_synth", "spoof"),
    ("demo_clips/deepfake_voice_clone.wav", "clone_karthik_xtts", "spoof"),
]

def main():
    wrapper = AASISTWrapper.get_instance()
    all_chunks = []
    for path, spk, lbl in sources:
        c_list = extract_uniform_chunks(path, spk, lbl)
        all_chunks.extend(c_list)

    speaker_res = {}
    for c in all_chunks:
        raw_float = c['waveform']
        ulaw_bytes = simulate_browser_mic_stream(raw_float, c['sr'])
        pcm_8k = decode_mulaw_backend(ulaw_bytes)
        pcm_16k = np.repeat(pcm_8k, 2).astype(np.float32) / 32768.0

        padded_x = np.zeros(TARGET_SAMPLES, dtype=np.float32)
        if len(pcm_16k) >= TARGET_SAMPLES:
            padded_x = pcm_16k[:TARGET_SAMPLES]
        else:
            reps = int(TARGET_SAMPLES / len(pcm_16k)) + 1
            padded_x = np.tile(pcm_16k, reps)[:TARGET_SAMPLES]

        tensor_x = torch.tensor(padded_x, dtype=torch.float32, device=wrapper.device).unsqueeze(0)
        with torch.no_grad():
            _, logits = wrapper.model(tensor_x)
            logit_spoof = float(logits[0, 0].item())
            logit_bonafide = float(logits[0, 1].item())
            llr = logit_bonafide - logit_spoof

        spk = c['speaker']
        if spk not in speaker_res:
            speaker_res[spk] = {'label': c['label'], 'llrs': []}
        speaker_res[spk]['llrs'].append(llr)

    print(f"{'Speaker':<25} | {'Label':<10} | {'Chunks':<6} | {'Mean_LLR':<10} | {'Std_LLR':<10} | {'Min_LLR':<10} | {'Max_LLR':<10}")
    print("-" * 95)
    for spk, data in speaker_res.items():
        llrs = np.array(data['llrs'])
        print(f"{spk:<25} | {data['label']:^10} | {len(llrs):^6} | {np.mean(llrs):^10.4f} | {np.std(llrs):^10.4f} | {np.min(llrs):^10.4f} | {np.max(llrs):^10.4f}")

if __name__ == '__main__':
    main()
