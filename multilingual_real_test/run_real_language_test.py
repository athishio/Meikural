"""
Real Multilingual Validation for Meikural
==========================================
Sends REAL synthesized speech (espeak-ng TTS, actual spoken sentences) in Tamil, Hindi,
and English -- plus a real pitch/formant-shifted "voice conversion" variant of each --
to your ACTUAL running /score endpoint, and reports where each lands relative to your
0.35 / 0.65 thresholds.

This is NOT synthetic sine-wave test fixtures. These are:
  - bonafide_*.wav: real TTS speech saying real sentences (via espeak-ng)
  - spoof_*.wav: the same speech run through real pitch-shift + formant-stretch +
    quantization (via librosa) -- a genuine, if crude, voice-conversion pipeline

Usage:
    1. Start your server:  uvicorn app:app --host 0.0.0.0 --port 8000
    2. Put this script + the audio/ folder next to your repo (or adjust AUDIO_DIR below)
    3. Run:  python run_real_language_test.py
"""
import os
import glob
import json
import requests

SERVER_URL = "http://localhost:8000/score"  # adjust if different
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)))

BONAFIDE_THRESHOLD = 0.35
SPOOF_THRESHOLD = 0.65

def score_file(path):
    with open(path, "rb") as f:
        files = {"audio": (os.path.basename(path), f, "audio/wav")}
        resp = requests.post(SERVER_URL, files=files, timeout=30)
    if resp.status_code != 200:
        # Print the real reason instead of swallowing it -- 422 means FastAPI
        # rejected the request shape (wrong field name, wrong content-type, etc.)
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

def classify(score):
    if score >= SPOOF_THRESHOLD:
        return "SPOOF"
    elif score <= BONAFIDE_THRESHOLD:
        return "BONAFIDE"
    return "UNCERTAIN"

def main():
    wav_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.wav")))
    if not wav_files:
        print(f"No .wav files found in {AUDIO_DIR}")
        return

    results = []
    print(f"{'File':<22} {'Ground Truth':<12} {'Score':<8} {'Verdict':<10} {'Correct?':<8}")
    print("-" * 70)

    for path in wav_files:
        fname = os.path.basename(path)
        ground_truth = "SPOOF" if "spoof" in fname else "BONAFIDE"
        try:
            result = score_file(path)
        except Exception as e:
            print(f"{fname:<22} ERROR: {e}")
            continue

        # Adjust this key path based on your actual /score response schema
        score = result.get("anti_spoofing", {}).get("passive_score", result.get("score"))
        verdict = classify(score)
        correct = "YES" if verdict == ground_truth else ("N/A" if verdict == "UNCERTAIN" else "NO")

        print(f"{fname:<22} {ground_truth:<12} {score:<8.4f} {verdict:<10} {correct:<8}")
        results.append({
            "file": fname,
            "language": fname.split("_")[0],
            "ground_truth": ground_truth,
            "score": score,
            "verdict": verdict,
            "correct": correct,
        })

    with open("real_language_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("\nFull results saved to real_language_test_results.json")

    # Per-language summary
    langs = sorted(set(r["language"] for r in results))
    print("\nPer-language accuracy:")
    for lang in langs:
        lang_results = [r for r in results if r["language"] == lang]
        correct = sum(1 for r in lang_results if r["correct"] == "YES")
        total = len(lang_results)
        print(f"  {lang}: {correct}/{total} correct")

if __name__ == "__main__":
    main()
