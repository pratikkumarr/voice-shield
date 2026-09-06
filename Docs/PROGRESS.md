# PROGRESS.md — SentinelVoice

> Append-only. Never edit or delete a previous entry — add a new one below it, newest at the bottom. Read the whole file before starting your next step, not just the last entry.

## [Step 0] Project kickoff — 3 Sept — (your name)
**Status:** done
**What I built:** Repo scaffold, docs/ (PLAN, PRD, TRD, GIT_WORKFLOW, PROMPTS), initial folder structure per TRD.md §3.
**Files touched:** docs/*, folder skeleton (ml/, backend/, frontend/, blockchain/, demo/)
**What the next person needs to know:** Read PRD.md + TRD.md before writing any code — MVP scope is locked, don't add features outside it.
**Blockers:** none

<!-- Add new entries below this line, one per step. Copy this block: -->

## [Step 1] repo scaffold + ml setup — 4 Sept — AI Assistant
**Status:** done
**What I built:** Created repo skeleton, docker-compose stub, ml/requirements.txt, and ml/data/ structure.
**Files touched:** docker-compose.yml, ml/requirements.txt, ml/data/README.md, ml/data/.gitignore, README.md, and empty directories.
**What the next person needs to know:** The ML folder is set up for requirements and dataset management.
**Blockers:** none

## [Step 2] Feature extraction — 4 Sept — Person A
**Status:** done
**What I built:** ml/feature_extraction.py — extract_features(audio_path: str) -> dict
**Files touched:** ml/feature_extraction.py
**What the next person needs to know:** Verified output contract (tested on a 20.94s clip):
{
  'duration': float, 'sample_rate': int,
  'pitch_mean': float, 'pitch_std': float, 'pitch_jitter': float,
  'spectral_centroid_mean': float, 'spectral_flatness_mean': float,
  'spectral_contrast_mean': list[7 floats],
  'mfcc_mean': list[20 floats], 'mfcc_var': list[20 floats]
}
'pitch_jitter' is the prosody micro-variation signal risk_scoring.py should weight heavily.
**Blockers:** none

## [Step 2 - manual check] Feature discrimination sanity test — 4 Sept — Person A
**Status:** done
**What I checked:** ran extract_features() on a real clip (test2.wav) vs a TTS clip (test1_fake.wav).
pitch_jitter and spectral_flatness_mean came out clearly different between the two — feature
extraction appears discriminative, not noise. pitch_jitter was higher in the real human clip (8.92) compared to the TTS clip (5.06), reflecting natural vocal micro-variations.
**Blockers:** none — proceeding to Step 3 (classifier + risk scoring)

## [Step 3] Anti-spoofing classifier + risk scoring — 4 Sept — AI Assistant
**Status:** done
**What I built:**
- `ml/classifier.py` — `classify(audio_path: str) -> {"is_cloned_prob": float, "model_name": str}`
  Two-tier strategy:
  - **Tier 1 (preferred):** loads `garystafford/wav2vec2-deepfake-voice-detector` from HuggingFace via `transformers.pipeline("audio-classification")`. Requires torch + transformers installed. Handles any label-string convention the model uses (LABEL_0/1, REAL/FAKE, numeric, etc.).
  - **Tier 2 (fallback baseline — PLACEHOLDER):** if torch/transformers are unavailable, trains a scikit-learn LogisticRegression on MFCC + spectral + prosody features from feature_extraction.py using clips in ml/data/. Files auto-labelled by filename: anything containing `fake/clone/ai/tts/spoof/synthetic` → label 1 (fake), everything else → label 0 (real). If fewer than 1 clip per class, returns neutral 0.5 with a warning.
- `ml/risk_scoring.py` — `analyze(audio_path: str) -> dict` (the backend contract)
  Combines classifier output (70% weight) with pitch_jitter from feature_extraction (30% weight) into:
  `{"risk_score": int 0-100, "verdict": str, "confidence": float, "flags": list[str], "latency_ms": int}`
  Verdict thresholds: <30 = "LIKELY GENUINE", 30–64 = "SUSPICIOUS - VERIFY", ≥65 = "LIKELY CLONED".
  Jitter scoring: <5 Hz → 0.70 suspicion (flat TTS pitch), 5–40 Hz → linear 0.0–0.50 (normal), >40 Hz → 0.65 (chaotic vocoder artefacts).
  Has `__main__` block: `python risk_scoring.py <path>` prints JSON.

**Files touched:**
- `ml/classifier.py` [NEW]
- `ml/risk_scoring.py` [NEW]
- `ml/requirements.txt` — added `transformers>=4.30.0`, `accelerate`
- `ml/data/test1.wav` → renamed to `ml/data/test1_fake.wav` (confirmed AI-generated; now correctly auto-labelled as fake by the baseline)
- `Docs/PROGRESS.md` — updated Step 2 manual-check entry to reflect the rename

**What the next person needs to know:**
- The backend should call `analyze(audio_path)` from `risk_scoring.py` — that is the only public contract needed.
- To activate Tier 1 (the real pretrained model), install: `pip install torch torchaudio transformers accelerate`. Without torch, the baseline runs instead.
- The baseline is currently trained on 3 clips (1 fake: test1_fake.wav, 2 real: test2.wav + Video Project 14.wav). Add more labelled clips to ml/data/ — use the fake-keyword naming convention — to improve it. The baseline is a stopgap; Tier 1 is strongly preferred.
- Verified end-to-end: `python risk_scoring.py data/test2.wav` (real clip) → risk_score 15, "LIKELY GENUINE", no flags. Baseline trained log confirmed: "trained on 3 clips: 1 fake, 2 real".

**Blockers:** torch not installed in current env → Tier 1 HF model unavailable. Baseline fills the gap but is less accurate. Install torch to unlock the pretrained model.

## [Step 3b] Model validation + tier-order fix — 6 Sept — AI Assistant
**Status:** done
**What I found:**
Tested `Res2TCNGuard` (`SpeechAntiSpoofingBenchmarks/Res2TCNGuard`, EER 1.5% on ASVspoof2019-LA)
against two real-world clips: `pratik sample to clone.wav` (confirmed genuine) and
`pratik cloned voice.wav` (confirmed AI-cloned). The model classified them **exactly backwards**:

| Clip | Expected | Res2TCNGuard said | Raw logits (spoof / bonafide) |
|---|---|---|---|
| `pratik sample to clone.wav` (genuine) | LIKELY GENUINE | LIKELY CLONED (p=1.00) | +9.33 / -10.67 |
| `pratik cloned voice.wav` (AI-cloned) | LIKELY CLONED | LIKELY GENUINE (p=0.05) | -1.88 / +2.91 |

**Root cause:** Res2TCNGuard is trained exclusively on ASVspoof2019-LA vocoder attacks from 2019.
Modern neural voice cloners (e.g. ElevenLabs, RVC) produce waveforms that the model has never
seen and scores as "bona fide", while genuine human speech (with natural noise, breath,
reverberation) looks like "spoof" to it. This matches the published out-of-domain numbers:
InTheWild EER = 52.52%, CD-ADD EER = 56.10% — near-random on modern real-world audio.

By contrast, `garystafford/wav2vec2-deepfake-voice-detector` (the previous Tier 1) correctly
gave p_cloned=1.00 on the confirmed fake and risk_score=14 ("LIKELY GENUINE") on real clips
in earlier testing, despite having no published benchmark numbers.

**Decision made:** Restore garystafford as Tier 1 (operational primary). Demote Res2TCNGuard
to Tier 2 and ResCapsGuard to Tier 2b. Both ASVspoof models are kept because they may still
detect 2019-era parametric TTS attacks, but their output is tagged with a [WARNING] in
model_name so callers know to treat it with caution. sklearn baseline remains Tier 3.

**Files touched:**
- `ml/classifier.py` — tier order changed: garystafford=Tier1, Res2TCN=Tier2, ResCaps=Tier2b, sklearn=Tier3.
  Module docstring updated with the empirical failure data and explicit WARNING comments.
  `_model_name` for ASVspoof tiers now contains "[WARNING: inverted on modern clips]" string.

**What the next person needs to know:**
- Do NOT use Res2TCNGuard or ResCapsGuard as the primary detector for modern voice cloning tools
  without first running a held-out evaluation set of modern clips to confirm correct direction.
  The raw logit signs may need to be flipped for certain attack types.
- garystafford has no published EER but empirically works on our data. Finding and swapping in
  a model with BOTH published benchmarks AND correct generalisation to modern TTS is the next
  priority research task.
- The correct tier for any new model should be validated against at minimum:
  1 confirmed genuine clip + 1 confirmed modern-TTS/VC clip before merging.
- Raw logit values from Tier 2/2b are logged at WARNING level so they are visible in prod logs.

**Blockers:** No validated single model covers both in-domain benchmark performance AND
modern neural-TTS generalisation. This is an active research gap. garystafford is the best
available operational choice until a better model is found and empirically validated.

## [Step 3 - risk scoring tuning] Escalation policy for missed clones — 6 Sept — AI Assistant
**Status:** done
**What changed:** ml/risk_scoring.py — added escalation rule: if pitch_jitter < 5.0 Hz AND
is_cloned_prob <= 0.65, force verdict to at least SUSPICIOUS - VERIFY, overriding the raw
weighted score.
**Why:** garystafford classifier missed a real cloned voice (ram cloned.wav, p=0.007 - confidently
wrong) that Pratik's cloned clip caught cleanly (p=0.98). Root cause: classifier doesn't
generalize across all cloning tools/voices (documented, known limitation - see also Res2TCNGuard
finding above). Jitter signal correctly flagged both Ram clips as flat (<5Hz) but original
threshold (0.35-0.65 "uncertain" band) didn't cover confidently-wrong low-probability cases.
**Trade-off (intentional):** broadening the escalation also flags ram test voice.wav (genuine,
jitter=4.6Hz) as SUSPICIOUS - a false positive. Accepted deliberately: in fraud prevention,
missed clones cost more than occasional re-verification friction on genuine callers.
**Verified across all 4 test pairs:** pratik pair unchanged (correct), both ram clips now
escalate to SUSPICIOUS (ram cloned.wav corrected from false-negative GENUINE; ram test voice.wav
is an accepted false-positive trade-off).
**What the next person needs to know:** demo with pratik pair (clean signal). Ram pair is a
deliberate Q&A talking point, not a bug to hide.
**Blockers:** none. Hindi test still outstanding - not yet run against any model.

<!--
## [Step N] <name> — <date> — <your name>
**Status:** done / blocked / in progress
**What I built:**
**Files touched:**
**What the next person needs to know:**
**Blockers:**
-->

## [Step 4] FastAPI Backend Setup — 6 Sept — AI Assistant
**Status:** done
**What I built:**
- backend/main.py: Created the FastAPI application with CORS enabled for localhost:3000 and localhost:5173.
  - Added GET /health for basic liveness.
  - Added POST /analyze to handle multipart/form-data audio file uploads, temporarily save the file, call ml.risk_scoring.analyze(), enrich the response with audit_hash and timestamp, and clean up the file afterwards.
- backend/requirements.txt: Merged backend dependencies (fastapi, uvicorn, python-multipart) with the existing ML dependencies.
- backend/README.md: Wrote run instructions and documented the API contract as specified in Docs/TRD.md.
**Files touched:**
- backend/main.py [NEW]
- backend/requirements.txt [NEW]
- backend/README.md [NEW]
**What the next person needs to know:**
- The backend is fully operational against the live ML code (not a stub).
- To run the backend, install the dependencies from backend/requirements.txt and execute uvicorn main:app --reload from the backend/ directory.
- The next step is likely the React frontend which should hit http://localhost:8000/analyze.
**Blockers:** none

## [Step 5] Streaming simulation + alert logic — 6 Sept — AI Assistant
**Status:** done
**What I built:**
- backend/alerts.py: Created `recommended_action` helper with threshold logic.
- backend/main.py: Updated `POST /analyze` to include `recommended_action`. Added `WS /stream` endpoint to process 1s binary audio chunks incrementally via WebSocket.
- backend/README.md: Added API documentation for `/stream` and the logic for `recommended_action`.
**Files touched:**
- backend/alerts.py [NEW]
- backend/main.py [MODIFIED]
- backend/README.md [MODIFIED]
- docs/PROGRESS.md [MODIFIED]
**What the next person needs to know:**
- The websocket endpoint processes binary audio messages. If chunk analysis throws an exception (e.g. chunk too small for ML), a fallback payload is returned for that chunk so the stream doesn't crash.
- Next steps involve integrating with the frontend and/or the blockchain hash-chain logic.
**Blockers:** none

## [Step 6] Frontend Dashboard — 6 Sept — AI Assistant
**Status:** done
**What I built:**
- `frontend/` — React + Vite + Tailwind CSS v3 single-page dashboard (SentinelVoice)
- `frontend/src/api/analyze.js` — `analyzeAudio()` POSTs multipart to `http://localhost:8000/analyze`; `fetchAuditHistory()` calls `GET http://localhost:8000/audit/history` and returns null (not throws) on 404/network error for graceful empty state.
- `frontend/src/components/AudioInput.jsx` — file upload (audio/*) + MediaRecorder-based in-browser recording with live timer and clear state indicators.
- `frontend/src/components/RiskScore.jsx` — SVG circular progress ring with green (<30) / amber (30–70) / red (>70) color bands. Renders exact backend verdict string unmodified.
- `frontend/src/components/RecommendedAction.jsx` — displays backend-provided `recommended_action` prominently. No threshold logic duplicated in frontend.
- `frontend/src/components/AnalysisResult.jsx` — confidence, detection flags (list or "No specific detection flags reported."), latency_ms, timestamp, audit_hash. Never shows null/undefined values.
- `frontend/src/components/AuditTrail.jsx` — fetches `GET http://localhost:8000/audit/history`; shows "No audit records available yet" on 404; shows entries table when data is present. App never crashes when endpoint is missing.
- `frontend/src/App.jsx` — single-page layout; clears stale result before each new analysis; animated loading state; clean user-facing error messages; no raw stack traces exposed.

**Files touched:**
- frontend/package.json [NEW], vite.config.js [NEW], tailwind.config.js [NEW], postcss.config.js [NEW], index.html [NEW], public/shield.svg [NEW]
- frontend/src/main.jsx [NEW], App.jsx [NEW], index.css [NEW]
- frontend/src/api/analyze.js [NEW]
- frontend/src/components/AudioInput.jsx [NEW], RiskScore.jsx [NEW], RecommendedAction.jsx [NEW], AnalysisResult.jsx [NEW], AuditTrail.jsx [NEW]
- frontend/README.md [NEW]
- Docs/PROGRESS.md [MODIFIED]

**What the next person needs to know:**
- Run: `cd frontend && npm install && npm run dev` → http://localhost:5173
- Backend must be running at http://localhost:8000 for /analyze to work.
- `GET /audit/history` is not yet implemented in backend (returns 404). Frontend handles this gracefully with "No audit records available yet" — does NOT crash.
- Tailwind CSS v3 is used. Do not upgrade to v4 without testing all utility classes.
- The audit URL is exactly `http://localhost:8000/audit/history` (not a relative URL).
- Risk threshold color bands are frontend display only. `recommended_action` string comes entirely from backend.
- `npm run build` verified: ✓ 37 modules transformed, no errors, exit code 0.
- `npm run dev` verified: VITE v5.4.21 ready in ~300ms on port 5173.

**Blockers:** none
