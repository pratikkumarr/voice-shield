# PPT_OUTLINE.md — SentinelVoice

**Important:** SIH usually mandates an official PPT template (idea/solution format) released on sih.gov.in / by your SPOC. **Download and use the official template if one exists for 2026** — don't build from scratch if a mandated format is provided; judges penalize teams that ignore it. The outline below is the standard SIH content structure to fill into whatever template you're given.

1. **Title slide** — Problem Statement ID (SIH26104), title, theme, team name, team members, institution.
2. **Idea / Proposed Solution** — one crisp paragraph + one diagram. Lead with: "Real-time, multi-layer voice authenticity verification with a tamper-evident blockchain audit trail."
3. **Detailed explanation** — the multi-layer detection approach (acoustic/spectral + prosody + [roadmap: cross-session]), the risk scoring engine, the alert/action layer. Reuse PRD.md §3 and §5.
4. **How is it different from existing solutions** — caller ID/callback/manual familiarity are insufficient today (quote the problem statement's own framing); most existing spoof-detection is offline/research-only, not real-time + actionable + audit-anchored.
5. **Technical approach / architecture diagram** — reuse TRD.md §1 diagram, redrawn cleanly. Name the actual stack.
6. **Feasibility and viability** — what's built (the PoC), what's proven (accuracy on test set + latency numbers), what's realistic near-term (roadmap items from PLAN.md §3), and named risks + mitigations (TRD.md §7). Honesty here builds credibility.
7. **Impact and benefits** — fraud reduction, trust in voice channels, alignment with national cybersecurity objectives — pull directly from the problem statement's "Expected Outcomes" so judges see you answered exactly what was asked.
8. **Research / references** — ASVspoof5, "In the Wild" dataset, relevant papers on synthetic speech detection (AASIST, RawNet2) — shows technical grounding, not vibes.
9. **Live demo slide/section** — screenshots + link to the working app, with the backup video ready.
10. **Future scope / roadmap** — telephony integration, multilingual coverage, edge inference, SDKs, production blockchain — from PLAN.md §3.

**Presentation tips specific to an institutional round judged by faculty:**
- Open by restating the problem in one sentence in your own words — proves comprehension before solution.
- Every team member should be ready to answer questions about *any* slide, not just "their" part.
- Have the working demo already open in a browser tab before you're called up — don't waste stage time booting things.
- If the live demo fails, say "let me show the recorded run" calmly and move on — don't apologize repeatedly or lose composure.
