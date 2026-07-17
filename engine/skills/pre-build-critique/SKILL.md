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
2. Challenge it through **every** lens below. For each, write a finding with its *why* and the *consequence if ignored* (or "n/a — why") — not a bare "looks fine". For real depth (options, second-order effects, steelman) lean on the **senior-reasoning** skill:
   - **Correctness / regression** — what could break? which edge cases and existing tests are in scope?
   - **Security & data** — new attack surface, secrets/PII, destructive or irreversible data ops? (never skip this one)
   - **Consistency** — does it add a second way to do something, or contradict the Decision Log / an invariant?
   - **Simplicity / necessity** — is this the smallest slice that works, or is it scope creep the user didn't ask for?
   - **Reversibility** — can it be undone? migration/rollback risk? Is this a **one-way door** (hard/expensive to reverse — decide deliberately) or a **two-way door** (cheap to undo — decide fast)?
   - **Pre-mortem** — imagine it's shipped and, months later, it *failed or caused an incident*. Write the single most likely reason. If that reason is preventable now, fold the fix into the plan before building.
3. Decide a verdict: **go** (build the slice), **adjust** (change scope/approach first), or **stop** (needs a decision — hand back to the founder / analyst).
4. **Record the gate token** so the build gate opens: write `.kit/state/gate.json` with your verdict. Writing it IS the act of passing the gate — an empty or absent `decision` does not count.

## Output format (required)
```md
## Change (one sentence)
## Lenses
| Lens | Finding — *why it matters* + the consequence if ignored | Risk |
|---|---|---|
| Correctness | … | low/med/high |
| Security & data | … | low/med/high |
| Consistency | … | low/med/high |
| Simplicity | … | low/med/high |
| Reversibility (one-way / two-way door) | … | low/med/high |
| Pre-mortem (most likely failure) | … | low/med/high |
## Steelman (strongest case against building this) → response
## Verdict (go / adjust / stop) + why
## Gate token written
```
Then write `.kit/state/gate.json`, for example:
```json
{ "task": "login-rate-limit", "decision": "go", "highRisk": ["security & data"], "note": "cap at 5/min, reversible config" }
```
Set `task` to the **active task id** (the one in `.kit/state/current-task`); the gate is **per-task** — a token recorded for one task does not open the gate for a different one, so each new task is critiqued on its own. In `standard`/`strict` mode a Claude hook blocks the first code write for the task until this token exists; in `vibe` it only reminds. An empty **Verdict** fails the evidence gate.
