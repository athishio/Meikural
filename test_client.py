import asyncio
import json
import time
import numpy as np
import websockets
from audio_processor import score_audio_chunk, score_audio_chunk_detailed

async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws/audio"
    print(f"Connecting to WebSocket endpoint: {uri}...")
    
    async with websockets.connect(uri) as ws:
        print("Connected successfully!")
        
        # Test 1: Dummy Mode Echo
        print("\n--- Test 1: Dummy Control & Metadata ---")
        msg = {"mode": "dummy", "event": "normal", "dummy_score": 0.85}
        await ws.send(json.dumps(msg))
        response = await ws.recv()
        parsed = json.loads(response)
        print(f"Received Response:\n{json.dumps(parsed, indent=2)}")
        assert parsed["score"] == 0.85
        assert "metadata" in parsed
        assert "session_id" in parsed["metadata"]
        assert parsed["metadata"]["chunk_id"] == 1
        print("Test 1 passed!")

        # Test 2: Live Binary Audio (Synthetic 440Hz Sine)
        print("\n--- Test 2: Live Audio Inference & VAD ---")
        await ws.send(json.dumps({"mode": "live"}))
        _ = await ws.recv()

        t = np.linspace(0, 1.0, 16000, endpoint=False)
        tone = (0.5 * np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
        audio_bytes = tone.tobytes()

        start = time.time()
        await ws.send(audio_bytes)
        response_audio = await ws.recv()
        elapsed = (time.time() - start) * 1000
        parsed_audio = json.loads(response_audio)
        print(f"Received in {elapsed:.1f}ms:\n{json.dumps(parsed_audio, indent=2)}")
        
        assert parsed_audio["audio_health"]["is_speech"] is True
        assert parsed_audio["anti_spoofing"]["verdict"] == "spoof"
        assert parsed_audio["anti_spoofing"]["confidence"] == "high"
        assert parsed_audio["metadata"]["chunk_id"] == 3
        print("Test 2 passed!")

        # Test 3: Active Challenge Protocol Flow
        print("\n--- Test 3: Challenge-Response Protocol Flow ---")
        # Trigger challenge
        trigger_cmd = {
            "action": "trigger_challenge",
            "challenge_id": "ch_4021",
            "challenge_type": "digit_repeat",
            "prompt_text": "Please repeat: 9 - 2 - 5"
        }
        await ws.send(json.dumps(trigger_cmd))
        resp_trig = json.loads(await ws.recv())
        print(f"Triggered Challenge:\n{json.dumps(resp_trig['challenge_state'], indent=2)}")
        assert resp_trig["challenge_state"]["event"] == "challenge_fired"
        assert resp_trig["challenge_state"]["challenge_id"] == "ch_4021"

        # Stream speech answering the challenge
        await ws.send(audio_bytes)
        resp_during = json.loads(await ws.recv())
        assert resp_during["challenge_state"]["event"] == "challenge_fired"

        # Resolve challenge
        resolve_cmd = {
            "action": "resolve_challenge",
            "challenge_id": "ch_4021",
            "liveness_passed": True
        }
        await ws.send(json.dumps(resolve_cmd))
        resp_resolved = json.loads(await ws.recv())
        print(f"Resolved Challenge:\n{json.dumps(resp_resolved['challenge_state'], indent=2)}")
        assert resp_resolved["challenge_state"]["event"] == "challenge_response"
        assert resp_resolved["challenge_state"]["liveness_passed"] is True
        print("Test 3 passed!")

    print("\nAll rich schema WebSocket tests passed successfully!")

def test_detailed_wrapper():
    print("\n--- Running Detailed Unit Tests ---")
    
    # 1. Active Speech (Noise)
    noise = np.random.randn(64600).astype(np.float32)
    res_noise = score_audio_chunk_detailed(noise)
    print(f"Active noise speech: is_speech={res_noise['audio_health']['is_speech']}, rms_db={res_noise['audio_health']['rms_db']}, verdict={res_noise['verdict']}")
    assert res_noise["audio_health"]["is_speech"] is True
    assert res_noise["verdict"] == "spoof"

    # 2. Silence / Near Zero
    silence = np.zeros(64600, dtype=np.float32)
    res_silence = score_audio_chunk_detailed(silence)
    print(f"Silence: is_speech={res_silence['audio_health']['is_speech']}, rms_db={res_silence['audio_health']['rms_db']}, verdict={res_silence['verdict']}")
    assert res_silence["audio_health"]["is_speech"] is False
    assert res_silence["verdict"] == "silence"

    print("Detailed wrapper unit tests passed!")

if __name__ == "__main__":
    test_detailed_wrapper()
    print("\nRunning WebSocket server tests...")
    asyncio.run(test_websocket())
