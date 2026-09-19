"""
structured_logger.py - Enterprise Structured JSON Logging for MEIKURAL SOC
==========================================================================
Formats log records as JSON lines with standardized SOC metadata:
- timestamp (ISO-8601 UTC)
- level (INFO, WARNING, ERROR, CRITICAL)
- logger (module namespace)
- session_id (correlated call session)
- event_type (lifecycle event tag)
- message
- payload (contextual forensics: risk scores, latencies, challenge tokens)
"""

from datetime import datetime, timezone
import json
import logging
import os
import sys
from typing import Any, Dict, Optional


class SOCJSONFormatter(logging.Formatter):
    """
    Standardizes Python logging records into JSON formatted strings for
    enterprise Security Operations Center (SOC) observability.
    """

    def __init__(self, service_name: str = "meikural-soc"):
        super().__init__()
        self.service_name = service_name
        self.environment = os.getenv("ENVIRONMENT", "development").lower()

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": self.service_name,
            "environment": self.environment,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Correlated SOC Fields
        if hasattr(record, "session_id") and record.session_id:
            log_entry["session_id"] = record.session_id
        if hasattr(record, "event_type") and record.event_type:
            log_entry["event_type"] = record.event_type
        if hasattr(record, "payload") and isinstance(record.payload, dict):
            log_entry["payload"] = record.payload

        # Exception details if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_soc_logging(
    level: int = logging.INFO,
    json_format: Optional[bool] = None,
) -> None:
    """
    Configures root and Meikural loggers.
    If json_format is None, enables JSON formatting in production or when SOC_JSON_LOGS=1.
    """
    if json_format is None:
        json_format = (
            os.getenv("ENVIRONMENT", "development").lower() == "production"
            or os.getenv("SOC_JSON_LOGS", "0").lower() in ("1", "true", "yes")
        )

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    if json_format:
        handler.setFormatter(SOCJSONFormatter())
    else:
        fmt = "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
        handler.setFormatter(logging.Formatter(fmt))

    root_logger.addHandler(handler)


def get_soc_logger(name: str = "meikural_soc") -> logging.Logger:
    return logging.getLogger(name)
