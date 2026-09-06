# SentinelVoice — Frontend Dashboard

React + Vite + Tailwind CSS v3 dashboard for the SentinelVoice (SIH26104) voice fraud detection system.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8000` (see `/backend/README.md`)

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at **http://localhost:5173**

## Features

- **Audio upload** — select WAV, MP3, FLAC, OGG, M4A, or WebM files
- **MediaRecorder recording** — in-browser mic recording with live timer
- **POST /analyze** — sends audio to backend, renders real response
- **Risk score display** — large visual with green / amber / red bands:
  - `< 30` → Green (Likely lower risk)
  - `30–70` → Amber (Verification recommended)
  - `> 70` → Red (High risk)
- **Verdict** — exact string from backend, never rewritten
- **Recommended action** — backend is single source of truth
- **Detection flags** — listed or "No specific detection flags reported."
- **Analysis metadata** — confidence, latency, timestamp, audit hash
- **Audit trail** — `GET /audit/history`; shows clean empty state on 404
- **Loading state** — animated spinner, analyze button disabled during inference
- **Error handling** — clean user-facing messages, no raw stack traces

## API endpoints used

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `http://localhost:8000/analyze` | Voice analysis |
| `GET`  | `http://localhost:8000/audit/history` | Audit trail (graceful 404) |

## Tailwind

Using **Tailwind CSS v3**. Config in `tailwind.config.js` targets `./src/**`.
