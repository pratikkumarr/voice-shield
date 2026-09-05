"""
classifier.py  -  Anti-Spoofing / Synthetic-Speech-Detection Classifier
=========================================================================

Caveat / scope statement
------------------------
Models in this file operate on raw-waveform acoustic and vocoder artefacts,
NOT on linguistic content, so cross-lingual generalisation is architecturally
plausible. However, none of the models below have been independently validated
by this team on non-English speech or on modern neural-TTS systems (e.g.
ElevenLabs, RVC). Cross-lingual / modern-TTS validation is a manual next step
(see PROGRESS.md Step 3b) -- it is NOT something we claim as solved.

!! KNOWN LIMITATION (discovered 6 Sept, Step 3b) !!
  Res2TCNGuard and ResCapsGuard (Tier 2/3) are trained exclusively on
  ASVspoof2019-LA vocoder attacks from 2019. When tested on real-world clips
  ("pratik sample to clone" = genuine, "pratik cloned voice" = AI-cloned)
  both models classified them EXACTLY BACKWARDS:
    - genuine voice:  spoof_logit=+9.33, bonafide_logit=-10.67  -> p_cloned=1.00  (WRONG)
    - cloned voice:   spoof_logit=-1.88, bonafide_logit=+2.91   -> p_cloned=0.05  (WRONG)
  Published InTheWild EER: 52.52% confirms near-random behaviour on modern data.
  garystafford/wav2vec2-deepfake-voice-detector (Tier 1) correctly identified
  both clips in earlier testing (p_cloned=1.00 on the confirmed fake, risk=14
  on the real clip), so it is restored as primary Tier 1. The ASVspoof models
  are retained as Tier 2/3 because they may still catch 2019-era vocoder attacks.
  Proper model selection requires a held-out evaluation set of modern clips --
  that is the next manual validation step.

Strategy (three-tier):
  Tier 1 - garystafford/wav2vec2-deepfake-voice-detector  (OPERATIONAL PRIMARY)
    Community fine-tuned Wav2Vec2 model for real-vs-fake audio classification.
    Uses transformers.pipeline("audio-classification").
    No published EER benchmark, but empirically discriminates correctly on our
    real-world test clips (modern TTS / voice-cloning tools). Restored as
    primary after the Res2TCNGuard inversion failure on 6 Sept.
    Label mapping handled dynamically (LABEL_0/1, REAL/FAKE, numeric, etc.).

  Tier 2 - Res2TCNGuard  (FALLBACK -- may catch 2019-era attacks)
    SpeechAntiSpoofingBenchmarks/Res2TCNGuard on Hugging Face.
    Sinc-conv + Res2Net + dual-TCN, 0.172 M params.
    Trained on ASVspoof2019 LA. Published EER 1.5% IN-DOMAIN ONLY.
    Does NOT use transformers.pipeline -- loaded via hf_hub_download +
    exec(_net.py). Returns logits[:,1] where higher = more bona fide.
    We invert via sigmoid to get is_cloned_prob.
    WARNING: shown to be INVERTED on modern real-world clips (see above).

  Tier 2b - ResCapsGuard  (FALLBACK to Tier 2)
    SpeechAntiSpoofingBenchmarks/ResCapsGuard on Hugging Face.
    Capsule-network sibling of Res2TCNGuard, 1.607 M params.
    Published EER 1.86% IN-DOMAIN ONLY. Same inversion risk as Tier 2.
    Inference: model(x, random=False, dropout=0) -> class_[:,1].

  Tier 3 - Scikit-learn baseline  (**PLACEHOLDER**)
    If no HF model can be loaded (no internet, missing torch, etc.)
    we fall back to logistic regression on MFCC + spectral + prosody features
    from feature_extraction.py. Files auto-labelled by filename:
    fake/clone/ai/tts/spoof/synthetic -> label 1; everything else -> label 0.

Public API
----------
    classify(audio_path: str) -> dict
        Returns {"is_cloned_prob": float 0-1, "model_name": str}
        is_cloned_prob: 0 = almost certainly real; 1 = almost certainly fake.
"""

from __future__ import annotations

import logging
import math
import re
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Tier 1
_GARYSTAFFORD_MODEL_ID = "garystafford/wav2vec2-deepfake-voice-detector"

# Tier 2
_RES2TCN_REPO = "SpeechAntiSpoofingBenchmarks/Res2TCNGuard"
_RES2TCN_CKPT = "best_1.495.pth"

# Tier 2b
_RESCAPS_REPO = "SpeechAntiSpoofingBenchmarks/ResCapsGuard"
_RESCAPS_CKPT = "new_capsules_changed_sinc_layer.pth"

# Fixed input length required by Tier 2/2b (64,600 samples @ 16 kHz ~= 4.04 s)
_CUT = 64600
_SR  = 16000

_DATA_DIR     = Path(__file__).parent / "data"
_FAKE_PATTERN = re.compile(r"fake|clone|cloned|ai|tts|spoof|synthetic", re.IGNORECASE)

# ---------------------------------------------------------------------------
# Lazy-loaded state
# ---------------------------------------------------------------------------

_hf_pipeline    = None   # transformers pipeline (Tier 1)
_model          = None   # torch model (Tier 2 / 2b)
_model_variant  = None   # "res2tcn" | "rescaps"
_baseline_clf   = None   # sklearn Pipeline (Tier 3)
_active_model_name: str = "uninitialised"
_init_done: bool = False

# ---------------------------------------------------------------------------
# Audio windowing for Tier 2/2b (Arena evaluation protocol)
# ---------------------------------------------------------------------------

def _pad_fixed(x: np.ndarray, max_len: int = _CUT) -> np.ndarray:
    """Deterministic window: first max_len samples; tile-repeat if shorter."""
    x = np.asarray(x, dtype=np.float32).reshape(-1)
    n = x.shape[0]
    if n >= max_len:
        return x[:max_len]
    reps = max_len // n + 1
    return np.tile(x, reps)[:max_len].astype(np.float32)


# ---------------------------------------------------------------------------
# Bona-fide logit -> is_cloned_prob (for Tier 2 / 2b only)
# ---------------------------------------------------------------------------

def _bonafide_logit_to_cloned_prob(bonafide_logit: float) -> float:
    """
    Tier 2/2b return logits[:,1] where higher = more bona fide (genuine).
    Invert to is_cloned_prob (higher = more fake):
        p_genuine       = sigmoid(bonafide_logit)
        is_cloned_prob  = 1 - p_genuine
    """
    p_genuine = 1.0 / (1.0 + math.exp(-bonafide_logit))
    return round(float(1.0 - p_genuine), 4)


# ---------------------------------------------------------------------------
# Tier 1 -- garystafford wav2vec2 pipeline
# ---------------------------------------------------------------------------

def _try_load_garystafford() -> bool:
    global _hf_pipeline, _active_model_name
    try:
        import torch  # noqa: F401
        from transformers import pipeline as hf_pipeline_fn

        logger.info("Loading Tier 1: %s", _GARYSTAFFORD_MODEL_ID)
        device = 0 if _gpu_available() else -1
        _hf_pipeline = hf_pipeline_fn(
            "audio-classification",
            model=_GARYSTAFFORD_MODEL_ID,
            device=device,
        )
        _active_model_name = _GARYSTAFFORD_MODEL_ID
        logger.info("Tier 1 loaded (device=%s).", "GPU" if device == 0 else "CPU")
        return True
    except Exception as exc:
        logger.warning("Tier 1 (%s) failed: %s. Trying Tier 2...",
                       _GARYSTAFFORD_MODEL_ID, exc)
        return False


def _gpu_available() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Tier 2 -- Res2TCNGuard
# ---------------------------------------------------------------------------

def _try_load_res2tcn() -> bool:
    global _model, _model_variant, _active_model_name
    try:
        import torch
        from huggingface_hub import hf_hub_download

        logger.info("Loading Tier 2: %s", _RES2TCN_REPO)
        ckpt_path = hf_hub_download(repo_id=_RES2TCN_REPO, filename=_RES2TCN_CKPT)
        net_path  = hf_hub_download(repo_id=_RES2TCN_REPO, filename="_net.py")

        net_ns: dict = {}
        with open(net_path, "r", encoding="utf-8") as f:
            exec(compile(f.read(), net_path, "exec"), net_ns)
        TestModel = net_ns["TestModel"]

        sd = torch.load(ckpt_path, map_location="cpu", weights_only=True)
        sd = sd.get("state_dict", sd)
        model = TestModel()
        model.load_state_dict(sd, strict=True)
        model.eval()

        _model = model
        _model_variant = "res2tcn"
        _active_model_name = (
            f"{_RES2TCN_REPO} [WARNING: inverted on modern clips -- "
            f"ASVspoof2019-LA only, EER 1.5% in-domain]"
        )
        logger.warning(
            "Tier 2 (Res2TCNGuard) loaded. NOTE: this model is known to "
            "classify real-world modern clips incorrectly (see Step 3b in "
            "PROGRESS.md). Use results with caution."
        )
        return True
    except Exception as exc:
        logger.warning("Tier 2 (Res2TCNGuard) failed: %s. Trying Tier 2b...", exc)
        return False


# ---------------------------------------------------------------------------
# Tier 2b -- ResCapsGuard
# ---------------------------------------------------------------------------

def _try_load_rescaps() -> bool:
    global _model, _model_variant, _active_model_name
    try:
        import torch
        from huggingface_hub import hf_hub_download

        logger.info("Loading Tier 2b: %s", _RESCAPS_REPO)
        ckpt_path = hf_hub_download(repo_id=_RESCAPS_REPO, filename=_RESCAPS_CKPT)
        net_path  = hf_hub_download(repo_id=_RESCAPS_REPO, filename="_net.py")

        net_ns: dict = {}
        with open(net_path, "r", encoding="utf-8") as f:
            exec(compile(f.read(), net_path, "exec"), net_ns)
        CapsuleNet = net_ns["CapsuleNet"]

        sd = torch.load(ckpt_path, map_location="cpu", weights_only=True)
        sd = sd.get("state_dict", sd)
        model = CapsuleNet()
        model.load_state_dict(sd, strict=True)
        model.eval()

        _model = model
        _model_variant = "rescaps"
        _active_model_name = (
            f"{_RESCAPS_REPO} [WARNING: inverted on modern clips -- "
            f"ASVspoof2019-LA only, EER 1.86% in-domain]"
        )
        logger.warning(
            "Tier 2b (ResCapsGuard) loaded. Same inversion risk as Tier 2."
        )
        return True
    except Exception as exc:
        logger.warning("Tier 2b (ResCapsGuard) failed: %s. Falling back to baseline.", exc)
        return False


# ---------------------------------------------------------------------------
# Tier 3 -- Scikit-learn baseline (PLACEHOLDER)
# ---------------------------------------------------------------------------

def _build_baseline() -> None:
    """
    # PLACEHOLDER BASELINE - replace with a validated pretrained model.
    # Trains LogisticRegression on MFCC+spectral+prosody features from
    # feature_extraction.py using clips in ml/data/ auto-labelled by filename.
    """
    global _baseline_clf, _active_model_name

    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from feature_extraction import extract_features

    wav_files = list(_DATA_DIR.glob("*.wav")) + list(_DATA_DIR.glob("*.mp3"))
    X, y = [], []
    for wav in wav_files:
        label = 1 if _FAKE_PATTERN.search(wav.name) else 0
        try:
            feats = extract_features(str(wav))
            X.append(_feats_to_vector(feats))
            y.append(label)
        except Exception as exc:
            logger.warning("Skipping %s: %s", wav.name, exc)

    n_samples, n_pos, n_neg = len(X), sum(y), len(X) - sum(y)

    if n_samples < 2 or n_pos == 0 or n_neg == 0:
        _baseline_clf = None
        _active_model_name = "baseline-untrained (insufficient labelled data)"
        logger.warning(
            "Baseline NOT trained: need >=1 real AND >=1 fake clip in ml/data/. "
            "Found %d total (%d fake, %d real). classify() will return 0.5.",
            n_samples, n_pos, n_neg,
        )
        return

    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
    ])
    clf.fit(np.array(X), np.array(y))
    _baseline_clf = clf
    _active_model_name = (
        f"baseline-logreg (trained on {n_samples} clips: {n_pos} fake, {n_neg} real)"
    )
    logger.info("Tier 3 baseline trained: %s", _active_model_name)


def _feats_to_vector(feats: dict) -> list:
    vec: list = []
    vec.extend(feats["mfcc_mean"])
    vec.extend(feats["mfcc_var"])
    vec.append(feats["spectral_centroid_mean"])
    vec.append(feats["spectral_flatness_mean"])
    vec.extend(feats["spectral_contrast_mean"])
    vec.append(feats["pitch_mean"])
    vec.append(feats["pitch_std"])
    vec.append(feats["pitch_jitter"])
    return vec


# ---------------------------------------------------------------------------
# Initialisation (lazy -- first call to classify() triggers this once)
# ---------------------------------------------------------------------------

def _ensure_initialised() -> None:
    global _init_done
    if _init_done:
        return
    _init_done = True

    if _try_load_garystafford():
        return
    if _try_load_res2tcn():
        return
    if _try_load_rescaps():
        return
    _build_baseline()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify(audio_path: str) -> dict:
    """
    Classify a WAV/MP3 clip as real vs AI-generated/cloned.

    Parameters
    ----------
    audio_path : str
        Path to the audio file (any format supported by librosa/soundfile).

    Returns
    -------
    dict
        is_cloned_prob : float in [0, 1]
            0 = almost certainly genuine; 1 = almost certainly AI-generated.
        model_name : str
            Identifier of the model/strategy used.
    """
    _ensure_initialised()

    if _hf_pipeline is not None:
        return _classify_with_garystafford(audio_path)

    if _model is not None:
        return _classify_with_asvspoof_model(audio_path)

    return _classify_with_baseline(audio_path)


# ---------------------------------------------------------------------------
# Tier 1 inference -- garystafford wav2vec2
# ---------------------------------------------------------------------------

def _classify_with_garystafford(audio_path: str) -> dict:
    import librosa
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)
    results: list = _hf_pipeline(
        {"array": audio, "sampling_rate": sr},
        top_k=None,
    )
    score_map: dict = {r["label"].upper(): r["score"] for r in results}
    fake_prob = _extract_fake_prob(score_map)
    return {
        "is_cloned_prob": round(float(fake_prob), 4),
        "model_name": _active_model_name,
    }


def _extract_fake_prob(score_map: dict) -> float:
    """Convert HF pipeline label->score dict to a single fake-probability."""
    for key in ("LABEL_1", "FAKE", "SPOOF", "AI", "CLONED", "SYNTHETIC"):
        if key in score_map:
            return score_map[key]
    numeric_keys = sorted(
        (k for k in score_map if k.isdigit()), key=lambda k: int(k)
    )
    if len(numeric_keys) >= 2:
        return score_map[numeric_keys[-1]]
    for key in ("LABEL_0", "REAL", "GENUINE", "BONAFIDE"):
        if key in score_map:
            return 1.0 - score_map[key]
    logger.warning("Could not identify fake label in score_map: %s", score_map)
    return 0.5


# ---------------------------------------------------------------------------
# Tier 2 / 2b inference -- ASVspoof models
# ---------------------------------------------------------------------------

def _classify_with_asvspoof_model(audio_path: str) -> dict:
    """Run inference with Res2TCNGuard or ResCapsGuard. See docstring warning."""
    import torch
    import librosa

    audio, _sr = librosa.load(audio_path, sr=_SR, mono=True)
    x = torch.from_numpy(_pad_fixed(audio))[None]

    with torch.no_grad():
        if _model_variant == "res2tcn":
            _, logits = _model(x)
            bonafide_logit = float(logits[0, 1])
        elif _model_variant == "rescaps":
            _z, class_ = _model(x, random=False, dropout=0)
            bonafide_logit = float(class_[0, 1])
        else:
            raise RuntimeError(f"Unknown model variant: {_model_variant}")

    return {
        "is_cloned_prob": _bonafide_logit_to_cloned_prob(bonafide_logit),
        "model_name": _active_model_name,
    }


# ---------------------------------------------------------------------------
# Tier 3 inference -- sklearn baseline
# ---------------------------------------------------------------------------

def _classify_with_baseline(audio_path: str) -> dict:
    if _baseline_clf is None:
        return {"is_cloned_prob": 0.5, "model_name": _active_model_name}

    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from feature_extraction import extract_features

    feats = extract_features(audio_path)
    vec = np.array([_feats_to_vector(feats)])
    prob = float(_baseline_clf.predict_proba(vec)[0][1])
    return {
        "is_cloned_prob": round(prob, 4),
        "model_name": _active_model_name,
    }


# ---------------------------------------------------------------------------
# CLI: python classifier.py <audio_path>
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    import json
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) != 2:
        print("Usage: python classifier.py <audio_path>")
        sys.exit(1)
    print(json.dumps(classify(sys.argv[1]), indent=2))
