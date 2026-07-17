---
id: handoff
title: Package the work for the owner to review and approve
description: Assemble a plain-language "human-control package" for a delivered piece of work — what was built, proof it works, what it touched and how to undo it, and what the owner must approve — so a non-technical owner can review, sign off, and stay in control. Runs at the end of /ship or on its own.
argument-hint: "[task id]"
---

# /handoff

Turn a finished (or nearly finished) piece of work into a **human-control package** the owner can actually read — the point where the AI hands control back to the person. **Synthesise what the pipeline already produced; do not re-run the work**, and do not invent results.

1. Locate the task (`.kit/tasks/<id>.md`) and the change (branch / PR / diff). If there is no task, reconstruct scope + acceptance from the conversation.
2. Create `.kit/tasks/<id>-handoff.md` from `.kit/handoff.template.md` and fill each section from **real evidence, not claims**:
   - **What was delivered** — plain language, what the owner can now see or do (no jargon).
   - **Acceptance** — copy the criteria; tick only what is actually met, with the proof.
   - **Impact & rollback** — from the **impact-map**: what changed, who depends on it, and the exact steps to undo it safely.
   - **Evidence** — the tests that ran and their result, the reviewer's verdict, and each gate's status (the evidence gate: "done" is shown, not asserted).
   - **Release** — from **release-check**: migration note, backups, go / no-go.
   - **Decision needed** — what the owner must approve (schema / prod / data), or "none."
   - **Summary** — one paragraph they can forward, with links to the PR, the task, and the Decision Log.
3. If anything is unmet or unproven, **say so plainly at the top** — a handoff that hides a red gate is worse than none.
4. Scale to the mode: `vibe` = a short walkthrough + what to check + how to undo; `standard` / `strict` = the full package; `strict` may also split the evidence into separate files under `.kit/tasks/<id>/` for an auditable trail.

Commit the package with the work, so the owner (or a teammate, or the next session) has a durable record of what was delivered and why it was safe to ship.
