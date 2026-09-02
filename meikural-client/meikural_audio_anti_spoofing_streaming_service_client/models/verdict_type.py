from enum import StrEnum

class VerdictType(StrEnum):
    BONAFIDE = "bonafide"
    SILENCE = "silence"
    SPOOF = "spoof"
    UNCERTAIN = "uncertain"

    def __str__(self) -> str:
        return str(self.value)
