import io
import json
import math
import os
import sys
import time
from typing import Dict, Optional, Tuple, Union

import numpy as np
import soundfile as sf
import torch
import torch.nn.functional as F

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AASIST_DIR = os.path.join(CURRENT_DIR, "aasist")
if AASIST_DIR not in sys.path:
    sys.path.append(AASIST_DIR)

try:
    from aasist.models.AASIST import Model as AASISTModel
except (ModuleNotFoundError, ImportError):
    from models.AASIST import Model as AASISTModel

TARGET_SAMPLE_RATE = 16000
TARGET_SAMPLES = 64600  # ~4.0375 seconds at 16kHz
SILENCE_RMS_THRESHOLD_DB = -45.0  # Signals below -45 dB are treated as silence/background


class AASISTWrapper:
    """
    Singleton wrapper for the AASIST Anti-Spoofing PyTorch model.
    """
    _instance: Optional["AASISTWrapper"] = None

    def __init__(
        self,
        config_path: str = os.path.join(AASIST_DIR, "config", "AASIST.conf"),
        weights_path: str = os.path.join(AASIST_DIR, "models", "weights", "AASIST.pth"),
        device: Optional[str] = None,
    ):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        with open(config_path, "r") as f:
            config = json.load(f)

        self.model = AASISTModel(config["model_config"])
        state_dict = torch.load(weights_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()

    @classmethod
    def get_instance(cls) -> "AASISTWrapper":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def preprocess_waveform(
        self,
        waveform: Union[np.ndarray, torch.Tensor, bytes],
        sample_rate: int = TARGET_SAMPLE_RATE,
    ) -> Tuple[torch.Tensor, np.ndarray, float]:
        """
        Standardizes input waveform:
        - Decodes bytes or converts ndarray/Tensor
        - Converts multi-channel to mono
        - Resamples if necessary
        - Measures RMS energy and duration
        - Pads/slices to fixed AASIST length: 64,600 samples
        """
        # Case 1: Raw bytes
        if isinstance(waveform, bytes):
            try:
                data, sr = sf.read(io.BytesIO(waveform))
                sample_rate = sr
                waveform = data
            except Exception:
                # Fallback: assume raw 16-bit PCM mono
                waveform = np.frombuffer(waveform, dtype=np.int16).astype(np.float32) / 32768.0

        # Case 2: Torch Tensor
        if isinstance(waveform, torch.Tensor):
            waveform = waveform.detach().cpu().numpy()

        waveform = np.asarray(waveform, dtype=np.float32)

        # Convert multi-channel to mono
        if waveform.ndim > 1:
            if waveform.shape[0] < waveform.shape[1]:
                waveform = np.mean(waveform, axis=0)
            else:
                waveform = np.mean(waveform, axis=1)

        # Resample if sample_rate != 16000
        if sample_rate != TARGET_SAMPLE_RATE and len(waveform) > 0:
            indices = np.round(np.arange(0, len(waveform), sample_rate / TARGET_SAMPLE_RATE)).astype(int)
            indices = indices[indices < len(waveform)]
            waveform = waveform[indices]

        # Calculate original duration
        duration_ms = (len(waveform) / TARGET_SAMPLE_RATE) * 1000.0 if len(waveform) > 0 else 0.0

        # Fixed window length: 64,600 samples
        x_len = waveform.shape[0]
        if x_len == 0:
            padded_x = np.zeros(TARGET_SAMPLES, dtype=np.float32)
        elif x_len >= TARGET_SAMPLES:
            padded_x = waveform[:TARGET_SAMPLES]
        else:
            num_repeats = int(TARGET_SAMPLES / x_len) + 1
            padded_x = np.tile(waveform, (num_repeats))[:TARGET_SAMPLES]

        tensor_x = torch.tensor(padded_x, dtype=torch.float32, device=self.device).unsqueeze(0)
        return tensor_x, waveform, duration_ms

    def analyze_audio_health(self, raw_waveform: np.ndarray, duration_ms: float) -> Dict[str, Union[bool, float]]:
        """
        Computes RMS energy in dB and basic Voice Activity Detection (VAD).
        """
        if len(raw_waveform) == 0:
            return {"is_speech": False, "rms_db": -100.0, "duration_ms": 0.0}

        rms = np.sqrt(np.mean(raw_waveform ** 2) + 1e-12)
        rms_db = 20.0 * math.log10(rms) if rms > 0 else -100.0
        rms_db = max(-100.0, min(0.0, rms_db))

        is_speech = rms_db > SILENCE_RMS_THRESHOLD_DB
        return {
            "is_speech": is_speech,
            "rms_db": round(rms_db, 2),
            "duration_ms": round(duration_ms, 2),
        }

    def score_detailed(
        self,
        waveform: Union[np.ndarray, torch.Tensor, bytes],
        sample_rate: int = TARGET_SAMPLE_RATE,
        threshold: float = 0.50,
    ) -> Dict:
        """
        Full detailed inference pass returning scores, audio health, verdict, confidence, and latency.
        """
        start_time = time.perf_counter()
        tensor_x, raw_mono, duration_ms = self.preprocess_waveform(waveform, sample_rate)
        health = self.analyze_audio_health(raw_mono, duration_ms)

        with torch.no_grad():
            _, logits = self.model(tensor_x)
            probs = F.softmax(logits, dim=-1)
            spoof_prob = float(probs[0, 0].item())
            raw_logits = [float(logits[0, 0].item()), float(logits[0, 1].item())]

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        # Determine verdict and confidence
        if not health["is_speech"]:
            verdict = "silence"
            confidence = "high"
        elif spoof_prob >= 0.65:
            verdict = "spoof"
            confidence = "high" if spoof_prob >= 0.85 else "medium"
        elif spoof_prob <= 0.35:
            verdict = "bonafide"
            confidence = "high" if spoof_prob <= 0.15 else "medium"
        else:
            verdict = "uncertain"
            confidence = "low"

        return {
            "passive_score": round(spoof_prob, 4),
            "verdict": verdict,
            "confidence": confidence,
            "threshold_used": threshold,
            "raw_logits": raw_logits,
            "audio_health": health,
            "inference_latency_ms": round(latency_ms, 2),
        }

    def score(
        self,
        waveform: Union[np.ndarray, torch.Tensor, bytes],
        sample_rate: int = TARGET_SAMPLE_RATE,
    ) -> float:
        """Simple scalar score wrapper."""
        result = self.score_detailed(waveform, sample_rate)
        return result["passive_score"]


def score_audio_chunk(
    waveform: Union[np.ndarray, torch.Tensor, bytes],
    sample_rate: int = TARGET_SAMPLE_RATE,
) -> float:
    """
    Public 1-line wrapper returning passive spoof score [0.0 - 1.0].
    """
    wrapper = AASISTWrapper.get_instance()
    return wrapper.score(waveform, sample_rate)


def score_audio_chunk_detailed(
    waveform: Union[np.ndarray, torch.Tensor, bytes],
    sample_rate: int = TARGET_SAMPLE_RATE,
    threshold: float = 0.50,
) -> Dict:
    """
    Public detailed wrapper returning full telemetry & classification dict.
    """
    wrapper = AASISTWrapper.get_instance()
    return wrapper.score_detailed(waveform, sample_rate, threshold)
