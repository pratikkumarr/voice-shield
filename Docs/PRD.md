# PRD.md — SentinelVoice (SIH26104)

## 1. Problem (from the official problem statement)
High-fidelity voice cloning from seconds of audio is being used to impersonate CXOs, officials, and trusted individuals to commit financial fraud and social engineering, over VoIP/mobile/collaboration platforms. No real-time, granular, actionable detection layer exists today.

## 2. Users / personas
- **Bank/enterprise call-center agent** — receives a call requesting a fund transfer or sensitive action; needs an in-call risk signal before approving.
- **Individual employee/executive** — target of impersonation calls (fake CFO/CEO); needs a quick way to check a suspicious recording.
- **Security/compliance officer** — needs an auditable, tamper-evident log of flagged incidents.
- **(Judges, for the demo)** — needs to *see* the above in under 3 minutes.

## 3. MVP scope (institutional round — build THIS)

**In scope:**
1. Upload or record a voice clip (WAV/MP3, 3–15 sec).
2. Chunked/near-real-time analysis (process in ~1–2 sec windows to simulate live-call feel).
3. Multi-signal risk score (0–100) combining:
   - Spectral/acoustic synthesis-artifact detection (primary signal — this is what the model actually does).
   - Prosody irregularity signal (rule-based/statistical, secondary signal — doesn't need to be a full trained model for the demo).
4. Verdict + recommended action: `LIKELY GENUINE` / `SUSPICIOUS — VERIFY` / `LIKELY CLONED — BLOCK`, with a suggested action (e.g. "recommend callback verification").
5. Dashboard UI showing the score, waveform, and flagged reasons (e.g. "unnatural pitch micro-variation", "spectral phase inconsistency").
6. **Blockchain audit log**: every analysis result is hashed and anchored to an append-only, tamper-evident ledger (local hash-chain or public testnet — see TRD), viewable in a simple "Audit Trail" panel.
7. A short demo script + backup video.

**Explicitly out of scope for the institutional round** (state this openly in the PPT as roadmap, don't hide it):
- Real telephony/VoIP integration.
- True multilingual/accent-robust models (demo in English + best-effort Hindi if time allows).
- On-device/edge inference (design-level claim only).
- Production-grade auth, banking-system SDKs, gRPC APIs.
- Cross-session speaker enrollment/consistency checks.

## 4. Success metrics for the demo
- Correctly classifies ≥80% of a curated 15–20 clip test set (mix of real speech + AI-cloned/TTS speech) — pick clean, clearly-differentiable samples for the live demo; keep the harder ones for Q&A if asked "does it always work?".
- End-to-end analysis latency **under 3 seconds** per clip on stage (judges notice slow demos).
- Zero crashes during the 3-minute live segment (this is why the backup video exists).

## 5. Differentiators to emphasize in the pitch
- **Multi-layer detection** (acoustic + prosody), not a single black-box score — matches the problem statement's explicit ask for "granular analysis," which most naive entries won't do.
- **Blockchain-anchored audit trail** — directly addresses the "Blockchain & Cybersecurity" theme; gives banks/regulators non-repudiable evidence for fraud investigations.
- **Privacy-by-design narrative**: no raw audio retained beyond the session; only derived features/hashes are logged (state this even if the PoC is simplified — it's a real, defensible design decision).
- **India-specific framing**: explicitly targets Indian bank fraud + government impersonation scenarios, with a roadmap to Indian-language coverage — this is what a national ministry-sponsored problem statement wants to hear.

## 6. Risks
- **Model accuracy on unseen clips**: cloned-voice detectors overfit easily to their training TTS engine. Mitigation: pick demo clips from a *different* TTS source than what the model saw in training, and be honest about this limitation if asked.
- **Live demo failure**: mitigated by backup video (see PLAN.md Day 5).
- **Scope creep**: mitigated by the explicit in/out-of-scope list above — do not let either teammate add features not in this list during the 5-day window.
