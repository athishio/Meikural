from enum import StrEnum

class EventType(StrEnum):
    CHALLENGE_FIRED = "challenge_fired"
    CHALLENGE_RESPONSE = "challenge_response"
    NORMAL = "normal"

    def __str__(self) -> str:
        return str(self.value)
