# PLAN.md — SentinelVoice (SIH26104)
**AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks**
AICTE · Blockchain & Cybersecurity · Software

> Working title for the project: **SentinelVoice** (change it if you want — just keep it consistent across docs/repo/PPT).

---

## 0. Reality check — yes, this is done in phases

There are two very different deadlines and you should not conflate them:

| Phase | What it is | Deadline | What actually gets judged |
|---|---|---|---|
| **Phase A — Institutional round** | Your college's internal SIH shortlisting | **8 Sept 2026** (5 days from now) | PPT (idea, feasibility, tech depth) + a *demo-able* prototype. Judges are your own faculty — they care about clarity, feasibility, and whether you clearly understand the problem more than production polish. |
| **Phase B — National portal submission** | SPOC uploads your idea PPT + video after internal win | ~30 Sept 2026 (per SIH's published portal deadline — confirm with your SPOC) | Same PPT, refined, + a demo video |
| **Phase C — Grand Finale build** | 36-hour national hackathon | Later in the year (date TBA, usually Nov–Jan) | A working, more complete build |

**This plan only takes you seriously through Phase A**, because that's your immediate bottleneck, with a lighter roadmap for B/C so you're not starting from zero later. Don't over-invest in Phase C features (telecom integration, production blockchain, multilingual coverage) before Phase A — you have 5 days.

---

## 1. Scope decision for the institutional round (read this before coding)

You cannot build "real-time telephony-integrated multilingual voice authenticity infrastructure" in 5 days, and you shouldn't try. What wins the institutional round is:

1. A **working PoC**: upload/record a voice clip → the system tells you if it's likely cloned/synthetic → gives a risk score → shows a recommended action (this is 100% demo-able and directly maps to every bullet in the problem statement).
2. A **believable "real-time" simulation**: chunked/streaming analysis of a clip (even if it's not literally live telephony) so it *looks and feels* real-time on stage.
3. A **clear architecture story** for how the PoC becomes the full production system (telephony/VoIP hooks, bank/enterprise SDKs, multilingual models) — this lives in your PPT and TRD, not in code you have to ship in 5 days.
4. A **blockchain-tied component**, however small (a hash-anchored, tamper-evident audit log of verification events) — this is what makes you actually match the "Blockchain & Cybersecurity" theme instead of being a pure ML project that happens to be entered under it. Judges will ask "where's the blockchain?" — have an answer that exists in code, not just slides.

Everything else (real telecom integration, edge inference, full Indian-language coverage, production security hardening) → **Roadmap**, clearly labelled as such in the PPT. Judges respect a team that scopes honestly far more than one that overclaims.

---

## 2. Timeline — 5 days to 8 Sept

Assumes today is **3 Sept**. Adjust dates if your actual internal round differs from the 8th.

### Day 1 — Wed 3 Sept (today): Lock scope + scaffold
- Finalize architecture (TRD.md) and MVP feature list (PRD.md) — **do this before writing code**.
- Set up GitHub repo with the folder structure in `GIT_WORKFLOW.md`.
- Person A starts **Steps 1–3** (ML: dataset + feature extraction + baseline classifier).
- Person B preps their environment, reads PRD/TRD, ready to start Step 4 as soon as Person A's Step 1 lands.
- Source 20–30 sample clips: real speech + AI-cloned/TTS speech (see TRD §5 for where).

### Day 2 — Thu 4 Sept: ML pipeline + backend skeleton
- Person A finishes Steps 1–3, pushes, updates `PROGRESS.md`.
- Person B starts **Step 4** (FastAPI backend wrapping the model) once the model interface exists — Person A should expose a stub interface early on Day 1 so Person B isn't blocked (see PROMPTS.md Step 1 output contract).

### Day 3 — Fri 5 Sept: Risk engine + frontend + blockchain module
- Person B works **Steps 5–7**: risk scoring/alerting, frontend dashboard, blockchain audit-log module.
- Person A reviews/tests the ML pipeline against more samples, tightens accuracy, starts drafting demo script.

### Day 4 — Sat 6 Sept: Integration day (critical)
- Person A takes over: **Step 8** — wire frontend + backend + ML + blockchain together, Docker Compose, end-to-end test.
- **Buffer this day heavily.** Integration always takes longer than expected. If something's broken by evening, cut scope (e.g., drop live blockchain testnet call, fall back to local hash-chain) rather than debugging all night.

### Day 5 — Sun 7 Sept: Demo hardening + PPT
- Morning: **Step 9** — curate 5–8 clean demo clips, record a **backup demo video** (screen recording of the working flow). This is non-negotiable: live demos fail in front of judges more often than not (WiFi, mic permissions, projector audio). A backup video is your insurance.
- Afternoon/evening: **Step 10** — build the PPT using the official SIH template (see `PPT_OUTLINE.md`), write speaker notes, prep for Q&A (`PROMPTS.md` Step 10 includes a Q&A prep prompt).
- Rehearse the full pitch out loud, twice, with a timer.

### Day 6 — Mon 8 Sept: Presentation day
- Arrive early, test AV setup, have the backup video loaded and ready as a fallback tab/file.
- Present PPT → live demo (or fallback video) → Q&A.

---

## 3. Roadmap beyond 8 Sept (only if you clear the institutional round)

Don't build these now — just know they exist so the PPT's "Future Scope" slide is credible and specific:

- **Multilingual/accent coverage**: fine-tune or fine-select models for Hindi + 2–3 major Indian languages using IndicTTS / Common Voice data.
- **True real-time streaming**: replace chunked-upload simulation with actual WebRTC/VoIP stream ingestion.
- **Edge/on-device inference** for the privacy-preserving claim in the problem statement (currently just a design claim in your PoC).
- **Bank/enterprise SDK + REST/gRPC APIs** as named in the problem statement's "Platform and Integration APIs" component.
- **Cross-session speaker-consistency checks** against enrolled voiceprints (needs a proper consent/privacy design — flag this explicitly, judges at later rounds will ask about DPDP Act compliance).
- **Production blockchain deployment** (a real permissioned chain, not a demo hash-chain).

---

## 4. Definition of done for Phase A

You're ready for 8 Sept when:
- [ ] A user can upload or record a clip and get a risk score + verdict in the running app.
- [ ] The blockchain audit-log module writes at least one real, verifiable entry per analysis.
- [ ] You have a recorded backup video of the full flow.
- [ ] PPT follows the official SIH format, has a clear problem→solution→feasibility→impact→roadmap arc.
- [ ] Both team members can each explain every slide and every architectural decision — judges will split questions across the team.
