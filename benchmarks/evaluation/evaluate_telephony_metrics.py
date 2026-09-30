"""
Comprehensive evaluation script for Meikural AASIST model under telephony codecs.
Tests clean vs G.711 mu-law, G.711 A-law, and PSTN narrowband codecs.
Computes:
- Accuracy (%)
- Equal Error Rate (EER %)
- Log-Likelihood Ratio / Detection Scores
- Inference Latency (ms)
"""

import os
import sys
import glob
import time
import numpy as np
import soundfile as sf
import torch
import torch.nn.functional as F

from audio_processor import AASISTWrapper, TelephonyCodecEngine, TARGET_SAMPLE_RATE

def compute_det_curve(target_scores, nontarget_scores):
    """
    Computes false rejection rate (FRR) and false acceptance rate (FAR).
    target_scores: scores for bonafide class (higher score = more bonafide)
    nontarget_scores: scores for spoof class
    """
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
    """
    Computes Equal Error Rate (EER) and the optimal threshold.
    """
    frr, far, thresholds = compute_det_curve(target_scores, nontarget_scores)
    abs_diffs = np.abs(frr - far)
    min_index = np.argmin(abs_diffs)
    eer = np.mean((frr[min_index], far[min_index]))
    return float(eer), float(thresholds[min_index])

def run_evaluation():
    wrapper = AASISTWrapper.get_instance()
    
    # Ground truth dataset:
    # Bonafide (real human):
    # - uploaded_media_0_1789807675561.wav (Real human voice)
    # - uploaded_media_1_1789807675561.wav (Real human voice)
    # - uploaded_media_1_1789811058548.wav (Real human speech)
    # - demo_clips/caution_noisy_telecom.wav (Real noisy human speech)
    # Spoof / Synthetic:
    # - demo_clips/deepfake_voice_clone.wav
    # - uploaded_media_2_1789807675561.wav (XTTS synthetic clone)
    # - uploaded_media_2_1789811058548.wav (XTTS clone)
    # - uploaded_media_3_1789811058548.wav (Challenge digits synthetic)
    # - multilingual_real_test/en_spoof_01.wav
    # - multilingual_real_test/en_spoof_02.wav
    # - multilingual_real_test/hi_spoof_01.wav
    # - multilingual_real_test/hi_spoof_02.wav
    # - multilingual_real_test/ta_spoof_01.wav
    # - multilingual_real_test/ta_spoof_02.wav
    
    bonafide_files = [
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_0_1789807675561.wav",
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789807675561.wav",
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_1_1789811058548.wav",
        "demo_clips/caution_noisy_telecom.wav",
    ]
    
    spoof_files = [
        "demo_clips/deepfake_voice_clone.wav",
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789807675561.wav",
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_2_1789811058548.wav",
        "C:/Users/athis/.gemini/antigravity/brain/e836648b-f1a7-469b-b14f-498d7c9a1d78/.user_uploaded/uploaded_media_3_1789811058548.wav",
        "multilingual_real_test/en_spoof_01.wav",
        "multilingual_real_test/en_spoof_02.wav",
        "multilingual_real_test/hi_spoof_01.wav",
        "multilingual_real_test/hi_spoof_02.wav",
        "multilingual_real_test/ta_spoof_01.wav",
        "multilingual_real_test/ta_spoof_02.wav",
    ]

    codecs = [
        ("Clean PCM 16kHz", None),
        ("G.711 mu-law", "g711_ulaw"),
        ("G.711 A-law", "g711_alaw"),
        ("PSTN Narrowband (8kHz bandpass)", "pstn_narrowband"),
        ("AMR Wideband", "amr_wb")
    ]

    results = {}

    print("=" * 80)
    print("MEIKURAL AASIST TELEPHONY CODEC BENCHMARK EVALUATION")
    print("=" * 80)

    for codec_title, codec_arg in codecs:
        bonafide_scores = []
        bonafide_latencies = []
        spoof_scores = []
        spoof_latencies = []

        # Evaluate Bonafide
        for bf in bonafide_files:
            if not os.path.exists(bf):
                continue
            t0 = time.perf_counter()
            tensor_x, _, _ = wrapper.preprocess_waveform(bf, simulate_codec=codec_arg)
            with torch.no_grad():
                _, logits = wrapper.model(tensor_x)
                probs = F.softmax(logits, dim=-1)
                spoof_prob = float(probs[0, 0].item())
                # Bonafide score = 1.0 - spoof_prob (or logit difference: logit_bonafide - logit_spoof)
                bona_score = float(probs[0, 1].item())
            lat = (time.perf_counter() - t0) * 1000.0
            bonafide_scores.append(bona_score)
            bonafide_latencies.append(lat)

        # Evaluate Spoof
        for sf_path in spoof_files:
            if not os.path.exists(sf_path):
                continue
            t0 = time.perf_counter()
            tensor_x, _, _ = wrapper.preprocess_waveform(sf_path, simulate_codec=codec_arg)
            with torch.no_grad():
                _, logits = wrapper.model(tensor_x)
                probs = F.softmax(logits, dim=-1)
                spoof_prob = float(probs[0, 0].item())
                bona_score = float(probs[0, 1].item())
            lat = (time.perf_counter() - t0) * 1000.0
            spoof_scores.append(bona_score)
            spoof_latencies.append(lat)

        bona_arr = np.array(bonafide_scores)
        spoof_arr = np.array(spoof_scores)

        # Equal Error Rate:
        eer, opt_thresh = compute_eer(bona_arr, spoof_arr)
        
        # Accuracy at threshold = 0.50 (where bona_score >= 0.5 is Bonafide, < 0.5 is Spoof)
        correct_bona = np.sum(bona_arr >= 0.50)
        correct_spoof = np.sum(spoof_arr < 0.50)
        total = len(bona_arr) + len(spoof_arr)
        accuracy_50 = (correct_bona + correct_spoof) / total * 100.0

        # Accuracy at optimal EER threshold
        correct_bona_opt = np.sum(bona_arr >= opt_thresh)
        correct_spoof_opt = np.sum(spoof_arr < opt_thresh)
        accuracy_opt = (correct_bona_opt + correct_spoof_opt) / total * 100.0

        all_latencies = bonafide_latencies + spoof_latencies
        mean_latency = float(np.mean(all_latencies))
        p95_latency = float(np.percentile(all_latencies, 95))

        results[codec_title] = {
            "bonafide_mean_score": float(np.mean(bona_arr)),
            "spoof_mean_score": float(np.mean(spoof_arr)),
            "EER_percent": round(eer * 100.0, 2),
            "EER_threshold": round(opt_thresh, 4),
            "Accuracy_standard_50": round(accuracy_50, 2),
            "Accuracy_optimal": round(accuracy_opt, 2),
            "Mean_Latency_ms": round(mean_latency, 2),
            "P95_Latency_ms": round(p95_latency, 2),
            "Samples_evaluated": total
        }

        print(f"\nProfile: {codec_title}")
        print(f"  Bonafide Samples: {len(bona_arr)}, Spoof Samples: {len(spoof_arr)}")
        print(f"  Mean Bonafide Confidence: {np.mean(bona_arr)*100:.1f}%, Mean Spoof Confidence: {np.mean(1-spoof_arr)*100:.1f}%")
        print(f"  EER: {eer * 100:.2f}% | Opt Thresh: {opt_thresh:.4f}")
        print(f"  Accuracy (at 0.50): {accuracy_50:.1f}% | Accuracy (at EER thresh): {accuracy_opt:.1f}%")
        print(f"  Latency: Mean {mean_latency:.1f}ms (P95: {p95_latency:.1f}ms)")

    import json
    with open("telephony_benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nResults saved to telephony_benchmark_results.json")

if __name__ == "__main__":
    run_evaluation()
