# tests/multilingual/validate_multilingual.py
"""
validate_multilingual.py - Multilingual Acoustic Validation Suite for Meikural
=============================================================================
Verifies language-agnostic deepfake detection across English, Tamil, and Hindi.
AASIST operates directly on raw 16kHz waveforms via SincNet filterbanks (0-8 kHz),
extracting spectral-temporal artifacts (neural vocoder phase inconsistencies,
frame boundary glitches) rather than phonological or lexical features.

Metrics evaluated per language:
- Accuracy (%)
- False Acceptance Rate (FAR, %) = Spoof accepted as bonafide / Total spoof
- False Rejection Rate (FRR, %) = Bonafide rejected as spoof / Total bonafide
- Average Inference Latency (ms)
"""

import os
import sys
import json
import time
import unittest
from typing import Dict, List, Any

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import audio_processor
from tests.multilingual import generate_dataset

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(TEST_DIR, "dataset_manifest.json")
RESULTS_PATH = os.path.join(TEST_DIR, "multilingual_benchmark_results.json")


def run_multilingual_benchmark() -> Dict[str, Any]:
    """
    Executes full multilingual validation pass across Tamil, Hindi, and English evaluation sets.
    Returns structured results dictionary.
    """
    if not os.path.exists(MANIFEST_PATH):
        print("Manifest not found. Generating multilingual dataset...")
        generate_dataset.generate_all()

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Initialize model singleton
    wrapper = audio_processor.AASISTWrapper.get_instance()

    detailed_evals = []
    by_lang = {"en": [], "ta": [], "hi": []}

    print("=" * 80)
    print("MEIKURAL MULTILINGUAL ACOUSTIC VALIDATION SUITE (English · Tamil · Hindi)")
    print("=" * 80)

    for item in manifest:
        clip_path = os.path.join(TEST_DIR, item["path"])
        if not os.path.exists(clip_path):
            generate_dataset.generate_all()

        t0 = time.perf_counter()
        result = wrapper.score_detailed(clip_path)
        lat_ms = (time.perf_counter() - t0) * 1000.0

        score = result["passive_score"]
        # Ground truth mapping
        gt = item["label"]
        # Meikural thresholds: <= 0.35 bonafide, >= 0.65 spoof
        pred = result["verdict"]

        is_correct = (gt == "bonafide" and pred == "bonafide") or (gt == "spoof" and pred == "spoof")
        is_fa = (gt == "spoof" and pred == "bonafide")
        is_fr = (gt == "bonafide" and pred == "spoof")

        eval_record = {
            "id": item["id"],
            "language": item["language"],
            "ground_truth": gt,
            "predicted_verdict": pred,
            "passive_score": score,
            "correct": is_correct,
            "false_acceptance": is_fa,
            "false_rejection": is_fr,
            "latency_ms": round(lat_ms, 2),
            "description": item.get("description", "")
        }
        detailed_evals.append(eval_record)
        by_lang[item["language"]].append(eval_record)

    # Aggregate metrics
    summary = {}
    lang_names = {"en": "English (Control)", "ta": "Tamil (Regional)", "hi": "Hindi (Regional)"}

    total_samples_all = len(detailed_evals)
    total_correct_all = sum(1 for e in detailed_evals if e["correct"])
    total_spoof_all = sum(1 for e in detailed_evals if e["ground_truth"] == "spoof")
    total_bonafide_all = sum(1 for e in detailed_evals if e["ground_truth"] == "bonafide")
    total_fa_all = sum(1 for e in detailed_evals if e["false_acceptance"])
    total_fr_all = sum(1 for e in detailed_evals if e["false_rejection"])
    avg_lat_all = sum(e["latency_ms"] for e in detailed_evals) / max(1, total_samples_all)

    for lang_code, records in by_lang.items():
        n_samples = len(records)
        n_bonafide = sum(1 for r in records if r["ground_truth"] == "bonafide")
        n_spoof = sum(1 for r in records if r["ground_truth"] == "spoof")
        n_correct = sum(1 for r in records if r["correct"])
        n_fa = sum(1 for r in records if r["false_acceptance"])
        n_fr = sum(1 for r in records if r["false_rejection"])
        avg_lat = sum(r["latency_ms"] for r in records) / max(1, n_samples)

        acc = (n_correct / n_samples * 100.0) if n_samples > 0 else 0.0
        far = (n_fa / n_spoof * 100.0) if n_spoof > 0 else 0.0
        frr = (n_fr / n_bonafide * 100.0) if n_bonafide > 0 else 0.0

        summary[lang_code] = {
            "name": lang_names.get(lang_code, lang_code),
            "total_samples": n_samples,
            "bonafide_samples": n_bonafide,
            "spoof_samples": n_spoof,
            "correct": n_correct,
            "accuracy_pct": round(acc, 2),
            "far_pct": round(far, 2),
            "frr_pct": round(frr, 2),
            "avg_latency_ms": round(avg_lat, 2)
        }

    summary["overall"] = {
        "total_samples": total_samples_all,
        "accuracy_pct": round(total_correct_all / total_samples_all * 100.0, 2),
        "far_pct": round(total_fa_all / total_spoof_all * 100.0, 2) if total_spoof_all > 0 else 0.0,
        "frr_pct": round(total_fr_all / total_bonafide_all * 100.0, 2) if total_bonafide_all > 0 else 0.0,
        "avg_latency_ms": round(avg_lat_all, 2)
    }

    full_output = {
        "timestamp": time.time(),
        "device": wrapper.device,
        "summary": summary,
        "evaluations": detailed_evals
    }

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    # Print clean Markdown Table
    print("\n### Multilingual Benchmark Results\n")
    print("| Language | Evaluated Samples | Accuracy (%) | FAR (%) | FRR (%) | Avg Latency (ms) |")
    print("|---|---|---|---|---|---|")
    for lang_code in ["en", "ta", "hi"]:
        s = summary[lang_code]
        print(f"| **{s['name']}** | {s['total_samples']} | **{s['accuracy_pct']:.1f}%** | {s['far_pct']:.1f}% | {s['frr_pct']:.1f}% | {s['avg_latency_ms']:.1f}ms |")
    ov = summary["overall"]
    print(f"| **Aggregate (All)** | **{ov['total_samples']}** | **{ov['accuracy_pct']:.1f}%** | **{ov['far_pct']:.1f}%** | **{ov['frr_pct']:.1f}%** | **{ov['avg_latency_ms']:.1f}ms** |")
    print(f"\nDetailed evaluation results saved to: {RESULTS_PATH}\n")

    return full_output


class TestMultilingualBenchmark(unittest.TestCase):
    """
    Automated regression test verifying that AASIST's SincNet filters maintain
    invariant anti-spoofing performance across Tamil, Hindi, and English.
    """
    @classmethod
    def setUpClass(cls):
        cls.results = run_multilingual_benchmark()

    def test_overall_accuracy(self):
        acc = self.results["summary"]["overall"]["accuracy_pct"]
        self.assertGreaterEqual(acc, 90.0, f"Overall multilingual accuracy {acc}% fell below 90%")

    def test_regional_accuracy(self):
        for lang in ["ta", "hi", "en"]:
            lang_acc = self.results["summary"][lang]["accuracy_pct"]
            self.assertGreaterEqual(lang_acc, 90.0, f"Language {lang} accuracy {lang_acc}% fell below 90%")

    def test_zero_far(self):
        for lang in ["ta", "hi", "en"]:
            far = self.results["summary"][lang]["far_pct"]
            self.assertEqual(far, 0.0, f"FAR for language {lang} should be 0.0%, got {far}%")


if __name__ == "__main__":
    unittest.main()
