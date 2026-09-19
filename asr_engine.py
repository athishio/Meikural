"""
asr_engine.py - Automated Speech Recognition & Spoken Digit Verification for MEIKURAL
====================================================================================
Wraps faster-whisper (tiny.en default, CPU INT8 quantized) for offline, low-latency
spoken digit recognition. Used by MEIKURAL's active micro-challenge protocol to
automatically verify whether the caller accurately repeated the issued challenge digits.
"""

import io
import logging
import os
import re
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

logger = logging.getLogger("meikural_asr")

# Word-to-digit normalization mapping (including common phonetic ASR confusions)
DIGIT_MAP: Dict[str, str] = {
    "zero": "0", "oh": "0", "o": "0",
    "one": "1", "won": "1",
    "two": "2", "to": "2", "too": "2",
    "three": "3",
    "four": "4", "for": "4", "fore": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8", "ate": "8",
    "nine": "9",
}


class ASREngine:
    """
    Singleton Automated Speech Recognition (ASR) Engine using faster-whisper.
    Runs offline on CPU with INT8 quantization for sub-100ms turnaround on short digit bursts.
    """
    _instance: Optional["ASREngine"] = None

    def __init__(self, model_size: Optional[str] = None):
        from faster_whisper import WhisperModel

        self.model_name = model_size or os.getenv("ASR_MODEL", "tiny.en")
        logger.info(f"Initializing ASREngine with model '{self.model_name}' (CPU INT8)...")
        self.model = WhisperModel(
            self.model_name,
            device="cpu",
            compute_type="int8",
            cpu_threads=int(os.getenv("ASR_THREADS", "2")),
        )
        logger.info(f"ASREngine model '{self.model_name}' loaded successfully.")

    @classmethod
    def get_instance(cls) -> "ASREngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def normalize_to_digits(text: str) -> str:
        """
        Extracts and normalizes spoken digits or written numerals from transcription text:
        Example: "Four eight two nine." -> "4829"
        Example: "repeat: 9 - 2 - 5" -> "925"
        """
        clean_text = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = clean_text.split()
        digits: List[str] = []

        for token in tokens:
            if token.isdigit():
                digits.extend(list(token))
            elif token in DIGIT_MAP:
                digits.append(DIGIT_MAP[token])

        return "".join(digits)

    def transcribe(
        self,
        audio: Union[np.ndarray, str, bytes],
        sample_rate: int = 16000,
    ) -> Tuple[str, str, float]:
        """
        Transcribes audio and extracts digits.
        Accepts:
          - np.ndarray (float32 at 16kHz)
          - str (filepath)
          - bytes (raw WAV or audio file bytes)
        Returns:
          Tuple[detected_digits: str, raw_transcript: str, confidence: float]
        """
        if isinstance(audio, bytes):
            import soundfile as sf
            try:
                audio_np, sr = sf.read(io.BytesIO(audio))
                if sr != 16000:
                    import scipy.signal as signal
                    import math
                    gcd = math.gcd(int(sr), 16000)
                    audio_np = signal.resample_poly(audio_np, 16000 // gcd, int(sr) // gcd).astype(np.float32)
                audio = audio_np.astype(np.float32)
            except Exception:
                audio = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0

        if isinstance(audio, np.ndarray):
            if audio.ndim > 1:
                audio = np.mean(audio, axis=1 if audio.shape[1] < audio.shape[0] else 0)
            audio = audio.astype(np.float32)

        segments, info = self.model.transcribe(
            audio,
            beam_size=1,
            language="en" if "en" in self.model_name else None,
            vad_filter=True,
        )

        texts = []
        confidences = []
        for s in segments:
            texts.append(s.text)
            if hasattr(s, "avg_logprob"):
                conf = float(np.exp(s.avg_logprob))
                confidences.append(conf)

        raw_transcript = " ".join(texts).strip()
        detected_digits = self.normalize_to_digits(raw_transcript)
        avg_conf = float(np.mean(confidences)) if confidences else 0.85

        return detected_digits, raw_transcript, round(avg_conf, 3)
