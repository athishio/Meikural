"""
evaluate_live_mic_calibration.py
================================
Evaluates and calibrates decision thresholds specifically for Meikural's
Live-Microphone WebSocket ingestion path (/ws/audio with 20ms G.711 mu-law frames).

Controls:
1. Exact emulation of browser-side Web Audio ScriptProcessor:
   - Resampling from native sample rate to 8000Hz using linear interpolation
   - ITU-T G.711 mu-law 8-bit companding & quantization
2. Exact emulation of backend ingestion:
   - ITU-T G.711 expansion back to 16-bit linear PCM
   - Sample doubling upsampling to 16kHz
3. Evaluation across the full multi-speaker real human + XTTS clone corpus
4. ROC curve analysis, EER computation, and optimal operating threshold determination
5. Before vs. After comparison: Accuracy, FAR, FRR on live-mic audio
"""

import os
import sys
import json
import math
import numpy as np
import soundfile as sf
import torch

from audio_processor import (
    AASISTWrapper,
    CODEC_LLR_CALIBRATION_THRESHOLDS,
    TARGET_SAMPLE_RATE,
    TARGET_SAMPLES,
)

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

def simulate_browser_mic_stream(pcm_float, in_sr):
    """Emulates browser useDashboardData.ts onaudioprocess linear resampler & mu-law encoder."""
    resample_ratio = float(in_sr) / 8000.0
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
    """Emulates app.py lines 1511-1518 ITU-T G.711 mu-law decoder."""
    u = np.frombuffer(ulaw_bytes, dtype=np.uint8).astype(np.int32)
    u_inv = ~u & 0xFF
    sign = (u_inv & 0x80)
    exponent = (u_inv >> 4) & 0x07
    mantissa = u_inv & 0x0F
    sample = ((mantissa << 3) + 0x84) << exponent
    sample = sample - 0x84
    return np.where(sign != 0, -sample, sample).astype(np.int16)

def extract_uniform_chunks(audio_path, speaker_id, label, chunk_samples=TARGET_SAMPLES, rms_target=0.10):
    if not os.path.exists(audio_path):
        return []
    data, sr = sf.read(audio_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    if sr != TARGET_SAMPLE_RATE:
        import scipy.signal as signal
        num_target = int(round(len(data) * TARGET_SAMPLE_RATE / sr))
        data = signal.resample(data, num_target)

    data = data.astype(np.float32)
    chunks = []
    n_chunks = len(data) // chunk_samples
    for i in range(n_chunks):
        c = data[i * chunk_samples : (i + 1) * chunk_samples]
        rms = np.sqrt(np.mean(c**2) + 1e-12)
        rms_db = 20.0 * np.log10(rms)
        if rms_db < -38.0:
            continue
        if rms > 0:
            c_norm = c * (rms_target / rms)
            c_norm = np.clip(c_norm, -1.0, 1.0)
        else:
            c_norm = c
        chunks.append({
            "waveform": c_norm,
            "speaker": speaker_id,
            "label": label,
            "source_file": os.path.basename(audio_path),
            "chunk_idx": i,
            "sr": TARGET_SAMPLE_RATE,
        })
    return chunks

def compute_det_curve(target_scores, nontarget_scores):
    n_scores = target_scores.size + nontarget_scores.size
    all_scores = np.concatenate((target_scores, nontarget_scores))
    labels = np.concatenate((np.ones(target_scores.size), np.zeros(nontarget_scores.size)))

    indices = np.argsort(all_scores, kind='mergesort')
    labels = labels[indices]

    tar_trial_sums = np.cumsum(labels)
    nontarget_trial_sums = nontarget_scores.size - (np.arange(1, n_scores + 1) - tar_trial_sums)

    frr = np.concatenate((np.atleast_1d(0), tar_trial_sums / target_scores.size))
    far = np.concatenate((np.atleast_1d(1), nontarget_trial_sums / nontarget_scores.size))
    thresholds = np.concatenate((np.atleast_1d(all_scores[indices[0]] - 0.001), all_scores[indices]))

    return frr, far, thresholds

def compute_eer(target_scores, nontarget_scores):
    frr, far, thresholds = compute_det_curve(target_scores, nontarget_scores)
    abs_diffs = np.abs(frr - far)
    min_index = np.argmin(abs_diffs)
    eer = np.mean((frr[min_index], far[min_index]))
    return float(eer), float(thresholds[min_index])

def run_evaluation():
    sources = [
        # Bonafide (Real humans)
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789807675561.wav", "speaker_ron_banking", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789807675561.wav", "speaker_ron_digits", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789811058548.wav", "speaker_rohan_transfer", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789811058548.wav", "speaker_ron_alt", "bonafide"),
        ("demo_clips/caution_noisy_telecom.wav", "speaker_karthik_telecom", "bonafide"),
        ("demo_clips/bonafide_human_speech.wav", "speaker_karthik_clean", "bonafide"),
        # Spoofs (XTTS clones & synthesized)
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789807675561.wav", "clone_priya_xtts", "spoof"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789811058548.wav", "clone_rohan_xtts", "spoof"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_3_1789811058548.wav", "clone_digits_synth", "spoof"),
        ("demo_clips/deepfake_voice_clone.wav", "clone_karthik_xtts", "spoof"),
    ]

    all_chunks = []
    for path, spk, lbl in sources:
        c_list = extract_uniform_chunks(path, spk, lbl)
        all_chunks.extend(c_list)

    bona_chunks = [c for c in all_chunks if c["label"] == "bonafide"]
    spoof_chunks = [c for c in all_chunks if c["label"] == "spoof"]

    print("=" * 80)
    print("LIVE-MIC SIGNAL PATH EVALUATION & THRESHOLD CALIBRATION")
    print("=" * 80)
    print(f"Total Evaluated Chunks: {len(all_chunks)} ({len(bona_chunks)} Bonafide, {len(spoof_chunks)} Spoof)")

    wrapper = AASISTWrapper.get_instance()

    # Pass every chunk through the real browser live-mic streaming chain:
    # 1. Linear interpolation resample to 8000Hz + ITU-T mu-law encode
    # 2. Backend decode to 8kHz PCM16 + 2x repeat upsample to 16kHz
    live_mic_data = []
    for c in all_chunks:
        raw_float = c["waveform"]
        ulaw_bytes = simulate_browser_mic_stream(raw_float, c["sr"])
        pcm_8k = decode_mulaw_backend(ulaw_bytes)
        pcm_16k = np.repeat(pcm_8k, 2).astype(np.float32) / 32768.0

        # Run through AASIST
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

        live_mic_data.append({
            "speaker": c["speaker"],
            "label": c["label"],
            "llr": llr,
            "logit_spoof": logit_spoof,
            "logit_bonafide": logit_bonafide,
        })

    bona_llrs = np.array([d["llr"] for d in live_mic_data if d["label"] == "bonafide"])
    spoof_llrs = np.array([d["llr"] for d in live_mic_data if d["label"] == "spoof"])

    print("\nLLR Distribution on Live-Mic Pipeline:")
    print(f"  Bonafide LLRs (Target): Mean={np.mean(bona_llrs):.4f}, Std={np.std(bona_llrs):.4f}, Min={np.min(bona_llrs):.4f}, Max={np.max(bona_llrs):.4f}")
    print(f"  Spoof LLRs (Non-target): Mean={np.mean(spoof_llrs):.4f}, Std={np.std(spoof_llrs):.4f}, Min={np.min(spoof_llrs):.4f}, Max={np.max(spoof_llrs):.4f}")

    # EER Computation (in LLR space, where lower LLR = more spoof-like)
    # In compute_det_curve: target_scores are bonafide, nontarget_scores are spoof
    # For LLR, bonafide has HIGHER LLR, spoof has LOWER LLR.
    # To compute standard detection error: score = -LLR (higher score = more spoof-like)
    bona_scores = -bona_llrs
    spoof_scores = -spoof_llrs
    eer, eer_threshold = compute_eer(target_scores=bona_scores, nontarget_scores=spoof_scores)
    optimal_llr_tau = -eer_threshold

    print(f"\nEmpirical EER on Live-Mic Signal Path: {eer*100:.2f}%")
    print(f"Optimal Live-Mic Calibration Threshold (tau): {optimal_llr_tau:.4f}")

    # Evaluate Before (using existing g711_ulaw threshold = -8.64):
    existing_tau = CODEC_LLR_CALIBRATION_THRESHOLDS["g711_ulaw"]
    def eval_at_tau(tau, label_str):
        preds = []
        for d in live_mic_data:
            centered_llr = d["llr"] - tau
            try:
                p_spoof = 1.0 / (1.0 + math.exp(centered_llr))
            except OverflowError:
                p_spoof = 0.0 if centered_llr > 0 else 1.0
            
            # Binary decision at 0.50 risk cutoff
            is_pred_spoof = p_spoof >= 0.50
            preds.append({
                "label": d["label"],
                "p_spoof": p_spoof,
                "is_pred_spoof": is_pred_spoof,
            })
        
        tp = sum(1 for p in preds if p["label"] == "spoof" and p["is_pred_spoof"])
        fn = sum(1 for p in preds if p["label"] == "spoof" and not p["is_pred_spoof"])
        tn = sum(1 for p in preds if p["label"] == "bonafide" and not p["is_pred_spoof"])
        fp = sum(1 for p in preds if p["label"] == "bonafide" and p["is_pred_spoof"])

        acc = (tp + tn) / len(preds)
        far = fp / (fp + tn) if (fp + tn) > 0 else 0.0  # False alarm on bonafide
        frr = fn / (fn + tp) if (fn + tp) > 0 else 0.0  # False reject on spoof (missed clone)

        print(f"\n--- Performance: {label_str} (tau = {tau:.4f}) ---")
        print(f"  Accuracy:     {acc*100:.2f}% ({tp+tn}/{len(preds)})")
        print(f"  FAR (Bonafide False Alarms): {far*100:.2f}% ({fp}/{fp+tn})")
        print(f"  FRR (Missed Clones):         {frr*100:.2f}% ({fn}/{fn+tp})")
        print(f"  Confusion Matrix: TP={tp}, FN={fn}, TN={tn}, FP={fp}")
        return {"tau": tau, "acc": acc, "far": far, "frr": frr, "tp": tp, "fn": fn, "tn": tn, "fp": fp}

    before_res = eval_at_tau(existing_tau, "Before Recalibration (Using Simulated G.711 Tau)")
    after_res = eval_at_tau(optimal_llr_tau, "After Recalibration (Using Calibrated Live-Mic Tau)")

    # Save detailed report
    report = {
        "metadata": {
            "total_chunks": len(all_chunks),
            "bonafide_chunks": len(bona_chunks),
            "spoof_chunks": len(spoof_chunks),
        },
        "stats": {
            "bonafide_llr_mean": float(np.mean(bona_llrs)),
            "bonafide_llr_std": float(np.std(bona_llrs)),
            "spoof_llr_mean": float(np.mean(spoof_llrs)),
            "spoof_llr_std": float(np.std(spoof_llrs)),
            "eer": float(eer),
            "optimal_llr_tau": float(optimal_llr_tau),
            "existing_g711_tau": float(existing_tau),
        },
        "before_calibration": before_res,
        "after_calibration": after_res,
    }

    with open("live_mic_calibration_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("\nSaved full evaluation report to live_mic_calibration_report.json")

if __name__ == "__main__":
    run_evaluation()
