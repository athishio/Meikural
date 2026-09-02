import time
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EventType(str, Enum):
    NORMAL = "normal"
    CHALLENGE_FIRED = "challenge_fired"
    CHALLENGE_RESPONSE = "challenge_response"


class VerdictType(str, Enum):
    BONAFIDE = "bonafide"
    SPOOF = "spoof"
    UNCERTAIN = "uncertain"
    SILENCE = "silence"


class RiskVerdict(str, Enum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    STEP_UP_VERIFICATION = "STEP_UP_VERIFICATION"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class MetadataInfo(BaseModel):
    session_id: str = Field(..., description="Unique call/stream session ID", example="session_abc123")
    chunk_id: int = Field(..., description="Monotonically increasing chunk index", example=1)
    timestamp: float = Field(default_factory=time.time, description="Unix timestamp in seconds", example=1693612345.234)
    inference_latency_ms: float = Field(..., description="Model inference duration in milliseconds", example=48.2)


class AudioHealth(BaseModel):
    is_speech: bool = Field(..., description="Voice Activity Detection (VAD) flag", example=True)
    rms_db: float = Field(..., description="Audio signal root mean square energy in dB", example=-24.5)
    duration_ms: float = Field(..., description="Audio chunk duration in milliseconds", example=4037.5)


class AntiSpoofingResult(BaseModel):
    passive_score: float = Field(..., ge=0.0, le=1.0, description="Passive spoof probability [0.0 - 1.0]", example=0.73)
    verdict: VerdictType = Field(..., description="Categorical classification verdict", example=VerdictType.SPOOF)
    confidence: ConfidenceLevel = Field(..., description="Confidence level of classification", example=ConfidenceLevel.HIGH)
    threshold_used: float = Field(default=0.50, description="Decision threshold applied", example=0.50)
    raw_logits: Optional[List[float]] = Field(default=None, description="[spoof_logit, bonafide_logit]", example=[3.45, -2.10])


class ChallengeState(BaseModel):
    event: EventType = Field(default=EventType.NORMAL, description="Event protocol state", example=EventType.NORMAL)
    challenge_id: Optional[str] = Field(default=None, description="Unique challenge prompt ID", example="ch_987")
    challenge_type: Optional[str] = Field(default=None, description="Type: phrase_repeat, digit_repeat, etc.", example="digit_repeat")
    prompt_text: Optional[str] = Field(default=None, description="Prompt text to display to user", example="Please repeat: 8 - 4 - 2")
    liveness_passed: Optional[bool] = Field(default=None, description="Active liveness challenge outcome", example=True)


class ScoreBroadcast(BaseModel):
    """
    Production-grade score broadcast schema.
    Includes root-level backward compatibility fields + structured sub-models.
    """
    timestamp: float = Field(default_factory=time.time, description="Unix epoch timestamp")
    score: float = Field(..., ge=0.0, le=1.0, description="Passive spoof score [0.0 - 1.0]")
    event: EventType = Field(default=EventType.NORMAL, description="Event tag")

    # Structured metadata sections
    metadata: MetadataInfo
    audio_health: AudioHealth
    anti_spoofing: AntiSpoofingResult
    challenge_state: ChallengeState


# Zero-Trust Database & API Models
class CallCreateRequest(BaseModel):
    session_id: Optional[str] = Field(default=None, description="Unique session ID or auto-generated")
    raw_phone_number: str = Field(..., description="Raw caller phone number to be hashed via Salted SHA-256")
    retention_days: int = Field(default=90, description="Retention duration in days before auto-purge")


class CallResponse(BaseModel):
    session_id: str = Field(..., description="Unique call UUID")
    caller_id_hash: str = Field(..., description="Salted SHA-256 hash of caller ID")
    start_time: float = Field(..., description="Call start unix timestamp")
    end_time: Optional[float] = Field(default=None, description="Call termination unix timestamp")
    final_risk_score: Optional[float] = Field(default=None, description="Aggregate final risk score")
    final_verdict: Optional[str] = Field(default=None, description="ALLOW, WARN, or STEP_UP_VERIFICATION")
    challenge_fired: bool = Field(default=False, description="Whether active challenge protocol was invoked")
    retention_expiry: float = Field(..., description="Auto-purge timestamp (start_time + 90 days)")


class EventRecord(BaseModel):
    event_id: int
    session_id: str
    timestamp: float
    score: float
    smoothed_score: float
    verdict: str
    challenge_id: Optional[str] = None


class AlertTriggerRequest(BaseModel):
    session_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    to_phone: Optional[str] = None
    to_email: Optional[str] = None


class AlertResponse(BaseModel):
    session_id: str
    risk_score: float
    sms: Dict[str, Any]
    email: Dict[str, Any]


class PurgeResponse(BaseModel):
    purged_count: int
    timestamp: float
