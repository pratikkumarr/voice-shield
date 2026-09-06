# Voice-Shield Backend

This is the FastAPI backend for the Voice-Shield project.

## Run

To run the development server locally, run the following command from the `backend/` directory:

```bash
uvicorn main:app --reload
```

## API Contract

### **POST `/analyze`**

Accepts a `multipart/form-data` request with an audio file (e.g. `file=@audio.wav`).

**Response**:

```json
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

### **GET `/health`**

Returns a simple health check status.

**Response**:

```json
{
  "status": "ok"
}
```
