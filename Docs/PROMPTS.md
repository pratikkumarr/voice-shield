# PROMPTS.md — Antigravity build plan for SentinelVoice

10 steps, split as you described: **Person A = Steps 1-3 and 8-10, Person B = Steps 4-7.**
Each step names the exact model to select in Antigravity's model picker, the folder(s) it's allowed to touch, and the literal prompt to paste into the agent.

## Model routing — read this first

Antigravity gives you Gemini 3.1 Pro/Flash with generous limits, plus Claude and GPT-OSS models that are capped weekly. Budget accordingly:

- **Default to Gemini 3.1 Pro for ~80% of steps**: scaffolding, boilerplate, standard CRUD/API code, data pipelines, Docker config, straightforward frontend components, debugging on the first attempt. It's a strong agentic coder and you don't pay a scarce-quota tax for it.
- **Reserve Claude (Sonnet, or Opus if available) for the handful of steps where reasoning/writing quality directly wins or loses judging points**: the final PPT narrative and Q&A prep (Step 10), and UI/UX polish (Step 6, second pass only) — a visually sharp dashboard genuinely moves judges.
- **Escalate to Claude or GPT mid-step only as a fallback**: if Gemini gets stuck on the *same* bug twice, switch models rather than burning another hour. Don't pre-emptively use premium models "just in case."
- **Gemini 3 Flash** is fine for trivial, mechanical tasks (renaming, formatting, simple config edits) if you want to save even Gemini 3.1 Pro's quota for the meatier steps.

Every prompt below tells you which model to select and which folders the agent may touch — paste that scope restriction verbatim, it's what keeps two people's work from colliding when you merge.

---

## STEP 1 — Repo scaffold + dataset setup
**Owner:** Person A · **Model:** Gemini 3.1 Pro · **Scope:** whole repo (first commit only), then `/ml`

```
You are setting up the initial repository for a hackathon project called SentinelVoice
(SIH problem statement SIH26104 — real-time voice cloning/impersonation detection).

Create this exact folder structure at the repo root:
docs/, ml/, backend/, frontend/, blockchain/, demo/, docker-compose.yml (empty stub for now), README.md

Only touch these paths in this task. Do not write application logic yet except inside /ml.

Inside /ml, create:
- ml/requirements.txt with: librosa, torchaudio, torch, numpy, soundfile, scikit-learn, fastapi (for later), python-multipart
- ml/data/ (empty dir with a .gitkeep and a README.md explaining: this folder will hold a small curated
  set of real vs AI-cloned/TTS-generated voice clips for testing, sourced from ASVspoof5 / "In the Wild"
  deepfake audio dataset / Fake-or-Real dataset, plus a few self-generated clips. Do NOT commit large
  audio files to git — add a .gitignore entry for ml/data/*.wav and ml/data/*.mp3, and instead document
  in the README where teammates should download samples from.

Write a top-level README.md with: project name, one-line description, the folder structure above,
and "see docs/PLAN.md, docs/PRD.md, docs/TRD.md before making changes."

Initialize git if not already, and make an initial commit "Step 0: repo scaffold".
```

**Expected output:** repo skeleton, ml/requirements.txt, ml/data/README.md, top-level README.md.
**When done:** update `docs/PROGRESS.md` per the template in `GIT_WORKFLOW.md`.

---

## STEP 2 — Feature extraction pipeline
**Owner:** Person A · **Model:** Gemini 3.1 Pro · **Scope:** `/ml` only

```
Work only inside the /ml folder. Do not touch /backend, /frontend, or /blockchain.

Build ml/feature_extraction.py for a voice-cloning/deepfake-audio detector. It should expose one
main function:

    def extract_features(audio_path: str) -> dict

that loads an audio file (librosa, resample to 16kHz mono) and returns a dict of:
- MFCCs (mean + variance across frames)
- spectral centroid, spectral flatness, spectral contrast (mean values)
- a simple prosody proxy: pitch (F0) contour statistics via librosa.pyin — mean, std, and
  "micro-variation" (short-window pitch jitter) as a numeric score
- total duration and sample rate

Make it robust to short clips (3-15 sec) and raise a clear error for corrupt/empty files.
Add a __main__ block that lets me run `python feature_extraction.py <path-to-wav>` and prints
the feature dict, so I can sanity-check it manually against a real sample.

Write a short docstring at the top of the file explaining the design choice: these features feed
a downstream classifier plus a rule-based prosody-irregularity flag, per docs/TRD.md.
```

**Expected output:** `ml/feature_extraction.py`, runnable standalone. **When done:** append to PROGRESS.md with the exact function signature (`extract_features(audio_path) -> dict` and its keys) — Step 3 and Step 4 depend on this contract.

---

## STEP 3 — Baseline classifier + risk scoring
**Owner:** Person A · **Model:** Gemini 3.1 Pro (switch to Claude only if it can't get a pretrained model loading correctly after two tries) · **Scope:** `/ml` only

```
Work only inside the /ml folder.

Build ml/classifier.py that wraps a pretrained anti-spoofing / synthetic-speech-detection model
so we can classify a clip as real vs AI-generated/cloned. Prefer a small, easy-to-load pretrained
model available via Hugging Face (search for a wav2vec2-based or similar audio deepfake/spoof
classifier). If no suitable pretrained model can be loaded quickly, fall back to a simple baseline:
train a lightweight classifier (e.g. logistic regression or small MLP via scikit-learn) on the
features from feature_extraction.py using whatever labeled sample clips exist in ml/data/, and
clearly comment that this is a placeholder baseline pending a stronger pretrained model.

Expose:
    def classify(audio_path: str) -> dict
returning {"is_cloned_prob": float (0-1), "model_name": str}

Then build ml/risk_scoring.py that combines classify() output with the prosody micro-variation
score from feature_extraction.py into a single interface:
    def analyze(audio_path: str) -> dict
returning exactly this shape (this is the contract the backend will call):
{
  "risk_score": int 0-100,
  "verdict": "LIKELY GENUINE" | "SUSPICIOUS - VERIFY" | "LIKELY CLONED",
  "confidence": float 0-1,
  "flags": [list of short human-readable reason strings, e.g. "unnatural pitch micro-variation"],
  "latency_ms": int (measured wall-clock time for the analyze() call)
}

Add a __main__ block: `python risk_scoring.py <path>` prints the JSON.
```

**Expected output:** `ml/classifier.py`, `ml/risk_scoring.py`. **When done:** update PROGRESS.md with the final `analyze()` output contract verbatim — this is the single most important handoff of the whole project, Person B builds the entire backend against it.

---

## STEP 4 — FastAPI backend
**Owner:** Person B · **Model:** Gemini 3.1 Pro · **Scope:** `/backend` only (read `/ml`, don't edit it)

```
Work only inside the /backend folder. You may import from /ml but do not modify any file inside /ml.

Read ml/risk_scoring.py to see the exact analyze(audio_path) -> dict contract (documented in
docs/PROGRESS.md under Step 3 if the code isn't finished yet — use that contract to build against
even if you can't run it yet).

Build a FastAPI app in backend/main.py with:
- POST /analyze — accepts a multipart/form-data audio file upload, saves it to a temp path,
  calls analyze(), returns the JSON dict as-is, then deletes the temp file (don't persist raw audio).
- GET /health — simple {"status": "ok"}
- CORS enabled for local frontend dev (allow http://localhost:5173 and http://localhost:3000)

Create backend/requirements.txt (fastapi, uvicorn, python-multipart, plus whatever ml/requirements.txt
needs since this service will run ml/ code).

Add a backend/README.md with the run command (uvicorn main:app --reload) and the exact request/response
shape for /analyze, copied from docs/TRD.md §4.

If ml/risk_scoring.py isn't finished/committed yet, build against a STUB function in backend/main.py
that returns realistic fake data matching the contract, clearly marked with a TODO to swap in the
real import once /ml lands — don't block on it.
```

**Expected output:** `backend/main.py`, `backend/requirements.txt`, `backend/README.md`. **When done:** update PROGRESS.md.

---

## STEP 5 — Streaming simulation + alert logic
**Owner:** Person B · **Model:** Gemini 3.1 Pro · **Scope:** `/backend` only

```
Work only inside the /backend folder.

Add a WebSocket endpoint WS /stream to backend/main.py that simulates near-real-time analysis:
the client sends audio chunks (~1 sec each) over the socket; for each chunk, run it through the
same analyze() pipeline (or a lightweight per-chunk approximation if full analysis is too slow
per-chunk) and send back an incremental JSON update in the same shape as /analyze, plus a
"chunk_index" field. This should let the frontend show a live-updating risk score as if it were
a real call.

Also add simple threshold-based alert logic as a helper function `def recommended_action(risk_score:
int) -> str` in backend/alerts.py:
- score < 30 -> "No action needed"
- 30-70 -> "Recommend secondary verification (callback on a known number)"
- >70 -> "Block action, escalate to supervisor, do not proceed with transaction"
Wire this into both /analyze and /stream responses as an "recommended_action" field.
```

**Expected output:** WS `/stream` endpoint, `backend/alerts.py`. **When done:** update PROGRESS.md.

---

## STEP 6 — Frontend dashboard
**Owner:** Person B · **Model:** Gemini 3.1 Pro for scaffolding, then **switch to Claude Sonnet for one polish pass** once the functional UI works — visual quality here genuinely affects judging, worth spending quota on. · **Scope:** `/frontend` only

```
[First pass - Gemini 3.1 Pro]
Work only inside the /frontend folder.

Scaffold a React app (Vite) called SentinelVoice dashboard. Build:
- A file upload + record-audio component (use the MediaRecorder API for recording, plus a plain
  file input for upload).
- On submit, POST to http://localhost:8000/analyze (multipart/form-data) and display the response:
  risk score as a large number with a color band (green <30, amber 30-70, red >70), the verdict
  text, the list of "flags" as bullet points, the recommended_action, and latency_ms.
  Reference the exact response shape in docs/TRD.md §4.
- A simple "Audit Trail" panel that calls GET http://localhost:8000/audit/history (build against
  a stub if that endpoint doesn't exist yet) and lists past analyses with their hash/timestamp.
- Use Tailwind for styling. Keep it clean and readable on a projector - large fonts, high contrast,
  minimal clutter. This will be shown live to judges.

[Second pass - switch to Claude Sonnet, run after the above works]
Do a visual polish pass only - do not change functionality or the API calls. Improve typography,
spacing, color palette (should read as "security/trust" - consider deep blues/teals with a clear
red/amber/green risk indicator), and add a subtle loading/analyzing animation during the API call
so the UI doesn't feel frozen. Keep it to a single page, no new dependencies beyond what's already
installed unless essential.
```

**Expected output:** working `/frontend` React app. **When done:** update PROGRESS.md.

---

## STEP 7 — Blockchain audit-log module
**Owner:** Person B · **Model:** Gemini 3.1 Pro · **Scope:** `/blockchain` only

```
Work only inside the /blockchain folder.

Build blockchain/hash_chain.py implementing a simple append-only, tamper-evident local ledger:
- Each entry: {index, timestamp, risk_score, verdict, data_hash, prev_hash, entry_hash}
  where entry_hash = SHA-256(index + timestamp + risk_score + verdict + data_hash + prev_hash)
- Persist entries to blockchain/ledger.json (create if missing).
- Expose:
    def add_entry(risk_score: int, verdict: str, data_hash: str) -> dict   # appends and returns the new entry
    def get_history() -> list[dict]                                        # returns all entries
    def verify_chain() -> bool                                             # recomputes hashes and confirms no tampering
- Add a __main__ demo that adds 3 fake entries and prints verify_chain() = True, then manually
  corrupts one entry and shows verify_chain() = False, to prove the tamper-evidence works — this
  will be useful to show live in the demo/Q&A.

Optionally, as a stretch goal only if time allows, add blockchain/testnet_anchor.py using web3.py
that can anchor a batch hash to a public testnet (e.g. Polygon Amoy) - but this must be fully
optional and never something the live demo depends on, since it needs network access. Comment
clearly that hash_chain.py alone is sufficient and reliable for the demo.
```

**Expected output:** `blockchain/hash_chain.py`, `blockchain/ledger.json`, optional testnet stretch file. **When done:** update PROGRESS.md, and flag in it that `/backend`'s `/audit/log` and `/audit/history` endpoints (Step 8) should call these functions.

---

## STEP 8 — Integration (the critical day)
**Owner:** Person A · **Model:** Gemini 3.1 Pro, escalate to Claude if a specific integration bug survives two attempts · **Scope:** shared — this is the one step allowed to touch everything

```
Read docs/PROGRESS.md fully first - it has the exact interface contracts from every prior step.

Task: wire the full system together.
1. In backend/main.py, replace any stub analyze() with the real import from ml/risk_scoring.py.
2. Add POST /audit/log (called internally after every /analyze, writes to the ledger via
   blockchain/hash_chain.add_entry, using a hash of the risk result as data_hash) and
   GET /audit/history (calls blockchain/hash_chain.get_history) - wire these into main.py.
3. Confirm the frontend's calls to /analyze, /stream, and /audit/history match the real backend
   responses exactly - fix any field-name mismatches (this is the single most common integration bug).
4. Write a docker-compose.yml at repo root that runs backend (with ml/ and blockchain/ as
   dependencies) and frontend as two services, backend on :8000, frontend on :5173 (or its build
   preview port), with a shared volume only if needed for ledger.json persistence.
5. Run the full flow end-to-end yourself: upload a clip -> see a risk score -> see it appear in
   the audit trail -> verify the chain via verify_chain(). Fix anything broken.
6. Update the root README.md with exact setup + run instructions (docker compose up, or manual
   per-service instructions as a fallback if Docker has issues on demo day).

Do not add new features in this step - only wire together what already exists per the contracts
in PROGRESS.md. If a contract mismatch is found, fix the smaller/newer side to match the
established contract rather than changing both.
```

**Expected output:** fully wired app, `docker-compose.yml`, updated README. **When done:** update PROGRESS.md with any contract changes made during integration, and a clear "how to run this" summary for Step 9/10.

---

## STEP 9 — Demo assets + backup video
**Owner:** Person A · **Model:** Gemini 3.1 Pro (this is mostly manual/curation work, not heavy coding)

```
Work only inside /demo (plus reading, not editing, the rest of the repo).

1. Help me write a demo/DEMO_SCRIPT.md: a tight ~2 minute spoken script for a live demo -
   what to say while uploading a genuine clip (expect green/low score), then a cloned/TTS clip
   (expect red/high score), then show the Audit Trail panel and point out the tamper-evident hash
   chain. End with one sentence bridging to the roadmap slide.
2. List, in demo/DEMO_SCRIPT.md, exactly which sample files from ml/data/ to use for each moment,
   and why they were chosen (clean, clearly differentiable results).
3. Write demo/RECORDING_CHECKLIST.md: steps to screen-record a full backup run of the app (tool-
   agnostic, e.g. OBS or built-in OS screen recorder) covering the same flow as the live script,
   in case the live demo fails on stage. Include: close unnecessary apps, mute notifications, use
   a wired connection if possible, record at 1080p, keep the clip under 90 seconds.
```

**Expected output:** `demo/DEMO_SCRIPT.md`, `demo/RECORDING_CHECKLIST.md`. Then actually record the backup video yourself using the checklist (not something the agent can do for you). **When done:** update PROGRESS.md.

---

## STEP 10 — PPT content + Q&A prep
**Owner:** Person A · **Model:** Claude Sonnet (or Opus if available) — this is the step most worth spending premium-model quota on, since narrative and anticipated-question quality directly affects judging

```
Using docs/PPT_OUTLINE.md, docs/PRD.md, docs/TRD.md, and docs/PLAN.md as source material, write
the full text content for each of the 10 slides in docs/PPT_OUTLINE.md (title, bullet points, and
one-sentence speaker note per slide) as a single docs/PPT_CONTENT.md file, ready to paste into the
official SIH PPT template. Keep bullets short (judges skim, they don't read paragraphs) and make
sure slide 6 (feasibility) and slide 8 (research/references) sound technically grounded, not
hand-wavy - reference the actual datasets and model choices from TRD.md.

Then write docs/QA_PREP.md: a list of 12-15 likely judge questions for this exact problem
statement and solution, each with a 2-3 sentence model answer. Include the hard ones:
"how does this generalize to voice-cloning tools it wasn't trained on?", "why blockchain instead
of a normal database for the audit log?", "how would this actually integrate with a bank's call
center in production?", "what about privacy/consent for voiceprint data under India's DPDP Act?",
"what's your model's false positive rate and why does that matter for a fraud-blocking system?".
Answer these honestly, acknowledging current PoC limitations where relevant - judges respect
honest scoping over overclaiming.
```

**Expected output:** `docs/PPT_CONTENT.md`, `docs/QA_PREP.md`. Then manually build the actual PPT file in the official SIH template using this content, rehearse it out loud with your teammate.
