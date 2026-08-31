import os
import sys
import json
import torch
import torch.nn.functional as F
import numpy as np

# Add aasist repo to sys.path
sys.path.append(os.path.abspath("aasist"))
try:
    from aasist.models.AASIST import Model
except (ModuleNotFoundError, ImportError):
    from models.AASIST import Model

def test_model():
    print("Testing AASIST model initialization...")
    with open("aasist/config/AASIST.conf", "r") as f:
        config = json.load(f)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    model = Model(config["model_config"])
    checkpoint_path = "aasist/models/weights/AASIST.pth"
    print(f"Loading weights from {checkpoint_path}...")
    state_dict = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    print("AASIST model loaded successfully!")

    # Test with dummy inputs (batch_size=1, samples=64600)
    print("Running inference on 64,600 sample waveforms (16kHz mono, ~4.04 sec)...")
    
    # 1. Random noise
    torch.manual_seed(42)
    x_noise = torch.randn(1, 64600, device=device)
    with torch.no_grad():
        _, out_noise = model(x_noise)
        probs_noise = F.softmax(out_noise, dim=-1)
        spoof_prob_noise = probs_noise[0, 0].item()
        bonafide_prob_noise = probs_noise[0, 1].item()
    print(f"[Random Noise] Logits: {out_noise.tolist()}, Spoof Prob: {spoof_prob_noise:.4f}, Bonafide Prob: {bonafide_prob_noise:.4f}")

    # 2. Sine wave (simulated clean tone)
    t = np.linspace(0, 64600 / 16000, 64600, endpoint=False)
    sine = 0.5 * np.sin(2 * np.pi * 440 * t)
    x_sine = torch.tensor(sine, dtype=torch.float32, device=device).unsqueeze(0)
    with torch.no_grad():
        _, out_sine = model(x_sine)
        probs_sine = F.softmax(out_sine, dim=-1)
        spoof_prob_sine = probs_sine[0, 0].item()
        bonafide_prob_sine = probs_sine[0, 1].item()
    print(f"[Sine Wave 440Hz] Logits: {out_sine.tolist()}, Spoof Prob: {spoof_prob_sine:.4f}, Bonafide Prob: {bonafide_prob_sine:.4f}")

    # 3. Zeros / Silence
    x_zero = torch.zeros(1, 64600, device=device)
    with torch.no_grad():
        _, out_zero = model(x_zero)
        probs_zero = F.softmax(out_zero, dim=-1)
        spoof_prob_zero = probs_zero[0, 0].item()
        bonafide_prob_zero = probs_zero[0, 1].item()
    print(f"[Silence / Zeros] Logits: {out_zero.tolist()}, Spoof Prob: {spoof_prob_zero:.4f}, Bonafide Prob: {bonafide_prob_zero:.4f}")

if __name__ == "__main__":
    test_model()
