# quantize_and_benchmark.py
"""
MEIKURAL -- AASIST MODEL QUANTIZATION & EDGE BENCHMARK
======================================================
Evaluates dynamic INT8 quantization on AASIST anti-spoofing model.
Measures:
1. Model binary footprint reduction (FP32 vs INT8).
2. Hardware-attributed CPU latency across multi-round iterations.
3. Quantization range [min, max] and average latency.
4. Hardware identification (CPU model).
"""

import json
import os
import platform
import subprocess
import sys
import time
from typing import List, Tuple

import torch
import torch.nn as nn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AASIST_DIR = os.path.join(CURRENT_DIR, "aasist")
if AASIST_DIR not in sys.path:
    sys.path.append(AASIST_DIR)

try:
    from aasist.models.AASIST import Model as AASISTModel
except (ModuleNotFoundError, ImportError):
    from models.AASIST import Model as AASISTModel


def get_cpu_model_name() -> str:
    """
    Detects detailed CPU model name cross-platform.
    """
    if sys.platform == "win32":
        try:
            cmd = ["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name"]
            out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
            if out:
                return out
        except Exception:
            pass
    elif sys.platform.startswith("linux"):
        try:
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":", 1)[1].strip()
        except Exception:
            pass
    elif sys.platform == "darwin":
        try:
            return subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
        except Exception:
            pass

    return platform.processor() or platform.machine() or "Generic CPU"


def run_benchmark(num_rounds: int = 4, iterations_per_round: int = 10):
    print("=" * 70)
    print("MEIKURAL -- AASIST MODEL QUANTIZATION & EDGE BENCHMARK")
    print("=" * 70)

    cpu_model = get_cpu_model_name()
    print(f"Hardware Detected: {cpu_model}")

    config_path = os.path.join(AASIST_DIR, "config", "AASIST.conf")
    weights_path = os.path.join(AASIST_DIR, "models", "weights", "AASIST.pth")

    with open(config_path, "r") as f:
        config = json.load(f)

    # 1. Load Baseline FP32 Model
    print("\n1. Loading Baseline FP32 Model...")
    model_fp32 = AASISTModel(config["model_config"])
    state_dict = torch.load(weights_path, map_location="cpu")
    model_fp32.load_state_dict(state_dict)
    model_fp32.eval()

    fp32_size_bytes = os.path.getsize(weights_path)
    fp32_size_mb = fp32_size_bytes / (1024 * 1024)
    print(f"   Baseline FP32 Model Size: {fp32_size_mb:.2f} MB ({fp32_size_bytes:,} bytes)")

    # 2. Dynamic INT8 Quantization
    print("\n2. Applying Dynamic INT8 Quantization (Linear layers)...")
    try:
        model_int8 = torch.ao.quantization.quantize_dynamic(
            model_fp32, {nn.Linear}, dtype=torch.qint8
        )
    except AttributeError:
        model_int8 = torch.quantization.quantize_dynamic(
            model_fp32, {nn.Linear}, dtype=torch.qint8
        )

    quantized_weights_path = os.path.join(CURRENT_DIR, "aasist_quantized_int8.pth")
    torch.save(model_int8.state_dict(), quantized_weights_path)
    int8_size_bytes = os.path.getsize(quantized_weights_path)
    int8_size_mb = int8_size_bytes / (1024 * 1024)
    size_reduction_pct = ((fp32_size_bytes - int8_size_bytes) / fp32_size_bytes) * 100.0
    print(f"   Quantized INT8 Model Size: {int8_size_mb:.2f} MB ({int8_size_bytes:,} bytes)")
    print(f"   Size Reduction: {size_reduction_pct:.1f}% smaller!")

    # 3. Latency Benchmarking across multiple rounds
    dummy_input = torch.randn(1, 64600)
    print(f"\n3. Benchmarking Latency across {num_rounds} rounds ({iterations_per_round} runs/round, 64,600 samples ~4.04s audio)...")

    # Warmup
    with torch.no_grad():
        for _ in range(3):
            _ = model_fp32(dummy_input)
            _ = model_int8(dummy_input)

    all_fp32_latencies = []
    all_int8_latencies = []

    for round_idx in range(1, num_rounds + 1):
        round_fp32 = []
        for _ in range(iterations_per_round):
            t0 = time.perf_counter()
            with torch.no_grad():
                _ = model_fp32(dummy_input)
            round_fp32.append((time.perf_counter() - t0) * 1000.0)

        round_int8 = []
        for _ in range(iterations_per_round):
            t0 = time.perf_counter()
            with torch.no_grad():
                _ = model_int8(dummy_input)
            round_int8.append((time.perf_counter() - t0) * 1000.0)

        all_fp32_latencies.extend(round_fp32)
        all_int8_latencies.extend(round_int8)

        print(f"   Round {round_idx}/{num_rounds}: FP32 avg = {sum(round_fp32)/len(round_fp32):.1f} ms | INT8 avg = {sum(round_int8)/len(round_int8):.1f} ms")

    avg_fp32_ms = sum(all_fp32_latencies) / len(all_fp32_latencies)
    min_fp32_ms = min(all_fp32_latencies)
    max_fp32_ms = max(all_fp32_latencies)

    avg_int8_ms = sum(all_int8_latencies) / len(all_int8_latencies)
    min_int8_ms = min(all_int8_latencies)
    max_int8_ms = max(all_int8_latencies)

    speedup_pct = ((avg_fp32_ms - avg_int8_ms) / avg_fp32_ms) * 100.0 if avg_fp32_ms > avg_int8_ms else 0.0

    print("\n" + "=" * 70)
    print("BENCHMARK AGGREGATE SUMMARY:")
    print(f"  * CPU Model:       {cpu_model}")
    print(f"  * FP32 Latency:    avg {avg_fp32_ms:.1f} ms [range: {min_fp32_ms:.1f} ms - {max_fp32_ms:.1f} ms]")
    print(f"  * INT8 Latency:    avg {avg_int8_ms:.1f} ms [range: {min_int8_ms:.1f} ms - {max_int8_ms:.1f} ms]")
    print(f"  * Size Reduction:  {size_reduction_pct:.1f}% ({fp32_size_mb:.2f} MB -> {int8_size_mb:.2f} MB)")
    print("=" * 70)

    # 4. Save Structured Hardware-Attributed Telemetry
    results = {
        "timestamp": time.time(),
        "device": "CPU",
        "cpu_model": cpu_model,
        "input_samples": 64600,
        "sample_rate_hz": 16000,
        "num_rounds": num_rounds,
        "iterations_per_round": iterations_per_round,
        "total_evaluations_per_model": len(all_fp32_latencies),
        "fp32_model": {
            "size_mb": round(fp32_size_mb, 2),
            "size_bytes": fp32_size_bytes,
            "avg_latency_ms": round(avg_fp32_ms, 1),
            "latency_min_ms": round(min_fp32_ms, 1),
            "latency_max_ms": round(max_fp32_ms, 1),
            "latency_range_ms": [round(min_fp32_ms, 1), round(max_fp32_ms, 1)],
        },
        "int8_quantized_model": {
            "size_mb": round(int8_size_mb, 2),
            "size_bytes": int8_size_bytes,
            "avg_latency_ms": round(avg_int8_ms, 1),
            "latency_min_ms": round(min_int8_ms, 1),
            "latency_max_ms": round(max_int8_ms, 1),
            "latency_range_ms": [round(min_int8_ms, 1), round(max_int8_ms, 1)],
            "size_reduction_percent": round(size_reduction_pct, 1),
            "latency_improvement_percent": round(speedup_pct, 1),
        },
    }

    results_file = os.path.join(CURRENT_DIR, "benchmark_results.json")
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nSaved updated benchmark results to: {results_file}")
    return results


if __name__ == "__main__":
    run_benchmark(num_rounds=4, iterations_per_round=10)
