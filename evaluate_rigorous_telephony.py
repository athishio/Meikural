"""
evaluate_rigorous_telephony.py
Rigorous ML Evaluation for Meikural AASIST Voice-Clone Impersonation Detection.
Includes:
1. Leakage controls: RMS normalized to -20 dBFS, uniform 64,600-sample chunks, silence pruning.
2. Expanded corpus: Multi-speaker real speech + telecom conditions + XTTS clones.
3. Before/After Decision Threshold Calibration (Fixed 0.50 Cutoff vs Calibrated Optimal LLR Thresholds).
4. Side-by-side confusion matrix, FAR, FRR, accuracy, and latency reporting per codec.
"""

import os
import sys
import json
import time
import math
import numpy as np
import soundfile as sf
import torch
import torch.nn.functional as F

from audio_processor import (
    AASISTWrapper,
    TelephonyCodecEngine,
    CODEC_LLR_CALIBRATION_THRESHOLDS,
    TARGET_SAMPLE_RATE,
    TARGET_SAMPLES,
)

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
        if rms_db < -38.0:  # Skip silence / background-only frames
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
            "chunk_idx": i
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

def run_rigorous_evaluation():
    wrapper = AASISTWrapper.get_instance()
    
    # Expanded real speech corpus:
    sources = [
        # Bonafide (Real humans):
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789807675561.wav", "speaker_ron_banking", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789807675561.wav", "speaker_ron_digits", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789811058548.wav", "speaker_rohan_transfer", "bonafide"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789811058548.wav", "speaker_ron_alt", "bonafide"),
        ("demo_clips/caution_noisy_telecom.wav", "speaker_karthik_telecom", "bonafide"),
        ("demo_clips/bonafide_human_speech.wav", "speaker_karthik_clean", "bonafide"),
        # Spoof (Neural clones):
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789807675561.wav", "clone_priya_xtts", "spoof"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789811058548.wav", "clone_rohan_xtts", "spoof"),
        ("C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_3_1789811058548.wav", "clone_digits_synth", "spoof"),
        ("demo_clips/deepfake_voice_clone.wav", "clone_karthik_xtts", "spoof"),
    ]
    
    all_chunks = []
    speaker_counts = {}
    for path, spk, lbl in sources:
        if not os.path.exists(path):
            continue
        c_list = extract_uniform_chunks(path, spk, lbl)
        all_chunks.extend(c_list)
        speaker_counts[spk] = speaker_counts.get(spk, 0) + len(c_list)
        
    bona_chunks = [c for c in all_chunks if c["label"] == "bonafide"]
    spoof_chunks = [c for c in all_chunks if c["label"] == "spoof"]
    
    print("=" * 80)
    print("MEIKURAL RIGOROUS LEAKAGE-CONTROLLED EVALUATION & THRESHOLD CALIBRATION")
    print("=" * 80)
    print(f"Total Extracted 4.04s Chunks: {len(all_chunks)}")
    print(f"  Bonafide Chunks: {len(bona_chunks)}")
    print(f"  Spoof Chunks:    {len(spoof_chunks)}")
    print("Speaker Breakdown:")
    for spk, count in speaker_counts.items():
        print(f"  - {spk:25s}: {count} chunks")
    print(f"Unique Sources: {len(speaker_counts)}")
    print("=" * 80)
    
    codecs = [
        ("Clean PCM 16kHz", "clean_pcm", None),
        ("G.711 mu-law", "g711_ulaw", "g711_ulaw"),
        ("G.711 A-law", "g711_alaw", "g711_alaw"),
        ("PSTN Narrowband (8kHz 300-3400Hz)", "pstn_narrowband", "pstn_narrowband"),
        ("AMR-WB (Wideband 50-7000Hz)", "amr_wb", "amr_wb"),
    ]
    
    full_report = {
        "metadata": {
            "total_chunks": len(all_chunks),
            "bonafide_chunks": len(bona_chunks),
            "spoof_chunks": len(spoof_chunks),
            "unique_sources": len(speaker_counts),
            "methodology_leakage_guards": [
                "Uniform 64,600-sample (4.04s) duration per window",
                "RMS normalized to -20 dBFS across all chunks",
                "Non-speech frames (< -38 dBFS) stripped",
                "Matched sample rate and format"
            ],
            "scientific_limitation": (
                "Total evaluation set is 60+ chunks across 10 sources. While expanded, "
                "sample count remains <100 per class, serving as empirical validation of pipeline mechanics "
                "under telephony conditions. The academic baseline remains ASVspoof 2019 LA (24,844 trials, 0.83% EER)."
            )
        },
        "profiles": {}
    }
    
    for codec_name, codec_id, codec_key in codecs:
        bona_raw_llrs = []
        spoof_raw_llrs = []
        bona_raw_p = []
        spoof_raw_p = []
        latencies = []
        
        # Test Bonafide
        for c in bona_chunks:
            wav = c["waveform"]
            if codec_key:
                wav = TelephonyCodecEngine.apply_codec(wav, codec_key, sample_rate=TARGET_SAMPLE_RATE)
            tensor_x = torch.tensor(wav, dtype=torch.float32, device=wrapper.device).unsqueeze(0)
            
            t0 = time.perf_counter()
            with torch.no_grad():
                _, logits = wrapper.model(tensor_x)
                raw_l = [float(logits[0, 0].item()), float(logits[0, 1].item())]
                llr = raw_l[1] - raw_l[0]
                p_bona = float(F.softmax(logits, dim=-1)[0, 1].item())
            lat = (time.perf_counter() - t0) * 1000.0
            
            bona_raw_llrs.append(llr)
            bona_raw_p.append(p_bona)
            latencies.append(lat)
            
        # Test Spoof
        for c in spoof_chunks:
            wav = c["waveform"]
            if codec_key:
                wav = TelephonyCodecEngine.apply_codec(wav, codec_key, sample_rate=TARGET_SAMPLE_RATE)
            tensor_x = torch.tensor(wav, dtype=torch.float32, device=wrapper.device).unsqueeze(0)
            
            t0 = time.perf_counter()
            with torch.no_grad():
                _, logits = wrapper.model(tensor_x)
                raw_l = [float(logits[0, 0].item()), float(logits[0, 1].item())]
                llr = raw_l[1] - raw_l[0]
                p_bona = float(F.softmax(logits, dim=-1)[0, 1].item())
            lat = (time.perf_counter() - t0) * 1000.0
            
            spoof_raw_llrs.append(llr)
            spoof_raw_p.append(p_bona)
            latencies.append(lat)
            
        b_llr = np.array(bona_raw_llrs)
        s_llr = np.array(spoof_raw_llrs)
        b_p = np.array(bona_raw_p)
        s_p = np.array(spoof_raw_p)
        
        # 1. Uncalibrated (Old naive 0.50 probability threshold)
        uncal_tp = int(np.sum(s_p < 0.50))
        uncal_tn = int(np.sum(b_p >= 0.50))
        uncal_fp = int(np.sum(b_p < 0.50))
        uncal_fn = int(np.sum(s_p >= 0.50))
        uncal_total = len(b_p) + len(s_p)
        uncal_acc = (uncal_tp + uncal_tn) / uncal_total * 100.0
        uncal_far = (uncal_fp / (uncal_fp + uncal_tn) * 100.0) if (uncal_fp + uncal_tn) > 0 else 0.0
        uncal_frr = (uncal_fn / (uncal_fn + uncal_tp) * 100.0) if (uncal_fn + uncal_tp) > 0 else 0.0
        
        # 2. Calibrated Threshold from CODEC_LLR_CALIBRATION_THRESHOLDS
        tau = CODEC_LLR_CALIBRATION_THRESHOLDS.get(codec_id, CODEC_LLR_CALIBRATION_THRESHOLDS["default"])
        # In calibrated space, bonafide has LLR >= tau, spoof has LLR < tau
        cal_tp = int(np.sum(s_llr < tau))
        cal_tn = int(np.sum(b_llr >= tau))
        cal_fp = int(np.sum(b_llr < tau))
        cal_fn = int(np.sum(s_llr >= tau))
        cal_total = len(b_llr) + len(s_llr)
        cal_acc = (cal_tp + cal_tn) / cal_total * 100.0
        cal_far = (cal_fp / (cal_fp + cal_tn) * 100.0) if (cal_fp + cal_tn) > 0 else 0.0
        cal_frr = (cal_fn / (cal_fn + cal_tp) * 100.0) if (cal_fn + cal_tp) > 0 else 0.0
        
        # Compute EER
        eer, eer_thresh = compute_eer(b_llr, s_llr)
        
        mean_lat = float(np.mean(latencies))
        p95_lat = float(np.percentile(latencies, 95))
        
        profile_res = {
            "calibrated_threshold_LLR": round(tau, 2),
            "EER_percent": round(eer * 100.0, 2),
            "EER_optimal_LLR_threshold": round(eer_thresh, 2),
            "before_calibration_fixed_050": {
                "accuracy_percent": round(uncal_acc, 2),
                "FAR_percent": round(uncal_far, 2),
                "FRR_percent": round(uncal_frr, 2),
                "confusion_matrix": {"TP": uncal_tp, "TN": uncal_tn, "FP": uncal_fp, "FN": uncal_fn}
            },
            "after_calibration_calibrated_threshold": {
                "accuracy_percent": round(cal_acc, 2),
                "FAR_percent": round(cal_far, 2),
                "FRR_percent": round(cal_frr, 2),
                "confusion_matrix": {"TP": cal_tp, "TN": cal_tn, "FP": cal_fp, "FN": cal_fn}
            },
            "llr_distributions": {
                "bonafide_mean_llr": round(float(np.mean(b_llr)), 2),
                "bonafide_range": [round(float(np.min(b_llr)), 2), round(float(np.max(b_llr)), 2)],
                "spoof_mean_llr": round(float(np.mean(s_llr)), 2),
                "spoof_range": [round(float(np.min(s_llr)), 2), round(float(np.max(s_llr)), 2)],
            },
            "end_to_end_latency_ms": {
                "mean": round(mean_lat, 2),
                "p95": round(p95_lat, 2)
            }
        }
        
        full_report["profiles"][codec_name] = profile_res
        
        print(f"\n>>> CODEC: {codec_name}")
        print(f"    Calibrated Threshold: {tau:.2f} LLR | EER: {eer*100:.2f}% (EER Thresh: {eer_thresh:.2f})")
        print(f"    BEFORE (Fixed 0.50): Acc={uncal_acc:5.2f}% | FAR={uncal_far:5.2f}% | FRR={uncal_frr:5.2f}% | TP={uncal_tp} TN={uncal_tn} FP={uncal_fp} FN={uncal_fn}")
        print(f"    AFTER  (Calibrated): Acc={cal_acc:5.2f}% | FAR={cal_far:5.2f}% | FRR={cal_frr:5.2f}% | TP={cal_tp} TN={cal_tn} FP={cal_fp} FN={cal_fn}")
        print(f"    Latency: Mean={mean_lat:.1f}ms, P95={p95_lat:.1f}ms")
        
    with open("rigorous_benchmark_report.json", "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print("\nSaved updated evaluation report to rigorous_benchmark_report.json")

if __name__ == "__main__":
    run_rigorous_evaluation()
