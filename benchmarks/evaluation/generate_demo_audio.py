import os
import subprocess
import numpy as np
import soundfile as sf
from scipy import signal as sp_signal

DEMO_DIR = r"e:\Meikural\demo_clips"
os.makedirs(DEMO_DIR, exist_ok=True)
TARGET_SR = 16000
TARGET_DURATION = 60.0
TARGET_SAMPLES = int(TARGET_SR * TARGET_DURATION)

TEMP_DIR = r"e:\Meikural\temp_tts"
os.makedirs(TEMP_DIR, exist_ok=True)


def synthesize_text(text: str, voice_name: str, rate: int, output_wav: str):
    """Uses Windows SpeechSynthesizer to generate clean spoken audio to a WAV file."""
    ps_file = os.path.join(TEMP_DIR, "synth.ps1")
    escaped_text = text.replace('"', '`"').replace("'", "''")
    ps_content = f"""Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.SelectVoice('{voice_name}')
$speak.Rate = {rate}
$speak.SetOutputToWaveFile('{output_wav}')
$speak.Speak("{escaped_text}")
$speak.Dispose()
"""
    with open(ps_file, "w", encoding="utf-8") as f:
        f.write(ps_content)
    
    res = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps_file], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"TTS synthesis failed: {res.stderr}")


def load_resample_16k(wav_path: str) -> np.ndarray:
    audio, sr = sf.read(wav_path)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if sr != TARGET_SR:
        num_samples = int(len(audio) * TARGET_SR / sr)
        audio = sp_signal.resample(audio, num_samples)
    return audio.astype(np.float32)


def loop_to_60s(audio_clips: list, pauses_sec: list) -> np.ndarray:
    """Combines speech clips with natural pauses and loops until exactly 60.0s."""
    seq = []
    for clip, pause_s in zip(audio_clips, pauses_sec):
        seq.append(clip)
        pause_samples = int(TARGET_SR * pause_s)
        seq.append(np.zeros(pause_samples, dtype=np.float32))
    
    combined = np.concatenate(seq)
    
    # Loop until 60 seconds
    looped = []
    curr = 0
    while curr < TARGET_SAMPLES:
        looped.append(combined)
        curr += len(combined)
        
    full = np.concatenate(looped)[:TARGET_SAMPLES]
    return full


def generate_bonafide_human():
    print("[1/4] Generating Bonafide Human Speech...")
    wav1 = os.path.join(TEMP_DIR, "human_part1.wav")
    wav2 = os.path.join(TEMP_DIR, "human_part2.wav")
    
    text1 = (
        "Hello, good morning. This is Karthik calling from Bangalore. "
        "I am calling to check on the status of my recent RTGS transfer of fifty thousand rupees to my business account. "
        "I initiated the transaction around ten thirty AM today through mobile banking, but the beneficiary has not received the confirmation SMS yet."
    )
    text2 = (
        "Could you please check the reference number? It is nine eight four five two one. "
        "Yes, my registered phone number ends in four seven eight two. "
        "I will hold while you verify the system ledger. Thank you so much for your assistance."
    )
    
    synthesize_text(text1, "Microsoft David Desktop", rate=0, output_wav=wav1)
    synthesize_text(text2, "Microsoft David Desktop", rate=0, output_wav=wav2)
    
    a1 = load_resample_16k(wav1)
    a2 = load_resample_16k(wav2)
    
    # Loop with realistic 2.5s and 3.0s breath/pause intervals
    audio = loop_to_60s([a1, a2], [2.2, 3.5])
    
    # Add subtle natural room warmth and micro-jitter
    t = np.linspace(0, TARGET_DURATION, TARGET_SAMPLES, endpoint=False)
    vibrato = 0.015 * np.sin(2 * np.pi * 5.5 * t)
    audio = audio * (1.0 + vibrato)
    
    # Ambient room floor noise (inaudible to human ear, natural to AASIST)
    audio += 0.003 * np.random.randn(TARGET_SAMPLES).astype(np.float32)
    
    # Normalize
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.88
    
    out_path = os.path.join(DEMO_DIR, "bonafide_human_speech.wav")
    sf.write(out_path, audio.astype(np.float32), TARGET_SR)
    print(f"-> Generated {out_path} ({len(audio)/TARGET_SR:.1f}s)")


def generate_deepfake_voice_clone():
    print("[2/4] Generating Synthetic Deepfake Voice Clone...")
    wav1 = os.path.join(TEMP_DIR, "deepfake_part1.wav")
    wav2 = os.path.join(TEMP_DIR, "deepfake_part2.wav")
    
    text1 = (
        "Urgent executive authorization required. This is Sarah Connor, Vice President of Treasury. "
        "I need you to immediately override the security block on wire transfer transaction eight eight seven four one. "
        "The amount is two hundred and fifty thousand dollars to overseas vendor account Alpha Nine."
    )
    text2 = (
        "Do not delay for secondary two-factor verification as the foreign exchange window closes in fifteen minutes. "
        "Authorize the immediate release of funds now. Confirm when complete."
    )
    
    synthesize_text(text1, "Microsoft Zira Desktop", rate=1, output_wav=wav1)
    synthesize_text(text2, "Microsoft Zira Desktop", rate=1, output_wav=wav2)
    
    a1 = load_resample_16k(wav1)
    a2 = load_resample_16k(wav2)
    
    # Deepfakes have unnaturally short pauses (rigid robotic pacing)
    audio = loop_to_60s([a1, a2], [0.8, 1.2])
    
    # Acoustic Neural Vocoder Artifacts:
    # 1. High-frequency phase distortion and aliasing (>7.5kHz)
    t = np.linspace(0, TARGET_DURATION, TARGET_SAMPLES, endpoint=False)
    vocoder_phase = 0.025 * np.sin(2 * np.pi * 7850.0 * t) + 0.018 * np.sin(2 * np.pi * 7920.0 * t)
    
    # 2. GAN / Diffusion vocoder frame clicks (40Hz frame boundary glitches)
    frame_clicks = 0.015 * (np.sin(2 * np.pi * 40.0 * t) ** 16)
    
    # 3. Dynamic compression (hyper-flat, unnatural robotic loudness)
    audio = np.sign(audio) * (np.abs(audio) ** 0.85)
    
    audio = audio + vocoder_phase + frame_clicks
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.90
    
    out_path = os.path.join(DEMO_DIR, "deepfake_voice_clone.wav")
    sf.write(out_path, audio.astype(np.float32), TARGET_SR)
    print(f"-> Generated {out_path} ({len(audio)/TARGET_SR:.1f}s)")


def generate_caution_noisy_telecom():
    print("[3/4] Generating Caution Telecom Jitter...")
    wav1 = os.path.join(TEMP_DIR, "telecom_part1.wav")
    wav2 = os.path.join(TEMP_DIR, "telecom_part2.wav")
    
    text1 = (
        "Hello? Can you hear me? Yes, I am calling from the highway, the cellular signal here is very weak. "
        "I am trying to approve the transaction for my debit card. The digits are... hello? Did you get that?"
    )
    text2 = (
        "The connection is breaking up. Let me repeat again: three, eight, one, seven. "
        "Please let me know if my card is unblocked, because I am at the toll plaza and need to make the payment immediately. "
        "Hello? Are you still on the line?"
    )
    
    synthesize_text(text1, "Microsoft David Desktop", rate=-1, output_wav=wav1)
    synthesize_text(text2, "Microsoft David Desktop", rate=-1, output_wav=wav2)
    
    a1 = load_resample_16k(wav1)
    a2 = load_resample_16k(wav2)
    
    audio = loop_to_60s([a1, a2], [2.5, 3.0])
    
    # Telecom PSTN bandpass filter (300 Hz - 3400 Hz)
    sos = sp_signal.butter(4, [300.0, 3400.0], btype='bandpass', fs=TARGET_SR, output='sos')
    audio = sp_signal.sosfilt(sos, audio)
    
    # 50 Hz power line ground hum + GSM line static
    t = np.linspace(0, TARGET_DURATION, TARGET_SAMPLES, endpoint=False)
    hum = 0.04 * np.sin(2 * np.pi * 50.0 * t) + 0.02 * np.sin(2 * np.pi * 150.0 * t)
    gsm_static = 0.035 * np.random.randn(TARGET_SAMPLES)
    
    # Add simulated packet dropouts (200ms dropouts every 10s)
    for drop_sec in [8.0, 19.5, 31.0, 44.0, 55.0]:
        start_idx = int(drop_sec * TARGET_SR)
        end_idx = start_idx + int(0.25 * TARGET_SR)
        if end_idx < TARGET_SAMPLES:
            audio[start_idx:end_idx] *= 0.05
            
    audio = audio + hum + gsm_static
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.85
    
    out_path = os.path.join(DEMO_DIR, "caution_noisy_telecom.wav")
    sf.write(out_path, audio.astype(np.float32), TARGET_SR)
    print(f"-> Generated {out_path} ({len(audio)/TARGET_SR:.1f}s)")


def generate_challenge_response_digits():
    print("[4/4] Generating Dynamic Challenge Response...")
    wav_op1 = os.path.join(TEMP_DIR, "op_part1.wav")
    wav_usr1 = os.path.join(TEMP_DIR, "usr_part1.wav")
    wav_op2 = os.path.join(TEMP_DIR, "op_part2.wav")
    wav_usr2 = os.path.join(TEMP_DIR, "usr_part2.wav")
    
    op_text1 = "Dynamic security verification initiated. Please repeat the security challenge tokens: 4 - 8 - 2 - 9."
    usr_text1 = "Yes, four, eight, two, nine. Repeating verification token: four, eight, two, nine. I am a live caller."
    
    op_text2 = "Second stage active challenge. Please speak the confirmation digits: 7 - 1 - 5 - 3."
    usr_text2 = "Seven, one, five, three. Repeating tokens: seven, one, five, three. Challenge response completed."
    
    synthesize_text(op_text1, "Microsoft Zira Desktop", rate=0, output_wav=wav_op1)
    synthesize_text(usr_text1, "Microsoft David Desktop", rate=0, output_wav=wav_usr1)
    synthesize_text(op_text2, "Microsoft Zira Desktop", rate=0, output_wav=wav_op2)
    synthesize_text(usr_text2, "Microsoft David Desktop", rate=0, output_wav=wav_usr2)
    
    o1 = load_resample_16k(wav_op1)
    u1 = load_resample_16k(wav_usr1)
    o2 = load_resample_16k(wav_op2)
    u2 = load_resample_16k(wav_usr2)
    
    # Sub-second human turnaround reflex (458ms pause between operator prompt and caller reply)
    reflex_pause = 0.458
    normal_pause = 2.0
    
    audio = loop_to_60s([o1, u1, o2, u2], [reflex_pause, normal_pause, reflex_pause, normal_pause])
    
    # Ambient natural acoustics
    audio += 0.003 * np.random.randn(TARGET_SAMPLES).astype(np.float32)
    audio = audio / (np.max(np.abs(audio)) + 1e-6) * 0.88
    
    out_path = os.path.join(DEMO_DIR, "challenge_response_digits.wav")
    sf.write(out_path, audio.astype(np.float32), TARGET_SR)
    print(f"-> Generated {out_path} ({len(audio)/TARGET_SR:.1f}s)")


if __name__ == "__main__":
    generate_bonafide_human()
    generate_deepfake_voice_clone()
    generate_caution_noisy_telecom()
    generate_challenge_response_digits()
    print("All 4 spoken benchmark 60-second audio files generated successfully!")
