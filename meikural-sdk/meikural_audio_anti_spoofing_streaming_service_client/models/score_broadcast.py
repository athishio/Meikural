from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.event_type import EventType
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.anti_spoofing_result import AntiSpoofingResult
  from ..models.audio_health import AudioHealth
  from ..models.challenge_state import ChallengeState
  from ..models.metadata_info import MetadataInfo





T = TypeVar("T", bound="ScoreBroadcast")



@_attrs_define
class ScoreBroadcast:
    """ Production-grade score broadcast schema.
    Includes root-level backward compatibility fields + structured sub-models.

        Attributes:
            score (float): Passive spoof score [0.0 - 1.0]
            metadata (MetadataInfo):
            audio_health (AudioHealth):
            anti_spoofing (AntiSpoofingResult):
            challenge_state (ChallengeState):
            timestamp (float | Unset): Unix epoch timestamp
            event (EventType | Unset):
     """

    score: float
    metadata: MetadataInfo
    audio_health: AudioHealth
    anti_spoofing: AntiSpoofingResult
    challenge_state: ChallengeState
    timestamp: float | Unset = UNSET
    event: EventType | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.anti_spoofing_result import AntiSpoofingResult # noqa: PLC0415
        from ..models.audio_health import AudioHealth # noqa: PLC0415
        from ..models.challenge_state import ChallengeState # noqa: PLC0415
        from ..models.metadata_info import MetadataInfo # noqa: PLC0415
        score = self.score

        metadata = self.metadata.to_dict()

        audio_health = self.audio_health.to_dict()

        anti_spoofing = self.anti_spoofing.to_dict()

        challenge_state = self.challenge_state.to_dict()

        timestamp = self.timestamp

        event: str | Unset = UNSET
        if not isinstance(self.event, Unset):
            event = self.event.value



        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "score": score,
            "metadata": metadata,
            "audio_health": audio_health,
            "anti_spoofing": anti_spoofing,
            "challenge_state": challenge_state,
        })
        if timestamp is not UNSET:
            field_dict["timestamp"] = timestamp
        if event is not UNSET:
            field_dict["event"] = event

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.anti_spoofing_result import AntiSpoofingResult # noqa: PLC0415
        from ..models.audio_health import AudioHealth # noqa: PLC0415
        from ..models.challenge_state import ChallengeState # noqa: PLC0415
        from ..models.metadata_info import MetadataInfo # noqa: PLC0415
        d = dict(src_dict)
        score = d.pop("score")

        metadata = MetadataInfo.from_dict(d.pop("metadata"))




        audio_health = AudioHealth.from_dict(d.pop("audio_health"))




        anti_spoofing = AntiSpoofingResult.from_dict(d.pop("anti_spoofing"))




        challenge_state = ChallengeState.from_dict(d.pop("challenge_state"))




        timestamp = d.pop("timestamp", UNSET)

        _event = d.pop("event", UNSET)
        event: EventType | Unset
        if isinstance(_event,  Unset):
            event = UNSET
        else:
            event = EventType(_event)




        score_broadcast = cls(
            score=score,
            metadata=metadata,
            audio_health=audio_health,
            anti_spoofing=anti_spoofing,
            challenge_state=challenge_state,
            timestamp=timestamp,
            event=event,
        )


        score_broadcast.additional_properties = d
        return score_broadcast

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
