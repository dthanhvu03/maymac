---
name: cross-review
description: Use when a change is non-trivial or contested and needs more than one role's judgment before committing. Invoke to run a bounded roundtable — propose, challenge, revise across the relevant roles until it meets the agreed criteria or is escalated. Not for a solo quick fix (just build it).
license: Apache-2.0
compatibility: Requires repository read access.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Cross-review (bounded roundtable) skill

Get the relevant roles to hash out a non-trivial change *to agreement* — without turning the session into an endless debate that bloats context. Discipline is the point: bounded rounds, concise conclusions, converge or escalate.

## Workflow
1. **Set the bar first.** Write the acceptance criteria — what "good" means for this change — from the decision brief, the plan, and any invariant. No criteria → stop and define them; do not hold a roundtable without a target.
2. **Run a round (bounded).** Each relevant role contributes **one concise conclusion** (not a transcript), each in its own lane:
   - architect — the structural proposal and the trade-off;
   - reviewer — the risks, and any inconsistency with the Decision Log;
   - qa — how it will be verified (the test that proves it);
   - planner — whether scope still matches the smallest useful slice.
3. **Converge or escalate.** After each round, check against the criteria. If met → record the agreed decision and stop. If a genuine disagreement remains, keep going **only up to the cap** — `vibe`: skip the roundtable (one pass); `standard`: ≤2 rounds; `strict`: ≤3 rounds. At the cap, do NOT loop again — the orchestrator decides, or escalates to the founder in plain language.
4. **Record** the converged decision (and any risks accepted / open items) in the Decision Log so it binds future sessions.

## Output format (required)
```md
## Acceptance criteria
## Round log (one line per role per round)
| Round | Role | Conclusion |
|---|---|---|
## Converged decision — or Escalation (what the founder must decide)
## Open items / risks accepted
```
An empty **Acceptance criteria** or a round count over the mode's cap fails this skill's intent. Converge and record, or escalate — never loop forever.
