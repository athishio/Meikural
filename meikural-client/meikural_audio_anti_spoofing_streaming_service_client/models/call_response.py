from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="CallResponse")



@_attrs_define
class CallResponse:
    """ 
        Attributes:
            session_id (str): Unique call UUID
            caller_id_hash (str): Salted SHA-256 hash of caller ID
            start_time (float): Call start unix timestamp
            retention_expiry (float): Auto-purge timestamp (start_time + 90 days)
            end_time (float | None | Unset): Call termination unix timestamp
            final_risk_score (float | None | Unset): Aggregate final risk score
            final_verdict (None | str | Unset): ALLOW, WARN, or STEP_UP_VERIFICATION
            challenge_fired (bool | Unset): Whether active challenge protocol was invoked Default: False.
     """

    session_id: str
    caller_id_hash: str
    start_time: float
    retention_expiry: float
    end_time: float | None | Unset = UNSET
    final_risk_score: float | None | Unset = UNSET
    final_verdict: None | str | Unset = UNSET
    challenge_fired: bool | Unset = False
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        session_id = self.session_id

        caller_id_hash = self.caller_id_hash

        start_time = self.start_time

        retention_expiry = self.retention_expiry

        end_time: float | None | Unset
        if isinstance(self.end_time, Unset):
            end_time = UNSET
        else:
            end_time = self.end_time

        final_risk_score: float | None | Unset
        if isinstance(self.final_risk_score, Unset):
            final_risk_score = UNSET
        else:
            final_risk_score = self.final_risk_score

        final_verdict: None | str | Unset
        if isinstance(self.final_verdict, Unset):
            final_verdict = UNSET
        else:
            final_verdict = self.final_verdict

        challenge_fired = self.challenge_fired


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "session_id": session_id,
            "caller_id_hash": caller_id_hash,
            "start_time": start_time,
            "retention_expiry": retention_expiry,
        })
        if end_time is not UNSET:
            field_dict["end_time"] = end_time
        if final_risk_score is not UNSET:
            field_dict["final_risk_score"] = final_risk_score
        if final_verdict is not UNSET:
            field_dict["final_verdict"] = final_verdict
        if challenge_fired is not UNSET:
            field_dict["challenge_fired"] = challenge_fired

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        session_id = d.pop("session_id")

        caller_id_hash = d.pop("caller_id_hash")

        start_time = d.pop("start_time")

        retention_expiry = d.pop("retention_expiry")

        def _parse_end_time(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        end_time = _parse_end_time(d.pop("end_time", UNSET))


        def _parse_final_risk_score(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        final_risk_score = _parse_final_risk_score(d.pop("final_risk_score", UNSET))


        def _parse_final_verdict(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        final_verdict = _parse_final_verdict(d.pop("final_verdict", UNSET))


        challenge_fired = d.pop("challenge_fired", UNSET)

        call_response = cls(
            session_id=session_id,
            caller_id_hash=caller_id_hash,
            start_time=start_time,
            retention_expiry=retention_expiry,
            end_time=end_time,
            final_risk_score=final_risk_score,
            final_verdict=final_verdict,
            challenge_fired=challenge_fired,
        )


        call_response.additional_properties = d
        return call_response

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
