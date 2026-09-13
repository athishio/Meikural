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
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("meikural_database")

DB_PATH = "meikural_audit.db"
SALT = "MEIKURAL_SECURE_SALT_2026"
RETENTION_PERIOD_SECONDS = 90 * 86400  # 90 days in seconds
GENESIS_HASH = "0" * 64  # Initial seed hash for the appendable event hash-chain


def compute_event_hash(
    prev_hash: str,
    session_id: str,
    timestamp: float,
    score: float,
    verdict: str,
) -> str:
    """
    Computes a deterministic SHA-256 hash for an event record in the appendable hash-chain.
    Hash payload: prev_hash + session_id + timestamp + score + verdict
    Note: This is an appendable cryptographic hash-chain for tamper detection, not a distributed blockchain.
    """
    raw_payload = f"{prev_hash}{session_id}{timestamp:.4f}{score:.4f}{verdict}"
    return hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()


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

        # Table 2: events (Lightweight appendable SHA-256 hash-chain for tamper detection)
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                score REAL NOT NULL,
                smoothed_score REAL NOT NULL,
                verdict TEXT NOT NULL,
                challenge_id TEXT,
                prev_hash TEXT NOT NULL DEFAULT '{GENESIS_HASH}',
                record_hash TEXT NOT NULL DEFAULT '{GENESIS_HASH}',
                FOREIGN KEY (session_id) REFERENCES calls (session_id) ON DELETE CASCADE
            )
        """)

        # Column migration check for existing tables
        cursor.execute("PRAGMA table_info(events)")
        existing_cols = {row["name"] for row in cursor.fetchall()}
        if "prev_hash" not in existing_cols:
            cursor.execute(f"ALTER TABLE events ADD COLUMN prev_hash TEXT NOT NULL DEFAULT '{GENESIS_HASH}'")
        if "record_hash" not in existing_cols:
            cursor.execute(f"ALTER TABLE events ADD COLUMN record_hash TEXT NOT NULL DEFAULT '{GENESIS_HASH}'")

        # Indexes for fast lookup and purge operations
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_calls_retention_expiry ON calls (retention_expiry)")

        logger.info(f"Meikural database initialized at {db_path}")

    # Backfill any unchained legacy records where record_hash == GENESIS_HASH
    backfilled = backfill_legacy_event_hashes(db_path=db_path)
    if backfilled > 0:
        logger.info(f"Backfilled cryptographic hash-chain for {backfilled} legacy event records.")


def backfill_legacy_event_hashes(db_path: str = DB_PATH) -> int:
    """
    Backfills cryptographic SHA-256 hash-chains for legacy event records where record_hash == GENESIS_HASH.
    Ensures pre-existing sessions can be verified without false tamper alerts.
    Walks each session's events in insertion order (ORDER BY event_id ASC).
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT DISTINCT session_id FROM events WHERE record_hash = ?",
            (GENESIS_HASH,),
        )
        sessions = [r["session_id"] for r in cursor.fetchall()]
        if not sessions:
            return 0

        updated_count = 0
        for sid in sessions:
            cursor.execute(
                "SELECT event_id, session_id, timestamp, score, verdict FROM events WHERE session_id = ? ORDER BY event_id ASC",
                (sid,),
            )
            rows = cursor.fetchall()
            prev_h = GENESIS_HASH
            for r in rows:
                rec_h = compute_event_hash(
                    prev_hash=prev_h,
                    session_id=r["session_id"],
                    timestamp=r["timestamp"],
                    score=r["score"],
                    verdict=r["verdict"],
                )
                cursor.execute(
                    "UPDATE events SET prev_hash = ?, record_hash = ? WHERE event_id = ?",
                    (prev_h, rec_h, r["event_id"]),
                )
                prev_h = rec_h
                updated_count += 1
        return updated_count


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
    Logs a real-time event/chunk inference result for a session with appendable SHA-256 hash-chaining.
    Note: This is an appendable cryptographic hash-chain for tamper detection, not a distributed blockchain.
    """
    ts = timestamp if timestamp is not None else time.time()
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # Retrieve previous row's record_hash for this session
        cursor.execute(
            "SELECT record_hash FROM events WHERE session_id = ? ORDER BY event_id DESC LIMIT 1",
            (session_id,),
        )
        prev_row = cursor.fetchone()
        prev_hash = prev_row["record_hash"] if prev_row and prev_row["record_hash"] else GENESIS_HASH

        # Compute hash-chain record hash: sha256(prev_hash + session_id + timestamp + score + verdict)
        record_hash = compute_event_hash(
            prev_hash=prev_hash,
            session_id=session_id,
            timestamp=ts,
            score=score,
            verdict=verdict,
        )

        cursor.execute(
            """
            INSERT INTO events (session_id, timestamp, score, smoothed_score, verdict, challenge_id, prev_hash, record_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, ts, score, smoothed_score, verdict, challenge_id, prev_hash, record_hash),
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
        cursor.execute("SELECT * FROM events WHERE session_id = ? ORDER BY event_id ASC", (session_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


class ChainVerificationResult(tuple):
    """
    Result tuple for verify_chain, unpackable as (is_valid, broken_index).
    Attributes:
        valid (bool): True if all records in the hash-chain are cryptographically intact.
        broken_index (Optional[int]): 0-based index of the first record where the hash-chain breaks.
        total_events (int): Total number of events verified in the session.
    """
    def __new__(cls, valid: bool, broken_index: Optional[int], total_events: int = 0):
        return super().__new__(cls, (valid, broken_index))

    def __init__(self, valid: bool, broken_index: Optional[int], total_events: int = 0):
        self.valid = valid
        self.broken_index = broken_index
        self.total_events = total_events


def verify_chain(session_id: str, db_path: str = DB_PATH) -> ChainVerificationResult:
    """
    Walks all events for a given session and recomputes the appendable hash-chain.
    Returns (True, None) if intact, or (False, first_broken_index) if modified.

    Note: This is an appendable cryptographic hash-chain for tamper detection,
    not a distributed blockchain.
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE session_id = ? ORDER BY event_id ASC", (session_id,))
        events = [dict(r) for r in cursor.fetchall()]

    if not events:
        return ChainVerificationResult(True, None, total_events=0)

    expected_prev = GENESIS_HASH
    for idx, ev in enumerate(events):
        # 1. Verify link to previous event's hash
        if ev.get("prev_hash") != expected_prev:
            logger.warning(
                f"Hash-chain link broken at event index {idx} (event_id={ev.get('event_id')}): "
                f"expected prev_hash={expected_prev}, found={ev.get('prev_hash')}"
            )
            return ChainVerificationResult(False, idx, total_events=len(events))

        # 2. Recompute record_hash over (prev_hash + session_id + timestamp + score + verdict)
        recomputed_hash = compute_event_hash(
            prev_hash=expected_prev,
            session_id=ev["session_id"],
            timestamp=ev["timestamp"],
            score=ev["score"],
            verdict=ev["verdict"],
        )
        if ev.get("record_hash") != recomputed_hash:
            logger.warning(
                f"Record hash mismatch at event index {idx} (event_id={ev.get('event_id')}): "
                f"recomputed={recomputed_hash}, stored={ev.get('record_hash')}"
            )
            return ChainVerificationResult(False, idx, total_events=len(events))

        expected_prev = recomputed_hash

    return ChainVerificationResult(True, None, total_events=len(events))


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
get_events_for_call = get_events

# Self-initialization on import
init_db()
