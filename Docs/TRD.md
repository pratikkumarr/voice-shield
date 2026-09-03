# TRD.md — SentinelVoice (SIH26104) Technical Design

## 1. Architecture (text diagram)

```
[Browser / Demo UI]  (React)
        |  upload / record clip, or chunked stream
        v
[FastAPI Backend]  (/backend)
        |-- /analyze         -> calls ML service, returns risk JSON
        |-- /stream (WS)     -> chunked near-real-time simulation
        |-- /audit/log       -> writes hashed result to ledger
        |-- /audit/history   -> reads audit trail for UI
        v
[ML Inference Service]  (/ml)
        |-- feature_extraction.py   (spectral, MFCC, prosody)
        |-- classifier.py           (pretrained anti-spoofing model, fine-tuned/wrapped)
        |-- risk_scoring.py         (combine signals -> 0-100 score + verdict)
        v
[Blockchain Audit Module]  (/blockchain)
        |-- hash_chain.py   (local tamper-evident hash-chain, always works offline)
        |-- testnet_anchor.py (optional: anchor a batch hash to a public testnet, e.g. Polygon Amoy)
```

Everything runs locally via **Docker Compose** for the demo. No dependency on live internet during the pitch (the testnet anchor is a nice-to-have you can show as a screenshot/pre-recorded call if the venue WiFi is unreliable — don't depend on it live).

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| ML / feature extraction | Python, `librosa`, `torchaudio` | Standard, fast to prototype, well-documented |
| Classifier | Pretrained anti-spoofing model (e.g. AASIST / RawNet2, or a `wav2vec2`-based spoof classifier from Hugging Face) fine-tuned/lightly-adapted if time allows; otherwise used zero-shot | Don't train from scratch in 5 days — adapt a pretrained model |
| Backend | FastAPI (Python) | Fast to build, same language as ML code, easy WebSocket support |
| Frontend | React + Tailwind (or plain HTML/JS if time-constrained) | Fast to build a clean dashboard |
| Blockchain | Local hash-chain (Python, SHA-256 linked entries) as the reliable core; optional testnet anchoring (web3.py + a public testnet) as a bonus | Guarantees the demo works with zero external dependency risk |
| Orchestration | Docker Compose | One command to run everything for judges/testers |
| Repo hosting | GitHub | Team collaboration, see GIT_WORKFLOW.md |

## 3. Repo structure (own this exactly — it's what prevents merge conflicts)

```
sentinelvoice/
├── docs/                 (this file, PRD, PLAN, PROGRESS, prompts, PPT outline)
├── ml/                   (Person A owns)
│   ├── data/
│   ├── feature_extraction.py
│   ├── classifier.py
│   ├── risk_scoring.py
│   └── requirements.txt
├── backend/               (Person B, then Person A for integration)
│   ├── main.py
│   ├── routes/
│   └── requirements.txt
├── frontend/              (Person B owns)
│   ├── src/
│   └── package.json
├── blockchain/             (Person B owns)
│   ├── hash_chain.py
│   └── testnet_anchor.py
├── demo/                  (Person A owns — sample clips, demo script, backup video)
├── docker-compose.yml
├── README.md
└── PROGRESS.md
```

## 4. API contract (backend ↔ frontend, and backend ↔ ML)

**POST `/analyze`**
```json
// request: multipart/form-data with an audio file
// response:
{
  "risk_score": 78,
  "verdict": "LIKELY CLONED",
  "confidence": 0.83,
  "flags": ["spectral phase inconsistency", "unnatural pitch micro-variation"],
  "latency_ms": 1240,
  "audit_hash": "9f3a...e21",
  "timestamp": "2026-09-05T10:12:00Z"
}
```

**WS `/stream`** — client sends ~1 sec audio chunks; server returns incremental risk updates using the same JSON shape, so the frontend can animate a live-updating score.

**GET `/audit/history`** — returns the list of ledger entries (hash, prev_hash, timestamp, risk_score) for the "Audit Trail" panel — this is what visually proves the blockchain component during the demo.

## 5. Data — where to get real vs. cloned voice samples

- **ASVspoof5** (standard academic benchmark for spoof/deepfake speech detection) — good source for pretrained-model compatibility and a quick labeled test set.
- **"In the Wild" deepfake audio dataset** — real-world cloned celebrity/political speech, useful for a more convincing demo narrative.
- **Fake-or-Real (FoR) dataset** — another common benchmark.
- **Your own quick synthetic set**: generate a handful of clips with any accessible TTS/voice-cloning tool (ElevenLabs free tier, Coqui TTS, etc.) using your own or a teammate's voice (with consent) paired with the same person's real recording — this makes for a *very* compelling live "hey, watch it catch OUR cloned voice" demo moment.
- Keep the demo set small and curated (15–20 clips) — quality and reliability over volume.

## 6. Non-functional requirements
- **Latency**: <3s per clip end-to-end (feature extraction + inference + scoring + ledger write).
- **Privacy**: raw audio is not persisted after analysis in the demo build; only the derived feature hash goes into the audit ledger. State this as a deliberate design choice.
- **Reliability**: the local hash-chain must work fully offline — never make the live demo depend on external network calls.

## 7. Open technical risks to flag honestly in Q&A
- Pretrained spoof-detection models can overfit to the specific TTS engines they were trained against — generalization to *novel* cloning tools is an active research problem, not solved by this PoC. Say so if asked; it shows depth, not weakness.
- Prosody analysis in the MVP is closer to a heuristic/statistical signal than a fully trained model — be upfront that this is v1 sophistication, with a trained model as roadmap.
