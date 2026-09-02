from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="EventRecord")



@_attrs_define
class EventRecord:
    """ 
        Attributes:
            event_id (int):
            session_id (str):
            timestamp (float):
            score (float):
            smoothed_score (float):
            verdict (str):
            challenge_id (None | str | Unset):
     """

    event_id: int
    session_id: str
    timestamp: float
    score: float
    smoothed_score: float
    verdict: str
    challenge_id: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        event_id = self.event_id

        session_id = self.session_id

        timestamp = self.timestamp

        score = self.score

        smoothed_score = self.smoothed_score

        verdict = self.verdict

        challenge_id: None | str | Unset
        if isinstance(self.challenge_id, Unset):
            challenge_id = UNSET
        else:
            challenge_id = self.challenge_id


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "event_id": event_id,
            "session_id": session_id,
            "timestamp": timestamp,
            "score": score,
            "smoothed_score": smoothed_score,
            "verdict": verdict,
        })
        if challenge_id is not UNSET:
            field_dict["challenge_id"] = challenge_id

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        event_id = d.pop("event_id")

        session_id = d.pop("session_id")

        timestamp = d.pop("timestamp")

        score = d.pop("score")

        smoothed_score = d.pop("smoothed_score")

        verdict = d.pop("verdict")

        def _parse_challenge_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        challenge_id = _parse_challenge_id(d.pop("challenge_id", UNSET))


        event_record = cls(
            event_id=event_id,
            session_id=session_id,
            timestamp=timestamp,
            score=score,
            smoothed_score=smoothed_score,
            verdict=verdict,
            challenge_id=challenge_id,
        )


        event_record.additional_properties = d
        return event_record

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
