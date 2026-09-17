from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="AlertTriggerRequest")



@_attrs_define
class AlertTriggerRequest:
    """ 
        Attributes:
            session_id (str):
            risk_score (float):
            to_phone (None | str | Unset):
            to_email (None | str | Unset):
     """

    session_id: str
    risk_score: float
    to_phone: None | str | Unset = UNSET
    to_email: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        session_id = self.session_id

        risk_score = self.risk_score

        to_phone: None | str | Unset
        if isinstance(self.to_phone, Unset):
            to_phone = UNSET
        else:
            to_phone = self.to_phone

        to_email: None | str | Unset
        if isinstance(self.to_email, Unset):
            to_email = UNSET
        else:
            to_email = self.to_email


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "session_id": session_id,
            "risk_score": risk_score,
        })
        if to_phone is not UNSET:
            field_dict["to_phone"] = to_phone
        if to_email is not UNSET:
            field_dict["to_email"] = to_email

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        session_id = d.pop("session_id")

        risk_score = d.pop("risk_score")

        def _parse_to_phone(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        to_phone = _parse_to_phone(d.pop("to_phone", UNSET))


        def _parse_to_email(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        to_email = _parse_to_email(d.pop("to_email", UNSET))


        alert_trigger_request = cls(
            session_id=session_id,
            risk_score=risk_score,
            to_phone=to_phone,
            to_email=to_email,
        )


        alert_trigger_request.additional_properties = d
        return alert_trigger_request

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
