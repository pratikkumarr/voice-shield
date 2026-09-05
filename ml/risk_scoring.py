"""
risk_scoring.py  -  Voice-Clone Risk Analyser
==============================================

Combines two signals:
  1. ``is_cloned_prob``  from classifier.classify()
       -- a deep-model probability (or baseline estimate) that the clip is
          AI-generated / voice-cloned.
  2. ``pitch_jitter``   from feature_extraction.extract_features()
       -- mean absolute frame-to-frame F0 deviation; anomalously high or low
          values are a prosody-irregularity flag for AI-generated speech.

Scoring formula
---------------
  raw_score = 0.70 * is_cloned_prob  +  0.30 * jitter_score
  risk_score = int(raw_score * 100)  clamped to [0, 100]

where ``jitter_score`` is a sigmoid-like normalisation of pitch_jitter:
  - Very low jitter  (<5 Hz)   => 0.70  (suspiciously flat F0 contour)
  - Normal range     (5-40 Hz) => linearly interpolated ~0-0.50
  - Very high jitter (>40 Hz)  => 0.70  (chaotic / robotic artefacts)

This heuristic is deliberately conservative so that genuine speakers with
flat or excited delivery are not over-penalised.

Verdict thresholds
------------------
  risk_score < 30   => "LIKELY GENUINE"
  30 <= score < 65  => "SUSPICIOUS - VERIFY"
  score >= 65       => "LIKELY CLONED"

Public API
----------
    analyze(audio_path: str) -> dict

    Return shape (contract for the backend):
    {
      "risk_score":  int,          # 0-100
      "verdict":     str,          # one of the three verdicts above
      "confidence":  float,        # 0.0-1.0
      "flags":       list[str],    # human-readable reason strings
      "latency_ms":  int           # wall-clock time for this call
    }
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Ensure the ml/ directory is on sys.path so sibling imports work
_HERE = Path(__file__).parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from classifier import classify
from feature_extraction import extract_features

# ---------------------------------------------------------------------------
# Threshold constants
# ---------------------------------------------------------------------------

_VERDICT_LIKELY_GENUINE  = "LIKELY GENUINE"
_VERDICT_SUSPICIOUS      = "SUSPICIOUS - VERIFY"
_VERDICT_LIKELY_CLONED   = "LIKELY CLONED"

_THRESH_GENUINE  = 30   # risk_score < this  => LIKELY GENUINE
_THRESH_CLONED   = 65   # risk_score >= this => LIKELY CLONED

# Jitter thresholds (Hz)
_JITTER_TOO_LOW  = 5.0   # suspiciously flat pitch (many TTS systems)
_JITTER_NORMAL_LOW  = 5.0
_JITTER_NORMAL_HIGH = 40.0
_JITTER_TOO_HIGH = 40.0  # chaotic / robotic F0 jumps

# Classifier weight in the combined score
_W_CLF    = 0.70
_W_JITTER = 0.30


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _jitter_to_score(pitch_jitter: float) -> tuple[float, list[str]]:
    """
    Map pitch_jitter (Hz) to a [0, 1] suspicion score and generate flags.

    Returns (jitter_score, flag_strings).
    """
    flags: list[str] = []

    if pitch_jitter == 0.0:
        # No voiced frames detected; treat as mildly suspicious
        flags.append("no voiced frames detected (pitch analysis unavailable)")
        return 0.55, flags

    if pitch_jitter < _JITTER_TOO_LOW:
        # Suspiciously monotone - common in TTS / voice cloning
        score = 0.70
        flags.append(
            f"unnatural pitch micro-variation: jitter={pitch_jitter:.1f} Hz "
            f"(below {_JITTER_TOO_LOW} Hz - suspiciously flat F0 contour)"
        )
    elif pitch_jitter > _JITTER_TOO_HIGH:
        # Chaotic F0 jumps - robotic artefacts in some vocoders
        score = 0.65
        flags.append(
            f"erratic pitch micro-variation: jitter={pitch_jitter:.1f} Hz "
            f"(above {_JITTER_TOO_HIGH} Hz - unstable F0 artefacts)"
        )
    else:
        # Normal range: linearly scale 0.0 -> 0.50 as jitter moves from
        # high-normal toward low-normal (gentle suspicion gradient)
        span = _JITTER_NORMAL_HIGH - _JITTER_NORMAL_LOW
        pos  = (pitch_jitter - _JITTER_NORMAL_LOW) / span   # 0=low end, 1=high end
        # Low-normal end is slightly more suspicious than high-normal
        score = 0.50 * (1.0 - pos)

    return score, flags


def _compute_confidence(risk_score: int) -> float:
    """
    Confidence = how far from the nearest decision boundary the score is.

    Boundaries are at 30 and 65.  Score 0 or 100 => confidence 1.0.
    Score exactly at a boundary (30 or 65) => confidence 0.0.
    """
    dist_to_boundary = min(
        abs(risk_score - _THRESH_GENUINE),
        abs(risk_score - _THRESH_CLONED),
    )
    # Maximum possible distance from a boundary is max(30, 35, 35) = 35
    max_dist = max(_THRESH_GENUINE, 100 - _THRESH_CLONED, _THRESH_CLONED - _THRESH_GENUINE)
    confidence = min(1.0, dist_to_boundary / max_dist)
    return round(confidence, 4)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze(audio_path: str) -> dict:
    """
    Full risk analysis for a single audio clip.

    Parameters
    ----------
    audio_path : str
        Path to the audio file.

    Returns
    -------
    dict with keys:
        risk_score  : int   0-100
        verdict     : str   "LIKELY GENUINE" | "SUSPICIOUS - VERIFY" | "LIKELY CLONED"
        confidence  : float 0.0-1.0
        flags       : list[str]  human-readable reason strings
        latency_ms  : int   wall-clock time for this entire call
    """
    t0 = time.monotonic()

    flags: list[str] = []

    # -- 1. Classifier signal ------------------------------------------------
    clf_result = classify(audio_path)
    is_cloned_prob: float = clf_result["is_cloned_prob"]
    model_name: str       = clf_result["model_name"]

    if is_cloned_prob >= 0.70:
        flags.append(
            f"classifier flagged audio as likely AI-generated "
            f"(p={is_cloned_prob:.2f}, model: {model_name})"
        )
    elif is_cloned_prob >= 0.45:
        flags.append(
            f"classifier returned ambiguous result "
            f"(p={is_cloned_prob:.2f}, model: {model_name})"
        )

    # -- 2. Prosody / jitter signal ------------------------------------------
    feats = extract_features(audio_path)
    pitch_jitter: float = feats["pitch_jitter"]
    jitter_score, jitter_flags = _jitter_to_score(pitch_jitter)
    flags.extend(jitter_flags)

    # -- 3. Combined risk score ----------------------------------------------
    raw = _W_CLF * is_cloned_prob + _W_JITTER * jitter_score
    risk_score = max(0, min(100, int(round(raw * 100))))

    # -- 4. Verdict ----------------------------------------------------------
    if risk_score < _THRESH_GENUINE:
        verdict = _VERDICT_LIKELY_GENUINE
    elif risk_score < _THRESH_CLONED:
        verdict = _VERDICT_SUSPICIOUS
    else:
        verdict = _VERDICT_LIKELY_CLONED

    # -- Escalation Rule -----------------------------------------------------
    # INTENTIONAL DESIGN CHOICE (Fraud-Prevention Policy):
    # If pitch is suspiciously flat (jitter < 5 Hz), it often indicates TTS.
    # If the classifier fails to confidently flag the clip as a clone (<= 0.65),
    # we force the verdict to SUSPICIOUS - VERIFY. This is a deliberate policy
    # to prioritise catching false negatives (missed clones) over false positives.
    # A genuine user with flat delivery may be asked to re-verify, which is acceptable.
    if pitch_jitter < _JITTER_TOO_LOW and is_cloned_prob <= 0.65:
        if verdict == _VERDICT_LIKELY_GENUINE:
            verdict = _VERDICT_SUSPICIOUS
            flags.append(
                "escalated (fraud-prevention policy): suspiciously flat pitch (low jitter) "
                "with non-confident classifier signal - possible clone."
            )

    # -- 5. Confidence -------------------------------------------------------
    confidence = _compute_confidence(risk_score)

    # -- 6. Latency ----------------------------------------------------------
    latency_ms = int((time.monotonic() - t0) * 1000)

    return {
        "risk_score":  risk_score,
        "verdict":     verdict,
        "confidence":  confidence,
        "flags":       flags,
        "latency_ms":  latency_ms,
    }


# ---------------------------------------------------------------------------
# CLI: python risk_scoring.py <audio_path>
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) != 2:
        print("Usage: python risk_scoring.py <audio_path>")
        sys.exit(1)

    audio_path = sys.argv[1]
    try:
        result = analyze(audio_path)
        print(json.dumps(result, indent=2))
    except Exception as exc:
        logger.exception("Analysis failed for '%s'", audio_path)
        print(json.dumps({"error": str(exc)}, indent=2))
        sys.exit(1)
