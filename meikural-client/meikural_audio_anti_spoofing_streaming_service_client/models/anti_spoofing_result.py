from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.confidence_level import ConfidenceLevel
from ..models.verdict_type import VerdictType
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="AntiSpoofingResult")



@_attrs_define
class AntiSpoofingResult:
    """ 
        Attributes:
            passive_score (float): Passive spoof probability [0.0 - 1.0] Example: 0.73.
            verdict (VerdictType):
            confidence (ConfidenceLevel):
            threshold_used (float | Unset): Decision threshold applied Default: 0.5. Example: 0.5.
            raw_logits (list[float] | None | Unset): [spoof_logit, bonafide_logit] Example: [3.45, -2.1].
     """

    passive_score: float
    verdict: VerdictType
    confidence: ConfidenceLevel
    threshold_used: float | Unset = 0.5
    raw_logits: list[float] | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        passive_score = self.passive_score

        verdict = self.verdict.value

        confidence = self.confidence.value

        threshold_used = self.threshold_used

        raw_logits: list[float] | None | Unset
        if isinstance(self.raw_logits, Unset):
            raw_logits = UNSET
        elif isinstance(self.raw_logits, list):
            raw_logits = self.raw_logits


        else:
            raw_logits = self.raw_logits


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "passive_score": passive_score,
            "verdict": verdict,
            "confidence": confidence,
        })
        if threshold_used is not UNSET:
            field_dict["threshold_used"] = threshold_used
        if raw_logits is not UNSET:
            field_dict["raw_logits"] = raw_logits

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        passive_score = d.pop("passive_score")

        verdict = VerdictType(d.pop("verdict"))




        confidence = ConfidenceLevel(d.pop("confidence"))




        threshold_used = d.pop("threshold_used", UNSET)

        def _parse_raw_logits(data: object) -> list[float] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                raw_logits_type_0 = cast(list[float], data)

                return raw_logits_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[float] | None | Unset, data)

        raw_logits = _parse_raw_logits(d.pop("raw_logits", UNSET))


        anti_spoofing_result = cls(
            passive_score=passive_score,
            verdict=verdict,
            confidence=confidence,
            threshold_used=threshold_used,
            raw_logits=raw_logits,
        )


        anti_spoofing_result.additional_properties = d
        return anti_spoofing_result

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
