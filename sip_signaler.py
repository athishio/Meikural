"""
sip_signaler.py - Telephony SIP Protocol Signaling Engine for MEIKURAL SOC
==========================================================================
Generates and dispatches RFC 3261 compliant SIP signaling packets based on
real-time voice clone risk assessment verdicts:
1. ALLOW (Score <= 0.35):
   -> SIP/2.0 200 OK (Call Established / Unrestricted)
2. WARN (0.35 < Score <= 0.65):
   -> SIP/2.0 183 Session Progress (Early Media with dynamic challenge injection via SIP INFO)
3. STEP_UP_VERIFICATION (Score > 0.65):
   -> SIP/2.0 488 Not Acceptable Here (Voice Clone Impersonation Detected / Audio Quarantined)
"""

import time
import uuid
from typing import Dict, Any, Optional
from enum import Enum


class SIPStatus(Enum):
    OK_200 = (200, "OK")
    SESSION_PROGRESS_183 = (183, "Session Progress")
    NOT_ACCEPTABLE_488 = (488, "Not Acceptable Here")
    DECLINE_603 = (603, "Decline")


def generate_sip_packet(
    session_id: str,
    verdict: str,
    call_id: Optional[str] = None,
    challenge_prompt: Optional[str] = None,
    risk_score: float = 0.0,
    cseq: int = 101,
) -> Dict[str, Any]:
    """
    Constructs an RFC 3261 compliant SIP message structure and wire format payload.
    """
    call_id = call_id or f"mk_call_{session_id[:12]}@meikural.telecom"
    branch = f"z9hG4bK-meikural-{session_id[:8]}-{int(time.time()*1000)}"
    tag_from = f"from_{session_id[:6]}"
    tag_to = f"to_{session_id[:6]}"
    normalized_verdict = verdict.upper().strip()

    if normalized_verdict in ("ALLOW", "BONAFIDE", "SAFE"):
        status_code = 200
        reason_phrase = "OK"
        headers = {
            "Via": f"SIP/2.0/UDP 127.0.0.1:5060;branch={branch};rport",
            "From": f"<sip:inbound@pstn.gateway>;tag={tag_from}",
            "To": f"<sip:agent@ivr.enterprise>;tag={tag_to}",
            "Call-ID": call_id,
            "CSeq": f"{cseq} INVITE",
            "Contact": f"<sip:meikural-soc@127.0.0.1:5060>",
            "X-Meikural-Verdict": "ALLOW",
            "X-Meikural-Risk-Score": f"{risk_score:.4f}",
            "X-Meikural-Action": "ROUTE_CALL_DIRECT",
            "Content-Type": "application/sdp",
        }
        body = (
            "v=0\r\n"
            "o=MeikuralSOC 2890844526 2890844526 IN IP4 127.0.0.1\r\n"
            "s=Meikural Telephony Sentinel\r\n"
            "c=IN IP4 127.0.0.1\r\n"
            "t=0 0\r\n"
            "m=audio 16000 RTP/AVP 0 101\r\n"
            "a=rtpmap:0 PCMU/8000\r\n"
            "a=sendrecv\r\n"
        )
    elif normalized_verdict in ("WARN", "UNCERTAIN", "CAUTION"):
        status_code = 183
        reason_phrase = "Session Progress"
        prompt = challenge_prompt or "Security Verification Required. Please state challenge code."
        headers = {
            "Via": f"SIP/2.0/UDP 127.0.0.1:5060;branch={branch};rport",
            "From": f"<sip:inbound@pstn.gateway>;tag={tag_from}",
            "To": f"<sip:agent@ivr.enterprise>;tag={tag_to}",
            "Call-ID": call_id,
            "CSeq": f"{cseq} INVITE",
            "X-Meikural-Verdict": "WARN",
            "X-Meikural-Risk-Score": f"{risk_score:.4f}",
            "X-Meikural-Action": "INJECT_EARLY_MEDIA_CHALLENGE",
            "X-Meikural-Challenge-Prompt": prompt,
            "Content-Type": "application/meikural-challenge+json",
        }
        body = f'{{"session_id": "{session_id}", "action": "INTERCEPT", "prompt": "{prompt}", "risk_score": {risk_score:.4f}}}\r\n'
    else:  # STEP_UP_VERIFICATION, ALERT, SPOOF, DEEPFAKE
        status_code = 488
        reason_phrase = "Not Acceptable Here"
        headers = {
            "Via": f"SIP/2.0/UDP 127.0.0.1:5060;branch={branch};rport",
            "From": f"<sip:inbound@pstn.gateway>;tag={tag_from}",
            "To": f"<sip:agent@ivr.enterprise>;tag={tag_to}",
            "Call-ID": call_id,
            "CSeq": f"{cseq} INVITE",
            "Reason": 'Q.850;cause=88;text="Voice Clone Impersonation Detected by Meikural SOC"',
            "X-Meikural-Verdict": "STEP_UP_VERIFICATION",
            "X-Meikural-Risk-Score": f"{risk_score:.4f}",
            "X-Meikural-Action": "ISOLATE_TRUNK_AND_ALERT",
            "Content-Length": "0",
        }
        body = ""

    # Wire format SIP Header + Body
    header_lines = [f"SIP/2.0 {status_code} {reason_phrase}"]
    for k, v in headers.items():
        header_lines.append(f"{k}: {v}")
    if body and "Content-Length" not in headers:
        header_lines.append(f"Content-Length: {len(body.encode('utf-8'))}")
    elif "Content-Length" not in headers:
        header_lines.append("Content-Length: 0")

    raw_sip = "\r\n".join(header_lines) + "\r\n\r\n" + body

    return {
        "status_code": status_code,
        "reason_phrase": reason_phrase,
        "session_id": session_id,
        "call_id": call_id,
        "verdict": normalized_verdict,
        "risk_score": round(risk_score, 4),
        "headers": headers,
        "body": body,
        "raw_sip_message": raw_sip,
        "timestamp": time.time(),
    }


def trigger_sip_action(
    session_id: str,
    verdict: str,
    call_id: Optional[str] = None,
    challenge_prompt: Optional[str] = None,
    risk_score: float = 0.0,
) -> Dict[str, Any]:
    """
    Dispatches a SIP protocol action for a call session and returns the structured payload.
    """
    packet = generate_sip_packet(
        session_id=session_id,
        verdict=verdict,
        call_id=call_id,
        challenge_prompt=challenge_prompt,
        risk_score=risk_score,
    )
    return packet
