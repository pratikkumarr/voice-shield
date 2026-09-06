import sys
import os
import uuid
import shutil
import tempfile
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Add the parent directory to sys.path so we can import from ml
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from ml.risk_scoring import analyze
from backend.alerts import recommended_action

app = FastAPI(title="Voice-Shield Backend")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    # Save to a temporary path
    ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(temp_fd)

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Call ml/risk_scoring.py analyze
        result = analyze(temp_path)

        # Ensure audit_hash and timestamp are present to match TRD.md contract
        if "audit_hash" not in result:
            result["audit_hash"] = uuid.uuid4().hex[:12]
        if "timestamp" not in result:
            result["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            
        result["recommended_action"] = recommended_action(result.get("risk_score", 0))

        return result
    finally:
        # Don't persist raw audio
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.websocket("/stream")
async def stream_audio(websocket: WebSocket):
    await websocket.accept()
    chunk_index = 0
    try:
        while True:
            # Receive binary data
            data = await websocket.receive_bytes()
            
            # Write to a temporary file
            temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
            os.close(temp_fd)
            
            try:
                with open(temp_path, "wb") as f:
                    f.write(data)
                
                # Analyze
                try:
                    result = analyze(temp_path)
                except Exception as e:
                    # Fallback result if analysis fails on a chunk
                    result = {
                        "risk_score": 0,
                        "verdict": "ERROR",
                        "confidence": 0.0,
                        "flags": [f"Analysis failed: {str(e)}"],
                        "latency_ms": 0
                    }
                    
                # Add required fields
                if "audit_hash" not in result:
                    result["audit_hash"] = uuid.uuid4().hex[:12]
                if "timestamp" not in result:
                    result["timestamp"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                    
                result["recommended_action"] = recommended_action(result.get("risk_score", 0))
                result["chunk_index"] = chunk_index
                
                chunk_index += 1
                
                # Send back the JSON response
                await websocket.send_json(result)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
    except WebSocketDisconnect:
        # Cleanly handle client disconnect
        pass
