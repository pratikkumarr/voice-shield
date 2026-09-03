# GIT_WORKFLOW.md — SentinelVoice

## Golden rule
**Each folder has one owner at a time.** Nobody edits another person's active folder without a heads-up in `PROGRESS.md`. This is what stops "who broke my code" merge chaos with only two people juggling ten steps in five days.

| Folder | Owner during Days 1–4 | Notes |
|---|---|---|
| `/ml` | Person A (Steps 1–3) | Person B never edits this directly — if backend needs an interface change, Person B edits `/backend` to adapt, or leaves a request in PROGRESS.md |
| `/backend` | Person B (Step 4), then shared during Step 8 integration | |
| `/frontend` | Person B (Step 6) | |
| `/blockchain` | Person B (Step 7) | |
| `/docs` | Whoever is active — low collision risk, plain text | |
| `/demo` | Person A (Step 9) | |
| root files (`docker-compose.yml`, top-level `README.md`) | **Only touched during Step 8 integration**, by Person A, after both halves exist | Don't let early steps fight over these |

## Branching
- `main` — always the last known-working state. Don't push broken code directly to `main` after Day 2.
- Feature branches: `feature/<folder>-<short-name>`, e.g. `feature/ml-classifier`, `feature/frontend-dashboard`.
- Open a PR into `main` when a step is done; the other person does a 2-minute skim (not a full review — you don't have time) before merging.
- **Merge order matters**: merge `/ml` before `/backend` needs it, merge `/blockchain` and `/frontend` before Step 8 integration starts.

## Commit messages
Prefix with the step number so `git log` doubles as a progress trail:
```
[Step 3] Add baseline spoof classifier wrapper
[Step 6] Frontend risk dashboard skeleton
```

## PROGRESS.md protocol (this is your context-handoff file)
- **Never rewrite previous entries.** Always append a new dated section.
- Every time you finish a step (or stop for the day), add:
  ```
  ## [Step N] <name> — <date> — <your name>
  **Status:** done / blocked / in progress
  **What I built:** 1-2 lines
  **Files touched:** list
  **What the next person needs to know:** interface contracts, gotchas, TODOs
  **Blockers:** anything you couldn't resolve
  ```
- Before starting your next step, **read the whole file**, not just the last entry — context can be a few entries back.

## When something breaks after a merge
1. Don't debug in a panic on `main`. Checkout a fix branch.
2. Check `PROGRESS.md` for the interface contract the other person documented — 90% of "it broke" is an interface mismatch (e.g. JSON key renamed), not a deep bug.
3. If genuinely stuck for >20 min, that's when you escalate the model choice (see PROMPTS.md) rather than burning demo-prep time.
