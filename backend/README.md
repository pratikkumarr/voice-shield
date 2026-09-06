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
  "timestamp": "2026-09-05T10:12:00Z",
  "recommended_action": "Block action, escalate to supervisor, do not proceed with transaction"
}
```

### **WS `/stream`**

Accepts binary audio chunks (approximately 1 second each) over WebSocket and returns near-real-time incremental risk updates.

**Example Response (per chunk)**:

```json
{
  "risk_score": 78,
  "verdict": "LIKELY CLONED",
  "confidence": 0.83,
  "flags": ["spectral phase inconsistency", "unnatural pitch micro-variation"],
  "latency_ms": 250,
  "audit_hash": "a1b2...c3d",
  "timestamp": "2026-09-06T12:00:00Z",
  "recommended_action": "Block action, escalate to supervisor, do not proceed with transaction",
  "chunk_index": 0
}
```

### **Recommended Action Meanings**

The `recommended_action` field returned by both `/analyze` and `/stream` uses the following deterministic rules based on the `risk_score`:

- `score < 30`: "No action needed"
- `30 <= score <= 70`: "Recommend secondary verification (callback on a known number)"
- `score > 70`: "Block action, escalate to supervisor, do not proceed with transaction"

### **GET `/health`**

Returns a simple health check status.

**Response**:

```json
{
  "status": "ok"
}
```
