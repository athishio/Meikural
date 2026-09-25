"""
explore_pstn_adaptation.py
Investigates acoustic spectral features and lightweight calibration adaptations
on PSTN Narrowband (8kHz 300-3400Hz) audio chunks to determine if domain shift
can be closed at the feature level or if active verification is physically required.
"""

import os
import json
import numpy as np
import scipy.signal as signal
from audio_processor import AASISTWrapper, TelephonyCodecEngine, TARGET_SAMPLE_RATE
from evaluate_rigorous_telephony import extract_uniform_chunks

def analyze_pstn_acoustics():
    with open("corpus_manifest.json", "r") as f:
        manifest = json.load(f)["sources"]
        
    wrapper = AASISTWrapper.get_instance()
    
    bonafide_pstn_llrs = []
    spoof_pstn_llrs = []
    
    bona_centroids = []
    spoof_centroids = []
    
    bona_rolloffs = []
    spoof_rolloffs = []
    
    bona_spec_flat = []
    spoof_spec_flat = []
    
    for item in manifest:
        chunks = extract_uniform_chunks(item["file_path"], item["speaker_id"], item["ground_truth"])
        for chunk in chunks:
            raw_wav = chunk["waveform"]
            pstn_wav = TelephonyCodecEngine.apply_pstn_narrowband(raw_wav, sample_rate=TARGET_SAMPLE_RATE)
            res = wrapper.score_detailed(pstn_wav, simulate_codec="pstn_narrowband")
            llr = res["raw_llr"]
            
            # Acoustic feature extraction inside PSTN passband (300Hz - 3400Hz)
            fft = np.abs(np.fft.rfft(pstn_wav))
            freqs = np.fft.rfftfreq(len(pstn_wav), 1.0 / TARGET_SAMPLE_RATE)
            in_band = (freqs >= 300) & (freqs <= 3400)
            fft_band = fft[in_band]
            freqs_band = freqs[in_band]
            
            # 1. Spectral Centroid
            sum_energy = np.sum(fft_band) + 1e-12
            sc = np.sum(freqs_band * fft_band) / sum_energy
            
            # 2. Spectral Rolloff (85%)
            cum_energy = np.cumsum(fft_band)
            rolloff_idx = np.searchsorted(cum_energy, 0.85 * cum_energy[-1])
            rolloff = freqs_band[min(rolloff_idx, len(freqs_band) - 1)]
            
            # 3. Spectral Flatness (Wiener entropy)
            geom_mean = np.exp(np.mean(np.log(fft_band + 1e-12)))
            arith_mean = np.mean(fft_band) + 1e-12
            sf_val = geom_mean / arith_mean
            
            if item["ground_truth"] == "bonafide":
                bonafide_pstn_llrs.append(llr)
                bona_centroids.append(sc)
                bona_rolloffs.append(rolloff)
                bona_spec_flat.append(sf_val)
            else:
                spoof_pstn_llrs.append(llr)
                spoof_centroids.append(sc)
                spoof_rolloffs.append(rolloff)
                spoof_spec_flat.append(sf_val)
                
    print("=" * 70)
    print("PSTN NARROWBAND (8kHz 300-3400Hz) ACOUSTIC & LLR DISTRIBUTION")
    print("=" * 70)
    print(f"Bonafide Samples: {len(bonafide_pstn_llrs)}, Spoof Samples: {len(spoof_pstn_llrs)}")
    print(f"Bonafide LLR: Mean = {np.mean(bonafide_pstn_llrs):.2f}, Std = {np.std(bonafide_pstn_llrs):.2f}, Min = {np.min(bonafide_pstn_llrs):.2f}, Max = {np.max(bonafide_pstn_llrs):.2f}")
    print(f"Spoof    LLR: Mean = {np.mean(spoof_pstn_llrs):.2f}, Std = {np.std(spoof_pstn_llrs):.2f}, Min = {np.min(spoof_pstn_llrs):.2f}, Max = {np.max(spoof_pstn_llrs):.2f}")
    print("-" * 70)
    print(f"Bonafide Spectral Centroid: {np.mean(bona_centroids):.1f} Hz +/- {np.std(bona_centroids):.1f}")
    print(f"Spoof    Spectral Centroid: {np.mean(spoof_centroids):.1f} Hz +/- {np.std(spoof_centroids):.1f}")
    print(f"Bonafide Spectral Rolloff:  {np.mean(bona_rolloffs):.1f} Hz +/- {np.std(bona_rolloffs):.1f}")
    print(f"Spoof    Spectral Rolloff:  {np.mean(spoof_rolloffs):.1f} Hz +/- {np.std(spoof_rolloffs):.1f}")
    print(f"Bonafide Spectral Flatness: {np.mean(bona_spec_flat):.4f} +/- {np.std(bona_spec_flat):.4f}")
    print(f"Spoof    Spectral Flatness: {np.mean(spoof_spec_flat):.4f} +/- {np.std(spoof_spec_flat):.4f}")
    print("=" * 70)
    
    # Check linear separability or Fisher Criterion J = (mu1 - mu2)^2 / (var1 + var2)
    llr_fisher = (np.mean(bonafide_pstn_llrs) - np.mean(spoof_pstn_llrs))**2 / (np.var(bonafide_pstn_llrs) + np.var(spoof_pstn_llrs))
    sc_fisher = (np.mean(bona_centroids) - np.mean(spoof_centroids))**2 / (np.var(bona_centroids) + np.var(spoof_centroids))
    sf_fisher = (np.mean(bona_spec_flat) - np.mean(spoof_spec_flat))**2 / (np.var(bona_spec_flat) + np.var(spoof_spec_flat))
    print(f"Fisher Discriminant Ratio - LLR: {llr_fisher:.4f}")
    print(f"Fisher Discriminant Ratio - Spectral Centroid: {sc_fisher:.4f}")
    print(f"Fisher Discriminant Ratio - Spectral Flatness: {sf_fisher:.4f}")

if __name__ == "__main__":
    analyze_pstn_acoustics()
