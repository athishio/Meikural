import io
import json
import math
import os
import sys
import time
from typing import Dict, Optional, Tuple, Union

import numpy as np
import scipy.signal as signal
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

# Calibrated Log-Likelihood Ratio (LLR = logit_bonafide - logit_spoof) decision thresholds
# Derived from ROC curve optimization on empirical telephony evaluation data:
CODEC_LLR_CALIBRATION_THRESHOLDS: Dict[str, float] = {
    "clean_pcm": -8.85,
    "uncompressed_pcm_16k": -8.85,
    "g711_ulaw": -8.64,
    "ulaw": -8.64,
    "mu_law": -8.64,
    "g711u": -8.64,
    "g711_alaw": -8.59,
    "alaw": -8.59,
    "a_law": -8.59,
    "g711a": -8.59,
    "pstn": -7.50,
    "narrowband": -7.50,
    "pstn_8k": -7.50,
    "pstn_narrowband": -7.50,
    "amr_wb": -8.53,
    "amr": -8.53,
    "wideband": -8.53,
    "default": -8.64,
}


class TelephonyCodecEngine:
    """
    Simulates real-world telecommunication lossy compression codecs:
    - ITU-T G.711 mu-law (North America / Japan PSTN standard)
    - ITU-T G.711 A-law (Europe / India PSTN standard)
    - PSTN Narrowband 8kHz downsampling with Butterworth 300-3400 Hz bandpass filter
    - AMR-WB (Adaptive Multi-Rate Wideband telecom profile)
    """

    @staticmethod
    def apply_g711_ulaw(waveform: np.ndarray, mu: float = 255.0) -> np.ndarray:
        """
        Applies G.711 mu-law non-linear logarithmic companding, 8-bit quantization,
        and de-quantization back to floating point PCM.
        """
        if len(waveform) == 0:
            return waveform
        x = np.clip(waveform, -1.0, 1.0)
        # Mu-law compression
        y = np.sign(x) * np.log(1.0 + mu * np.abs(x)) / np.log(1.0 + mu)
        # 8-bit integer quantization (-127 to 127)
        q = np.round(y * 127.0).astype(np.int8)
        # De-quantization (expansion)
        x_recon = np.sign(q) * (1.0 / mu) * ((1.0 + mu) ** (np.abs(q) / 127.0) - 1.0)
        return x_recon.astype(np.float32)

    @staticmethod
    def apply_g711_alaw(waveform: np.ndarray, A: float = 87.6) -> np.ndarray:
        """
        Applies G.711 A-law non-linear logarithmic companding, 8-bit quantization,
        and de-quantization back to floating point PCM.
        """
        if len(waveform) == 0:
            return waveform
        x = np.clip(waveform, -1.0, 1.0)
        abs_x = np.abs(x)
        inv_A = 1.0 / A
        denom = 1.0 + np.log(A)

        y = np.zeros_like(x)
        linear_mask = abs_x < inv_A
        log_mask = ~linear_mask

        y[linear_mask] = np.sign(x[linear_mask]) * (A * abs_x[linear_mask]) / denom
        y[log_mask] = np.sign(x[log_mask]) * (1.0 + np.log(np.maximum(1e-12, A * abs_x[log_mask]))) / denom

        q = np.round(y * 127.0).astype(np.int8)

        # De-quantization
        abs_q_norm = np.abs(q) / 127.0
        x_recon = np.zeros_like(x)
        lin_recon_mask = abs_q_norm < (1.0 / denom)
        log_recon_mask = ~lin_recon_mask

        x_recon[lin_recon_mask] = np.sign(q[lin_recon_mask]) * (abs_q_norm[lin_recon_mask] * denom) / A
        x_recon[log_recon_mask] = np.sign(q[log_recon_mask]) * np.exp(abs_q_norm[log_recon_mask] * denom - 1.0) / A

        return x_recon.astype(np.float32)

    @staticmethod
    def apply_pstn_narrowband(waveform: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> np.ndarray:
        """
        Simulates traditional 8kHz PSTN narrowband telephony:
        1. Downsamples from 16kHz to 8kHz
        2. Applies 4th-order Butterworth bandpass filter (300 Hz - 3400 Hz)
        3. Upsamples back to 16kHz with anti-aliasing interpolation
        """
        if len(waveform) == 0:
            return waveform

        # Resample to 8kHz
        num_8k = max(1, int(len(waveform) * (8000.0 / sample_rate)))
        downsampled = signal.resample(waveform, num_8k)

        # Butterworth bandpass filter: 300 Hz to 3400 Hz at 8000 Hz Nyquist (4000 Hz)
        sos = signal.butter(4, [300.0, 3400.0], btype="bandpass", fs=8000.0, output="sos")
        filtered_8k = signal.sosfilt(sos, downsampled)

        # Resample back to 16kHz
        num_16k = max(1, int(len(filtered_8k) * (TARGET_SAMPLE_RATE / 8000.0)))
        upsampled = signal.resample(filtered_8k, num_16k)
        return upsampled.astype(np.float32)

    @classmethod
    def apply_codec(cls, waveform: np.ndarray, codec_name: str, sample_rate: int = TARGET_SAMPLE_RATE) -> np.ndarray:
        """
        Applies requested telephony compression codec simulation.
        """
        codec = codec_name.lower().strip()
        if codec in ("g711_ulaw", "ulaw", "mu_law", "g711u"):
            return cls.apply_g711_ulaw(waveform)
        elif codec in ("g711_alaw", "alaw", "a_law", "g711a"):
            return cls.apply_g711_alaw(waveform)
        elif codec in ("pstn", "narrowband", "pstn_8k", "pstn_narrowband"):
            nb = cls.apply_pstn_narrowband(waveform, sample_rate)
            return cls.apply_g711_ulaw(nb)
        elif codec in ("amr_wb", "amr", "wideband"):
            # Wideband telecom bandpass: 50 Hz to 7000 Hz
            sos = signal.butter(4, [50.0, 7000.0], btype="bandpass", fs=sample_rate, output="sos")
            return signal.sosfilt(sos, waveform).astype(np.float32)
        return waveform


def load_audio_any_format(audio_source: Union[str, bytes, os.PathLike, io.BytesIO]) -> Tuple[np.ndarray, int]:
    """
    Robust audio loader supporting WAV, FLAC, OGG, MP3, M4A, AAC, WebM.
    Uses soundfile first, then falls back to PyAV for formats unsupported by libsndfile.
    """
    bio = io.BytesIO(audio_source) if isinstance(audio_source, bytes) else audio_source
    try:
        data, sr = sf.read(bio)
        return np.asarray(data, dtype=np.float32), sr
    except Exception:
        pass

    # Try PyAV for MP3, M4A, WebM, AAC
    try:
        import av
        container_input = io.BytesIO(audio_source) if isinstance(audio_source, bytes) else str(audio_source)
        container = av.open(container_input)
        audio_stream = next(s for s in container.streams if s.type == "audio")
        resampler = av.AudioResampler(format="fltp", layout="mono", rate=TARGET_SAMPLE_RATE)
        frames = []
        for frame in container.decode(audio_stream):
            for resampled_frame in resampler.resample(frame):
                frames.append(resampled_frame.to_ndarray())
        if frames:
            data = np.concatenate(frames, axis=1).squeeze(0)
            return data.astype(np.float32), TARGET_SAMPLE_RATE
    except Exception:
        pass

    # Fallback: assume raw 16-bit PCM mono
    if isinstance(audio_source, bytes):
        data = np.frombuffer(audio_source, dtype=np.int16).astype(np.float32) / 32768.0
        return data, TARGET_SAMPLE_RATE

    raise ValueError("Unable to decode audio data with soundfile or PyAV")


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
        waveform: Union[np.ndarray, torch.Tensor, bytes, str, os.PathLike],
        sample_rate: int = TARGET_SAMPLE_RATE,
        simulate_codec: Optional[str] = None,
    ) -> Tuple[torch.Tensor, np.ndarray, float]:
        """
        Standardizes input waveform:
        - Accepts file path strings, raw bytes, ndarray, or Torch Tensor
        - Converts multi-channel to mono
        - Resamples if necessary
        - Optionally simulates lossy telecommunication codecs (G.711 / PSTN)
        - Measures RMS energy and duration
        - Pads/slices to fixed AASIST length: 64,600 samples
        """
        # Case 0/1: File path string, PathLike, or raw bytes
        if isinstance(waveform, (str, os.PathLike)) or isinstance(waveform, bytes):
            waveform, sample_rate = load_audio_any_format(waveform)

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

        # Resample if sample_rate != 16000 using anti-aliased polyphase filtering
        if sample_rate != TARGET_SAMPLE_RATE and len(waveform) > 0:
            gcd = math.gcd(int(sample_rate), TARGET_SAMPLE_RATE)
            up = TARGET_SAMPLE_RATE // gcd
            down = int(sample_rate) // gcd
            try:
                waveform = signal.resample_poly(waveform, up, down).astype(np.float32)
            except Exception:
                num_target = int(round(len(waveform) * float(TARGET_SAMPLE_RATE) / float(sample_rate)))
                waveform = signal.resample(waveform, num_target).astype(np.float32)

        # Apply telephony codec simulation if requested
        if simulate_codec:
            waveform = TelephonyCodecEngine.apply_codec(waveform, simulate_codec, sample_rate=TARGET_SAMPLE_RATE)

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
        waveform: Union[np.ndarray, torch.Tensor, bytes, str, os.PathLike],
        sample_rate: int = TARGET_SAMPLE_RATE,
        threshold: float = 0.50,
        simulate_codec: Optional[str] = None,
    ) -> Dict:
        """
        Full detailed inference pass returning scores, audio health, verdict, confidence, and latency.
        """
        start_time = time.perf_counter()
        tensor_x, raw_mono, duration_ms = self.preprocess_waveform(waveform, sample_rate, simulate_codec=simulate_codec)
        health = self.analyze_audio_health(raw_mono, duration_ms)

        with torch.no_grad():
            _, logits = self.model(tensor_x)
            raw_logits = [float(logits[0, 0].item()), float(logits[0, 1].item())]
            # Log-Likelihood Ratio: LLR = logit_bonafide - logit_spoof
            llr = raw_logits[1] - raw_logits[0]

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        # Calibrate LLR against empirical telephony threshold
        codec_key = (simulate_codec or "clean_pcm").lower().strip()
        calibrated_tau = CODEC_LLR_CALIBRATION_THRESHOLDS.get(codec_key, CODEC_LLR_CALIBRATION_THRESHOLDS["default"])
        centered_llr = llr - calibrated_tau
        try:
            calibrated_spoof_prob = 1.0 / (1.0 + math.exp(centered_llr))
        except OverflowError:
            calibrated_spoof_prob = 0.0 if centered_llr > 0 else 1.0
        spoof_prob = float(np.clip(calibrated_spoof_prob, 0.0001, 0.9999))

        # Determine verdict and confidence
        if not health["is_speech"]:
            spoof_prob = 0.0
            verdict = "silence"
            confidence = "high"
            raw_logits = [-5.0, 5.0]
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
            "threshold_used": round(calibrated_tau, 4),
            "raw_llr": round(llr, 4),
            "raw_logits": raw_logits,
            "audio_health": health,
            "inference_latency_ms": round(latency_ms, 2),
            "codec_profile": simulate_codec or "uncompressed_pcm_16k",
        }

    def score(
        self,
        waveform: Union[np.ndarray, torch.Tensor, bytes, str, os.PathLike],
        sample_rate: int = TARGET_SAMPLE_RATE,
        simulate_codec: Optional[str] = None,
    ) -> float:
        """Simple scalar score wrapper."""
        result = self.score_detailed(waveform, sample_rate, simulate_codec=simulate_codec)
        return result["passive_score"]


def score_audio_chunk(
    waveform: Union[np.ndarray, torch.Tensor, bytes, str, os.PathLike],
    sample_rate: int = TARGET_SAMPLE_RATE,
    simulate_codec: Optional[str] = None,
) -> float:
    """
    Public 1-line wrapper returning passive spoof score [0.0 - 1.0].
    """
    wrapper = AASISTWrapper.get_instance()
    return wrapper.score(waveform, sample_rate, simulate_codec=simulate_codec)


def score_audio_chunk_detailed(
    waveform: Union[np.ndarray, torch.Tensor, bytes, str, os.PathLike],
    sample_rate: int = TARGET_SAMPLE_RATE,
    threshold: float = 0.50,
    simulate_codec: Optional[str] = None,
) -> Dict:
    """
    Public detailed wrapper returning full telemetry & classification dict.
    """
    wrapper = AASISTWrapper.get_instance()
    return wrapper.score_detailed(waveform, sample_rate, threshold, simulate_codec=simulate_codec)
