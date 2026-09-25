"""
verify_rate_limiting.py
Sends rapid sequential requests to a rate-limited endpoint (/api/admin/purge-expired, limit: 10/min)
to confirm that requests exceeding the limit trigger HTTP 429 Too Many Requests.
"""

import sys
import time
import requests

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
ENDPOINT = f"{BASE_URL}/purge-expired"
HEADERS = {"X-API-Key": "meikural-dev-key-2026"}

print("=" * 70)
print(f"RATE LIMITING TEST: {ENDPOINT}")
print("Configured limit on endpoint: 10 requests / minute")
print("Sending 14 rapid POST requests...")
print("=" * 70)

status_codes = []
for i in range(1, 15):
    try:
        resp = requests.post(ENDPOINT, headers=HEADERS, timeout=3.0)
        status_codes.append(resp.status_code)
        tag = "[OK - PASSED]" if resp.status_code == 200 else ("[RATE LIMITED]" if resp.status_code == 429 else f"[{resp.status_code}]")
        print(f"Request #{i:02d}: Status {resp.status_code} {tag}")
    except Exception as e:
        print(f"Request #{i:02d}: Error - {e}")
    time.sleep(0.05)

print("=" * 70)
if 429 in status_codes:
    print(f"TEST RESULT: PASS! HTTP 429 triggered as expected on request #{status_codes.index(429) + 1}.")
else:
    print("TEST RESULT: FAIL - HTTP 429 was not returned.")
print("=" * 70)
