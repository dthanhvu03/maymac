---
id: critique-gate
scope: paths
enforce: hook+agent-read
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
  - "components/**"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.php"
title: Pre-build critique gate (challenge before you build)
---

# Before writing code for a new task, challenge it first

Do not jump straight to code on inertia — especially as the session grows. Stress-test the change through these lenses first:

- **Correctness / regression** — what could break; which edge cases and existing tests are in scope?
- **Security & data** — new attack surface, secrets/PII, destructive or irreversible data ops? (never skip)
- **Consistency** — does it add a second way to do something, or contradict the Decision Log / an invariant?
- **Simplicity / necessity** — is this the smallest slice that works, or scope creep?
- **Reversibility** — can it be undone; migration/rollback risk?

Decide a verdict (**go / adjust / stop**) and record it to `.kit/state/gate.json`. In `standard`/`strict` a hook (`critique-gate.mjs`) blocks the first code write of the session until this is done; in `vibe` it only reminds. Run `/challenge` (the pre-build-critique skill) to do this in one step. Docs, `.kit/`, and config edits are never gated.
