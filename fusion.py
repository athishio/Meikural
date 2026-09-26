"""
fusion.py - MEIKURAL Multi-Modal Score Fusion & Active Challenge State Machine
==============================================================================
Fuses passive acoustic deepfake scoring (AASIST) with dynamic conversational
liveness verification (unscripted challenge-response) and in-call turnaround
latency profiling into a unified, explainable trust index and policy action.

Core Components:
1. TurnaroundLatencyProfiler: High-resolution conversational reflex & turn-taking
   latency profiler that exposes cascading generative AI pipeline lag (ASR -> LLM -> TTS -> Vocoder).
2. ChallengeEngine: Dynamic unscripted prompt generator and turnaround validator.
3. FusionEngine: Weighted multi-signal fusion combining:
   - Passive AASIST spoof probability (0.0 to 1.0)
   - Active challenge response liveness score
   - Conversational response latency profiling penalty
"""

import logging
import random
import time
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from schemas import ChallengeState, EventType, RiskVerdict, VerdictType

logger = logging.getLogger("meikural_fusion")

# Regulatory & Operational Thresholds
SAFE_THRESHOLD = 0.35
STEP_UP_THRESHOLD = 0.65


class ChallengeStatus(str, Enum):
    IDLE = "idle"
    ISSUED = "issued"
    WAITING_RESPONSE = "waiting_response"
    PASSED = "passed"
    FAILED = "failed"
    EXPIRED = "expired"


class LatencyClassification(str, Enum):
    INSTANT_SOUNDBOARD = "INSTANT_SOUNDBOARD"   # < 250ms (canned soundboard injection / mechanical)
    NATURAL_HUMAN = "NATURAL_HUMAN"             # 250ms - 850ms (organic human cognitive & vocal reflex)
    ELEVATED_PAUSE = "ELEVATED_PAUSE"           # 850ms - 1400ms (hesitation or fast local model)
    SYNTHETIC_PIPELINE_LAG = "SYNTHETIC_LAG"    # > 1400ms (cascading ASR + LLM + TTS + vocoder latency)


@dataclass
class TimingProfile:
    turnaround_ms: float
    classification: LatencyClassification
    anomaly_penalty: float
    confidence_multiplier: float
    turn_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "turnaround_ms": round(self.turnaround_ms, 1),
            "classification": self.classification.value,
            "anomaly_penalty": round(self.anomaly_penalty, 3),
            "is_biological": self.classification == LatencyClassification.NATURAL_HUMAN,
            "turn_count": self.turn_count,
        }


class TurnaroundLatencyProfiler:
    """
    Profiles conversational turn-taking latency between challenge issuance and speech onset.
    Detects cascading generative AI latency (ASR -> LLM -> TTS -> Vocoder) vs. human biological reflexes.
    """

    def __init__(self):
        self._session_turns: Dict[str, List[float]] = {}
        self._session_prompt_ts: Dict[str, float] = {}
        self._session_in_speech: Dict[str, bool] = {}

    def cleanup_session(self, session_id: str) -> None:
        self._session_turns.pop(session_id, None)
        self._session_prompt_ts.pop(session_id, None)
        self._session_in_speech.pop(session_id, None)

    def mark_prompt_issued(self, session_id: str, ts: Optional[float] = None) -> float:
        now = ts or time.time()
        self._session_prompt_ts[session_id] = now
        self._session_in_speech[session_id] = False
        return now

    def evaluate_speech_onset(
        self, session_id: str, is_speech: bool, ts: Optional[float] = None
    ) -> Optional[TimingProfile]:
        """
        Detects transitions from silence/listening to active speech post-prompt issuance.
        """
        prompt_ts = self._session_prompt_ts.get(session_id)
        if prompt_ts is None:
            return None

        was_speech = self._session_in_speech.get(session_id, False)
        now = ts or time.time()

        # Detect speech onset (silence -> speech)
        if is_speech and not was_speech:
            self._session_in_speech[session_id] = True
            turnaround_ms = (now - prompt_ts) * 1000.0

            turns = self._session_turns.setdefault(session_id, [])
            turns.append(turnaround_ms)

            # Classify turn-taking reflex
            if turnaround_ms < 250.0:
                classification = LatencyClassification.INSTANT_SOUNDBOARD
                penalty = 0.25
                multiplier = 0.70
            elif 250.0 <= turnaround_ms <= 850.0:
                classification = LatencyClassification.NATURAL_HUMAN
                penalty = -0.15  # Human reflex reward (reduces spoof risk)
                multiplier = 1.0
            elif 850.0 < turnaround_ms <= 1400.0:
                classification = LatencyClassification.ELEVATED_PAUSE
                penalty = 0.10
                multiplier = 0.85
            else:
                classification = LatencyClassification.SYNTHETIC_PIPELINE_LAG
                penalty = 0.35  # Telltale cascading AI delay penalty
                multiplier = 0.50

            return TimingProfile(
                turnaround_ms=turnaround_ms,
                classification=classification,
                anomaly_penalty=penalty,
                confidence_multiplier=multiplier,
                turn_count=len(turns),
            )

        self._session_in_speech[session_id] = is_speech
        return None


@dataclass
class ChallengeRecord:
    challenge_id: str
    challenge_type: str
    prompt_text: str
    expected_answer: Optional[str]
    issued_at: float
    timeout_seconds: float = 15.0
    status: ChallengeStatus = ChallengeStatus.ISSUED
    resolved_at: Optional[float] = None
    liveness_score: float = 0.0
    latency_ms: float = 0.0


class ChallengeEngine:
    """
    Manages unscripted conversational micro-challenges to provoke and expose
    synthetic voice clones, pre-recorded audio, and automated soundboards.
    Includes strict anti-storm debouncing, session limits, and post-challenge cooldowns.
    """

    CHALLENGE_TIMEOUT_SECONDS: float = 15.0
    CHALLENGE_COOLDOWN_SECONDS: float = 25.0
    MAX_CHALLENGES_PER_SESSION: int = 2

    CHALLENGE_TEMPLATES = [
        {"type": "digit_repeat", "text": "Please repeat the security digits: {d1} - {d2} - {d3} - {d4}."},
        {"type": "digit_repeat", "text": "For verification, please say: {d1} - {d2} - {d3}."},
        {"type": "department_confirm", "text": "Please state your department and employee badge code."},
        {"type": "phonetic_phrase", "text": "Please repeat: Secure voice verification code {d1} {d2}."},
        {"type": "date_confirm", "text": "Please state today's date and your account branch location."},
    ]

    def __init__(self):
        self._active_challenges: Dict[str, ChallengeRecord] = {}
        self._session_cooldown_until: Dict[str, float] = {}
        self._session_challenge_count: Dict[str, int] = {}

    def cleanup_session(self, session_id: str) -> None:
        self._active_challenges.pop(session_id, None)
        self._session_cooldown_until.pop(session_id, None)
        self._session_challenge_count.pop(session_id, None)

    def can_issue_challenge(self, session_id: str, now: Optional[float] = None) -> bool:
        """
        Guards against challenge storms: checks cooldowns, limits, and existing pending challenges.
        """
        current_time = now if now is not None else time.time()

        # 1. Check if an active, non-expired challenge is currently open
        active = self.get_current_challenge(session_id, timestamp=current_time)
        if active and active.status == ChallengeStatus.ISSUED:
            return False

        # 2. Check cooldown window
        cooldown_until = self._session_cooldown_until.get(session_id, 0.0)
        if current_time < cooldown_until:
            return False

        # 3. Check session limit
        count = self._session_challenge_count.get(session_id, 0)
        if count >= self.MAX_CHALLENGES_PER_SESSION:
            return False

        return True

    def issue_challenge(
        self, session_id: str, challenge_type: Optional[str] = None, timestamp: Optional[float] = None
    ) -> ChallengeRecord:
        """
        Generates an unscripted, dynamic micro-challenge for an ambiguous or high-risk session.
        """
        now = timestamp if timestamp is not None else time.time()
        ch_id = f"ch_{uuid.uuid4().hex[:6]}"
        template = random.choice(self.CHALLENGE_TEMPLATES)

        d1 = random.randint(1, 9)
        d2 = random.randint(1, 9)
        d3 = random.randint(1, 9)
        d4 = random.randint(1, 9)

        prompt_text = template["text"].format(d1=d1, d2=d2, d3=d3, d4=d4)
        c_type = challenge_type or template["type"]

        record = ChallengeRecord(
            challenge_id=ch_id,
            challenge_type=c_type,
            prompt_text=prompt_text,
            expected_answer=f"{d1}{d2}{d3}{d4}" if "{d4}" in template["text"] else f"{d1}{d2}{d3}",
            issued_at=now,
            timeout_seconds=self.CHALLENGE_TIMEOUT_SECONDS,
            status=ChallengeStatus.ISSUED,
        )
        self._active_challenges[session_id] = record
        self._session_challenge_count[session_id] = self._session_challenge_count.get(session_id, 0) + 1
        logger.info(
            f"Challenge issued for session {session_id}: [{ch_id}] '{prompt_text}' (total: {self._session_challenge_count[session_id]})",
            extra={"session_id": session_id, "event_type": "challenge_issued"}
        )
        return record

    def get_current_challenge(self, session_id: str, timestamp: Optional[float] = None) -> Optional[ChallengeRecord]:
        now = timestamp if timestamp is not None else time.time()
        record = self._active_challenges.get(session_id)
        if record and record.status == ChallengeStatus.ISSUED:
            if (now - record.issued_at) > record.timeout_seconds:
                record.status = ChallengeStatus.EXPIRED
                self._session_cooldown_until[session_id] = now + self.CHALLENGE_COOLDOWN_SECONDS
                logger.warning(
                    f"Challenge [{record.challenge_id}] expired for session {session_id}. Cooldown active for {self.CHALLENGE_COOLDOWN_SECONDS}s",
                    extra={"session_id": session_id, "event_type": "challenge_expired"}
                )
        return record

    def evaluate_response(
        self,
        session_id: str,
        is_speech: bool,
        rms_db: float,
        detected_answer: Optional[str] = None,
        asr_confidence: Optional[float] = None,
        manual_passed: Optional[bool] = None,
        timestamp: Optional[float] = None,
    ) -> Tuple[bool, float, float]:
        """
        Evaluates the caller's acoustic response to the issued challenge.
        Supports automated ASR digit verification and manual operator override.
        """
        record = self._active_challenges.get(session_id)
        if not record or record.status != ChallengeStatus.ISSUED:
            return False, 0.0, 0.0

        now = timestamp if timestamp is not None else time.time()
        turnaround_ms = (now - record.issued_at) * 1000.0
        record.resolved_at = now
        record.latency_ms = turnaround_ms

        if manual_passed is not None:
            # Operator escalation override
            passed = manual_passed
            liveness_score = 0.95 if passed else 0.10
        elif detected_answer is not None and len(detected_answer) > 0:
            # Automated ASR digit verification against expected_answer (strict exact match)
            exp = record.expected_answer or ""
            matched = (exp == detected_answer)
            if matched and is_speech:
                passed = True
                conf = asr_confidence if asr_confidence is not None else 0.85
                liveness_score = min(0.99, max(0.88, 0.88 + (conf * 0.10)))
            else:
                passed = False
                liveness_score = 0.12
        else:
            if not is_speech or rms_db < -45.0:
                passed = False
                liveness_score = 0.05
            elif 250.0 <= turnaround_ms <= 3500.0:
                passed = True
                liveness_score = 0.90
            elif turnaround_ms < 250.0:
                passed = False
                liveness_score = 0.30
            else:
                passed = False
                liveness_score = 0.20

        record.status = ChallengeStatus.PASSED if passed else ChallengeStatus.FAILED
        record.liveness_score = liveness_score
        # Enforce cooldown period after resolving
        self._session_cooldown_until[session_id] = now + self.CHALLENGE_COOLDOWN_SECONDS
        logger.info(
            f"Challenge [{record.challenge_id}] resolved: passed={passed}, liveness={liveness_score:.2f}, "
            f"latency={turnaround_ms:.1f}ms, expected='{record.expected_answer}', detected='{detected_answer}'. "
            f"Cooldown active until {self._session_cooldown_until[session_id]:.1f}",
            extra={
                "session_id": session_id,
                "event_type": "challenge_resolved",
                "payload": {
                    "challenge_id": record.challenge_id,
                    "passed": passed,
                    "liveness": round(liveness_score, 2),
                    "latency_ms": round(turnaround_ms, 1),
                },
            },
        )
        return passed, liveness_score, turnaround_ms


class FusionEngine:
    """
    Fuses passive AASIST deepfake score with active challenge state and
    turnaround response latency into an explainable security verdict.
    Implements adaptive speech-gated EMA smoothing and Schmitt-trigger temporal hysteresis.
    """

    def __init__(
        self,
        ema_alpha: float = 0.20,
        safe_threshold: float = SAFE_THRESHOLD,
        step_up_threshold: float = STEP_UP_THRESHOLD,
    ):
        self.ema_alpha = ema_alpha
        self.safe_threshold = float(safe_threshold)
        self.step_up_threshold = float(step_up_threshold)
        self._session_smoothed: Dict[str, float] = {}
        self._session_consecutive_high: Dict[str, int] = {}
        self._session_challenge_dispatched: Dict[str, Optional[str]] = {}
        self._session_verdict: Dict[str, str] = {}
        self.challenge_engine = ChallengeEngine()
        self.timing_profiler = TurnaroundLatencyProfiler()

    def set_thresholds(self, safe_threshold: float, step_up_threshold: float) -> None:
        """
        Dynamically updates operational decision thresholds used across live streaming and batch scoring.
        """
        self.safe_threshold = float(safe_threshold)
        self.step_up_threshold = float(step_up_threshold)
        logger.info(
            f"FusionEngine operational thresholds updated dynamically: safe={self.safe_threshold:.3f}, step_up={self.step_up_threshold:.3f}"
        )

    def cleanup_session(self, session_id: str) -> None:
        """
        Pops and releases all in-memory telemetry, challenge records, and timing profiler
        dictionaries for a terminated call session to eliminate memory leaks.
        """
        self._session_smoothed.pop(session_id, None)
        self._session_consecutive_high.pop(session_id, None)
        self._session_challenge_dispatched.pop(session_id, None)
        self._session_verdict.pop(session_id, None)
        self.challenge_engine.cleanup_session(session_id)
        self.timing_profiler.cleanup_session(session_id)

    def process_chunk(
        self,
        session_id: str,
        passive_score: float,
        is_speech: bool = True,
        rms_db: float = -20.0,
        manual_challenge_action: Optional[str] = None,
        manual_liveness_passed: Optional[bool] = None,
        detected_answer: Optional[str] = None,
        asr_confidence: Optional[float] = None,
        timestamp: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Executes multi-modal fusion for an incoming audio chunk with anti-jitter smoothing.
        """
        now = timestamp or time.time()

        # 1. Adaptive Speech-Gated EMA Smoothing
        prev_smoothed = self._session_smoothed.get(session_id, passive_score)
        if is_speech:
            smoothed = (self.ema_alpha * passive_score) + ((1.0 - self.ema_alpha) * prev_smoothed)
            self._session_smoothed[session_id] = smoothed

            # Track consecutive high-risk speech frames for temporal hysteresis
            if smoothed >= self.step_up_threshold:
                self._session_consecutive_high[session_id] = self._session_consecutive_high.get(session_id, 0) + 1
            else:
                self._session_consecutive_high[session_id] = max(0, self._session_consecutive_high.get(session_id, 0) - 1)
        else:
            # Silence / ambient noise: hold smoothed score steady, decay consecutive high counter
            smoothed = prev_smoothed
            self._session_consecutive_high[session_id] = max(0, self._session_consecutive_high.get(session_id, 0) - 1)

        current_challenge = self.challenge_engine.get_current_challenge(session_id, timestamp=now)
        challenge_state_obj = ChallengeState(event=EventType.NORMAL)
        fused_risk_score = smoothed

        # 2. Evaluate Turnaround Latency & Speech Onset
        timing_profile = self.timing_profiler.evaluate_speech_onset(session_id, is_speech, ts=now)

        # 3. Handle Manual and Auto Challenges with Single-Dispatch Guarantee
        if manual_challenge_action == "trigger_challenge":
            ch_record = self.challenge_engine.issue_challenge(session_id, timestamp=now)
            self.timing_profiler.mark_prompt_issued(session_id, ts=now)
            self._session_challenge_dispatched[session_id] = ch_record.challenge_id
            challenge_state_obj = ChallengeState(
                event=EventType.CHALLENGE_FIRED,
                challenge_id=ch_record.challenge_id,
                challenge_type=ch_record.challenge_type,
                prompt_text=ch_record.prompt_text,
                liveness_passed=None,
            )
        elif manual_challenge_action == "resolve_challenge" or (detected_answer is not None and current_challenge and current_challenge.status == ChallengeStatus.ISSUED):
            passed, liveness, lat_ms = self.challenge_engine.evaluate_response(
                session_id=session_id,
                is_speech=is_speech,
                rms_db=rms_db,
                detected_answer=detected_answer,
                asr_confidence=asr_confidence,
                manual_passed=manual_liveness_passed,
                timestamp=now,
            )
            ch_rec = self.challenge_engine._active_challenges.get(session_id)
            self._session_challenge_dispatched[session_id] = None
            active_risk = 1.0 - liveness
            fused_risk_score = max(0.01, min(0.999, (0.55 * smoothed) + (0.45 * active_risk)))
            self._session_smoothed[session_id] = fused_risk_score
            challenge_state_obj = ChallengeState(
                event=EventType.CHALLENGE_RESPONSE,
                challenge_id=ch_rec.challenge_id if ch_rec else "ch_resolved",
                challenge_type=ch_rec.challenge_type if ch_rec else "digit_repeat",
                prompt_text=ch_rec.prompt_text if ch_rec else None,
                liveness_passed=passed,
                liveness_score=round(liveness, 4),
                turnaround_ms=round(lat_ms, 1),
                fused_score=round(fused_risk_score, 4),
                passive_score_before=round(smoothed, 4),
            )

        elif current_challenge and current_challenge.status == ChallengeStatus.ISSUED:
            # Challenge is currently pending
            # Only emit CHALLENGE_FIRED if it hasn't been emitted yet for this challenge_id
            if self._session_challenge_dispatched.get(session_id) == current_challenge.challenge_id:
                # Already dispatched! Emit NORMAL to prevent multi-popup storm
                challenge_state_obj = ChallengeState(
                    event=EventType.NORMAL,
                    challenge_id=current_challenge.challenge_id,
                    challenge_type=current_challenge.challenge_type,
                    prompt_text=current_challenge.prompt_text,
                    liveness_passed=None,
                )
            else:
                self._session_challenge_dispatched[session_id] = current_challenge.challenge_id
                challenge_state_obj = ChallengeState(
                    event=EventType.CHALLENGE_FIRED,
                    challenge_id=current_challenge.challenge_id,
                    challenge_type=current_challenge.challenge_type,
                    prompt_text=current_challenge.prompt_text,
                    liveness_passed=None,
                )

        elif self._session_consecutive_high.get(session_id, 0) >= 3 and self.challenge_engine.can_issue_challenge(session_id, now):
            # 4. Auto-escalate ONLY after 3 sustained consecutive high-risk speech chunks AND passing cooldown
            auto_ch = self.challenge_engine.issue_challenge(session_id, timestamp=now)
            self.timing_profiler.mark_prompt_issued(session_id, ts=now)
            self._session_challenge_dispatched[session_id] = auto_ch.challenge_id
            challenge_state_obj = ChallengeState(
                event=EventType.CHALLENGE_FIRED,
                challenge_id=auto_ch.challenge_id,
                challenge_type=auto_ch.challenge_type,
                prompt_text=auto_ch.prompt_text,
                liveness_passed=None,
            )

        # 5. Fuse Timing Anomaly Penalty if Available
        if timing_profile:
            fused_risk_score = max(0.01, min(0.999, fused_risk_score + timing_profile.anomaly_penalty))

        # 6. Schmitt-Trigger Temporal Hysteresis for Security Verdict
        prev_verdict = self._session_verdict.get(session_id, RiskVerdict.ALLOW.value)
        consecutive_high = self._session_consecutive_high.get(session_id, 0)

        if fused_risk_score > self.step_up_threshold and consecutive_high >= 3:
            verdict = RiskVerdict.STEP_UP_VERIFICATION.value
            acoustic_type = VerdictType.SPOOF.value
        elif fused_risk_score >= self.safe_threshold or (prev_verdict == RiskVerdict.STEP_UP_VERIFICATION.value and fused_risk_score >= 0.50):
            verdict = RiskVerdict.WARN.value
            acoustic_type = VerdictType.UNCERTAIN.value
        else:
            verdict = RiskVerdict.ALLOW.value
            acoustic_type = VerdictType.BONAFIDE.value

        self._session_verdict[session_id] = verdict

        return {
            "passive_score": round(passive_score, 4),
            "smoothed_score": round(smoothed, 4),
            "fused_risk_score": round(fused_risk_score, 4),
            "voice_trust_score": round(max(0.01, min(0.99, 1.0 - fused_risk_score)), 4),
            "verdict": verdict,
            "acoustic_type": acoustic_type,
            "challenge_state": challenge_state_obj,
            "timing_profile": timing_profile.to_dict() if timing_profile else None,
        }


# Global Singleton with balanced 0.20 EMA smoothing
fusion_engine = FusionEngine(ema_alpha=0.20)
