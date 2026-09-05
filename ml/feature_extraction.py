"""
Feature Extraction for Voice-Cloning/Deepfake-Audio Detection

Design Choice:
These features feed a downstream classifier plus a rule-based prosody-irregularity flag,
per docs/TRD.md. Specifically, this module extracts MFCCs, spectral features (centroid, 
flatness, contrast), and prosody proxies (pitch/F0 statistics via librosa.pyin) to capture 
both phonetic articulation and intonation patterns often disrupted in AI-generated speech.
"""

import sys
import numpy as np
import librosa

def extract_features(audio_path: str) -> dict:
    """
    Loads an audio file (resampled to 16kHz mono) and extracts features.
    
    Returns a dict containing:
    - mfcc_mean, mfcc_var: Mean and variance of MFCCs across frames
    - spectral_centroid_mean, spectral_flatness_mean, spectral_contrast_mean: Mean spectral features
    - pitch_mean, pitch_std, pitch_jitter: F0 contour statistics
    - duration, sample_rate: Basic audio properties
    """
    try:
        # Load audio, resample to 16kHz, mono
        target_sr = 16000
        y, sr = librosa.load(audio_path, sr=target_sr, mono=True)
    except Exception as e:
        raise ValueError(f"Error loading {audio_path}: Corrupt or empty file? ({e})")
        
    if y is None or len(y) == 0:
        raise ValueError(f"Error loading {audio_path}: File is empty.")

    duration = librosa.get_duration(y=y, sr=sr)
    
    # Check for extremely short clips to avoid processing errors
    if duration < 0.1:
        raise ValueError(f"Audio clip is too short ({duration:.2f}s) to extract meaningful features.")

    # 1. MFCCs (mean + variance across frames)
    # Using 20 MFCCs as standard
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
    mfcc_mean = np.mean(mfcc, axis=1).tolist()
    mfcc_var = np.var(mfcc, axis=1).tolist()

    # 2. Spectral features (mean values)
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    spectral_centroid_mean = float(np.mean(spectral_centroid))
    
    spectral_flatness = librosa.feature.spectral_flatness(y=y)
    spectral_flatness_mean = float(np.mean(spectral_flatness))
    
    spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    spectral_contrast_mean = np.mean(spectral_contrast, axis=1).tolist()

    # 3. Prosody proxy: pitch (F0) contour via librosa.pyin
    # pyin is robust for pitch tracking, we specify expected human pitch range (e.g., 50Hz to 500Hz)
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, 
        fmin=librosa.note_to_hz('C2'), 
        fmax=librosa.note_to_hz('C6')
    )
    
    # Filter out unvoiced frames (where f0 is NaN)
    valid_f0 = f0[~np.isnan(f0)]
    
    if len(valid_f0) > 0:
        pitch_mean = float(np.mean(valid_f0))
        pitch_std = float(np.std(valid_f0))
        
        # Simple pitch jitter approximation: mean absolute difference between consecutive F0 values
        if len(valid_f0) > 1:
            pitch_jitter = float(np.mean(np.abs(np.diff(valid_f0))))
        else:
            pitch_jitter = 0.0
    else:
        pitch_mean = 0.0
        pitch_std = 0.0
        pitch_jitter = 0.0

    features = {
        "mfcc_mean": mfcc_mean,
        "mfcc_var": mfcc_var,
        "spectral_centroid_mean": spectral_centroid_mean,
        "spectral_flatness_mean": spectral_flatness_mean,
        "spectral_contrast_mean": spectral_contrast_mean,
        "pitch_mean": pitch_mean,
        "pitch_std": pitch_std,
        "pitch_jitter": pitch_jitter,
        "duration": duration,
        "sample_rate": sr
    }

    return features

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python feature_extraction.py <path-to-wav>")
        sys.exit(1)
        
    audio_file = sys.argv[1]
    print(f"Extracting features from: {audio_file}")
    
    try:
        features = extract_features(audio_file)
        import pprint
        pprint.pprint(features)
    except Exception as e:
        print(f"Failed: {e}")
