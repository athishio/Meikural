from enum import StrEnum

class RiskVerdict(StrEnum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    STEP_UP_VERIFICATION = "STEP_UP_VERIFICATION"

    def __str__(self) -> str:
        return str(self.value)
