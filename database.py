"""
database.py - Meikural Zero-Trust Privacy SQLite Audit Database Module
======================================================================
Adheres strictly to zero-trust privacy and regulatory compliance:
- Raw caller phone numbers are never stored in plaintext.
- Salted SHA-256 hashing is enforced with a secure salt.
- Calls table retains call metadata with 90-day auto-purge expiry compliance.
- Events table tracks per-chunk spoof scores, smoothed scores, verdicts, and challenge telemetry.
"""

import hashlib
import logging
import sqlite3
import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

logger = logging.getLogger("meikural_database")

DB_PATH = "meikural_audit.db"
SALT = "MEIKURAL_SECURE_SALT_2026"
RETENTION_PERIOD_SECONDS = 90 * 86400  # 90 days in seconds


def hash_caller_id(caller_id: str) -> str:
    """
    Computes a salted SHA-256 hash for caller phone numbers to ensure zero-trust privacy:
    hashlib.sha256((SALT + caller_id).encode()).hexdigest()
    Raw phone numbers are never persisted.
    """
    if not caller_id:
        return ""
    return hashlib.sha256((SALT + caller_id).encode("utf-8")).hexdigest()


@contextmanager
def get_db_connection(db_path: str = DB_PATH):
    """
    Context manager for SQLite database connection.
    """
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction error: {e}")
        raise
    finally:
        conn.close()


def init_db(db_path: str = DB_PATH) -> None:
    """
    Initializes the SQLite database with the required zero-trust privacy schema.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # Table 1: calls
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS calls (
                session_id TEXT PRIMARY KEY,
                caller_id_hash TEXT NOT NULL,
                start_time REAL NOT NULL,
                end_time REAL,
                final_risk_score REAL,
                final_verdict TEXT,
                challenge_fired BOOLEAN DEFAULT 0,
                retention_expiry REAL NOT NULL
            )
        """)

        # Table 2: events
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                score REAL NOT NULL,
                smoothed_score REAL NOT NULL,
                verdict TEXT NOT NULL,
                challenge_id TEXT,
                FOREIGN KEY (session_id) REFERENCES calls (session_id) ON DELETE CASCADE
            )
        """)

        # Indexes for fast lookup and purge operations
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_calls_retention_expiry ON calls (retention_expiry)")

        logger.info(f"Meikural database initialized at {db_path}")


def log_call_start(
    session_id: str,
    caller_id: Optional[str] = None,
    caller_id_hash: Optional[str] = None,
    start_time: Optional[float] = None,
    retention_days: int = 90,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """
    Logs the start of a call session with salted hashed caller ID and 90-day retention expiry.
    """
    st = start_time if start_time is not None else time.time()
    retention_expiry = st + (retention_days * 86400)

    # Determine final hash
    if caller_id_hash:
        final_hash = caller_id_hash
    elif caller_id:
        if len(caller_id) == 64 and all(c in "0123456789abcdefABCDEF" for c in caller_id):
            final_hash = caller_id.lower()
        else:
            final_hash = hash_caller_id(caller_id)
    else:
        final_hash = hash_caller_id(session_id)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO calls (
                session_id, caller_id_hash, start_time, end_time,
                final_risk_score, final_verdict, challenge_fired, retention_expiry
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, final_hash, st, None, 0.0, "INITIALIZING", 0, retention_expiry),
        )
    return {
        "session_id": session_id,
        "caller_id_hash": final_hash,
        "start_time": st,
        "retention_expiry": retention_expiry,
    }


def log_event(
    session_id: str,
    score: float,
    smoothed_score: float,
    verdict: str,
    challenge_id: Optional[str] = None,
    timestamp: Optional[float] = None,
    db_path: str = DB_PATH,
) -> int:
    """
    Logs a real-time event/chunk inference result for a session.
    """
    ts = timestamp if timestamp is not None else time.time()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO events (session_id, timestamp, score, smoothed_score, verdict, challenge_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (session_id, ts, score, smoothed_score, verdict, challenge_id),
        )
        event_id = cursor.lastrowid
        return event_id


def log_call_end(
    session_id: str,
    final_risk_score: float,
    final_verdict: str,
    challenge_fired: bool = False,
    end_time: Optional[float] = None,
    db_path: str = DB_PATH,
) -> bool:
    """
    Logs call completion with final risk assessment and challenge outcome.
    """
    et = end_time if end_time is not None else time.time()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE calls
            SET end_time = ?, final_risk_score = ?, final_verdict = ?, challenge_fired = ?
            WHERE session_id = ?
            """,
            (et, final_risk_score, final_verdict, 1 if challenge_fired else 0, session_id),
        )
        return cursor.rowcount > 0


def get_call_summary(session_id: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """
    Retrieves a call summary record by session_id.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calls WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_recent_calls(limit: int = 20, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """
    Retrieves the most recent call sessions ordered by start_time descending.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calls ORDER BY start_time DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def get_events(session_id: str, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """
    Retrieves all chronological events for a given session_id.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def purge_expired_records(current_time: Optional[float] = None, db_path: str = DB_PATH) -> int:
    """
    Demonstrates 90-day auto-purge compliance: Deletes calls and associated events where retention_expiry < now.
    """
    now = current_time if current_time is not None else time.time()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Find expired sessions
        cursor.execute("SELECT session_id FROM calls WHERE retention_expiry < ?", (now,))
        expired_sessions = [row["session_id"] for row in cursor.fetchall()]

        if expired_sessions:
            placeholders = ",".join("?" for _ in expired_sessions)
            cursor.execute(f"DELETE FROM events WHERE session_id IN ({placeholders})", expired_sessions)
            cursor.execute(f"DELETE FROM calls WHERE session_id IN ({placeholders})", expired_sessions)
            logger.info(f"Purged {len(expired_sessions)} expired call sessions adhering to retention policy.")
            return len(expired_sessions)
        return 0


# Backward compatibility aliases
create_call = log_call_start
record_event = log_event
finalize_call = log_call_end
get_call = get_call_summary

# Self-initialization on import
init_db()
