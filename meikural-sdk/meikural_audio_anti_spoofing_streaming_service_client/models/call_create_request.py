from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="CallCreateRequest")



@_attrs_define
class CallCreateRequest:
    """ 
        Attributes:
            raw_phone_number (str): Raw caller phone number to be hashed via Salted SHA-256
            session_id (None | str | Unset): Unique session ID or auto-generated
            retention_days (int | Unset): Retention duration in days before auto-purge Default: 90.
     """

    raw_phone_number: str
    session_id: None | str | Unset = UNSET
    retention_days: int | Unset = 90
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        raw_phone_number = self.raw_phone_number

        session_id: None | str | Unset
        if isinstance(self.session_id, Unset):
            session_id = UNSET
        else:
            session_id = self.session_id

        retention_days = self.retention_days


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "raw_phone_number": raw_phone_number,
        })
        if session_id is not UNSET:
            field_dict["session_id"] = session_id
        if retention_days is not UNSET:
            field_dict["retention_days"] = retention_days

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        raw_phone_number = d.pop("raw_phone_number")

        def _parse_session_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        session_id = _parse_session_id(d.pop("session_id", UNSET))


        retention_days = d.pop("retention_days", UNSET)

        call_create_request = cls(
            raw_phone_number=raw_phone_number,
            session_id=session_id,
            retention_days=retention_days,
        )


        call_create_request.additional_properties = d
        return call_create_request

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
