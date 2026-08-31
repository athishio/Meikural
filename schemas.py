import time
from enum import Enum
from typing import List, Optional
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
    # Top-level backward compatibility fields
    timestamp: float = Field(default_factory=time.time, description="Unix epoch timestamp")
    score: float = Field(..., ge=0.0, le=1.0, description="Passive spoof score [0.0 - 1.0]")
    event: EventType = Field(default=EventType.NORMAL, description="Event tag")

    # Structured metadata sections
    metadata: MetadataInfo
    audio_health: AudioHealth
    anti_spoofing: AntiSpoofingResult
    challenge_state: ChallengeState
