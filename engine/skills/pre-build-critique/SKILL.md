---
name: pre-build-critique
description: Use BEFORE writing or editing code for a new or non-trivial change. Invoke to challenge the change through fixed lenses — correctness, security & data, consistency, simplicity, reversibility — and record a go/adjust/stop verdict before building.
license: Apache-2.0
compatibility: Requires repository read access and git.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Pre-build Critique skill

Challenge a change *before* it is built — this is the checkpoint that stops the agent from coding on inertia as context grows. Be concrete; a vague "looks fine" does not pass.

## Workflow
1. State the change in one plain sentence: what will you build, and for which task.
2. Challenge it through **every** lens below. For each, write a one-line finding (or "n/a — why"):
   - **Correctness / regression** — what could break? which edge cases and existing tests are in scope?
   - **Security & data** — new attack surface, secrets/PII, destructive or irreversible data ops? (never skip this one)
   - **Consistency** — does it add a second way to do something, or contradict the Decision Log / an invariant?
   - **Simplicity / necessity** — is this the smallest slice that works, or is it scope creep the user didn't ask for?
   - **Reversibility** — can it be undone? migration/rollback risk?
3. Decide a verdict: **go** (build the slice), **adjust** (change scope/approach first), or **stop** (needs a decision — hand back to the founder / analyst).
4. **Record the gate token** so the build gate opens: write `.kit/state/gate.json` with your verdict. Writing it IS the act of passing the gate — an empty or absent `decision` does not count.

## Output format (required)
```md
## Change (one sentence)
## Lenses
| Lens | Finding | Risk |
|---|---|---|
| Correctness | … | low/med/high |
| Security & data | … | low/med/high |
| Consistency | … | low/med/high |
| Simplicity | … | low/med/high |
| Reversibility | … | low/med/high |
## Verdict (go / adjust / stop) + why
## Gate token written
```
Then write `.kit/state/gate.json`, for example:
```json
{ "task": "add login rate-limit", "decision": "go", "highRisk": ["security & data"], "note": "cap at 5/min, reversible config" }
```
In `standard`/`strict` mode a Claude hook blocks the first code write of the session until this token exists; in `vibe` it only reminds. An empty **Verdict** fails the evidence gate.
