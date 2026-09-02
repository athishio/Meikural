from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast

if TYPE_CHECKING:
  from ..models.alert_response_email import AlertResponseEmail
  from ..models.alert_response_sms import AlertResponseSms





T = TypeVar("T", bound="AlertResponse")



@_attrs_define
class AlertResponse:
    """ 
        Attributes:
            session_id (str):
            risk_score (float):
            sms (AlertResponseSms):
            email (AlertResponseEmail):
     """

    session_id: str
    risk_score: float
    sms: AlertResponseSms
    email: AlertResponseEmail
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.alert_response_email import AlertResponseEmail # noqa: PLC0415
        from ..models.alert_response_sms import AlertResponseSms # noqa: PLC0415
        session_id = self.session_id

        risk_score = self.risk_score

        sms = self.sms.to_dict()

        email = self.email.to_dict()


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
            "session_id": session_id,
            "risk_score": risk_score,
            "sms": sms,
            "email": email,
        })

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.alert_response_email import AlertResponseEmail # noqa: PLC0415
        from ..models.alert_response_sms import AlertResponseSms # noqa: PLC0415
        d = dict(src_dict)
        session_id = d.pop("session_id")

        risk_score = d.pop("risk_score")

        sms = AlertResponseSms.from_dict(d.pop("sms"))




        email = AlertResponseEmail.from_dict(d.pop("email"))




        alert_response = cls(
            session_id=session_id,
            risk_score=risk_score,
            sms=sms,
            email=email,
        )


        alert_response.additional_properties = d
        return alert_response

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
