from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.event_type import EventType
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="ChallengeState")



@_attrs_define
class ChallengeState:
    """ 
        Attributes:
            event (EventType | Unset):
            challenge_id (None | str | Unset): Unique challenge prompt ID Example: ch_987.
            challenge_type (None | str | Unset): Type: phrase_repeat, digit_repeat, etc. Example: digit_repeat.
            prompt_text (None | str | Unset): Prompt text to display to user Example: Please repeat: 8 - 4 - 2.
            liveness_passed (bool | None | Unset): Active liveness challenge outcome Example: True.
     """

    event: EventType | Unset = UNSET
    challenge_id: None | str | Unset = UNSET
    challenge_type: None | str | Unset = UNSET
    prompt_text: None | str | Unset = UNSET
    liveness_passed: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        event: str | Unset = UNSET
        if not isinstance(self.event, Unset):
            event = self.event.value


        challenge_id: None | str | Unset
        if isinstance(self.challenge_id, Unset):
            challenge_id = UNSET
        else:
            challenge_id = self.challenge_id

        challenge_type: None | str | Unset
        if isinstance(self.challenge_type, Unset):
            challenge_type = UNSET
        else:
            challenge_type = self.challenge_type

        prompt_text: None | str | Unset
        if isinstance(self.prompt_text, Unset):
            prompt_text = UNSET
        else:
            prompt_text = self.prompt_text

        liveness_passed: bool | None | Unset
        if isinstance(self.liveness_passed, Unset):
            liveness_passed = UNSET
        else:
            liveness_passed = self.liveness_passed


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if event is not UNSET:
            field_dict["event"] = event
        if challenge_id is not UNSET:
            field_dict["challenge_id"] = challenge_id
        if challenge_type is not UNSET:
            field_dict["challenge_type"] = challenge_type
        if prompt_text is not UNSET:
            field_dict["prompt_text"] = prompt_text
        if liveness_passed is not UNSET:
            field_dict["liveness_passed"] = liveness_passed

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _event = d.pop("event", UNSET)
        event: EventType | Unset
        if isinstance(_event,  Unset):
            event = UNSET
        else:
            event = EventType(_event)




        def _parse_challenge_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        challenge_id = _parse_challenge_id(d.pop("challenge_id", UNSET))


        def _parse_challenge_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        challenge_type = _parse_challenge_type(d.pop("challenge_type", UNSET))


        def _parse_prompt_text(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        prompt_text = _parse_prompt_text(d.pop("prompt_text", UNSET))


        def _parse_liveness_passed(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        liveness_passed = _parse_liveness_passed(d.pop("liveness_passed", UNSET))


        challenge_state = cls(
            event=event,
            challenge_id=challenge_id,
            challenge_type=challenge_type,
            prompt_text=prompt_text,
            liveness_passed=liveness_passed,
        )


        challenge_state.additional_properties = d
        return challenge_state

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
