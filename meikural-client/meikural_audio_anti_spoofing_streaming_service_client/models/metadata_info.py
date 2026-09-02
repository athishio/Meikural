from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="MetadataInfo")



@_attrs_define
class MetadataInfo:
    """ 
        Attributes:
            session_id (str): Unique call/stream session ID Example: session_abc123.
            chunk_id (int): Monotonically increasing chunk index Example: 1.
            inference_latency_ms (float): Model inference duration in milliseconds Example: 48.2.
            timestamp (float | Unset): Unix timestamp in seconds Example: 1693612345.234.
     """

    session_id: str
    chunk_id: int
    inference_latency_ms: float
    timestamp: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        session_id = self.session_id

        chunk_id = self.chunk_id

        inference_latency_ms = self.inference_latency_ms

        timestamp = self.timestamp


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "session_id": session_id,
            "chunk_id": chunk_id,
            "inference_latency_ms": inference_latency_ms,
        })
        if timestamp is not UNSET:
            field_dict["timestamp"] = timestamp

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        session_id = d.pop("session_id")

        chunk_id = d.pop("chunk_id")

        inference_latency_ms = d.pop("inference_latency_ms")

        timestamp = d.pop("timestamp", UNSET)

        metadata_info = cls(
            session_id=session_id,
            chunk_id=chunk_id,
            inference_latency_ms=inference_latency_ms,
            timestamp=timestamp,
        )


        metadata_info.additional_properties = d
        return metadata_info

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
