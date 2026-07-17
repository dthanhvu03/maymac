---
id: challenge
title: Challenge a change before building it
description: Run the pre-build critique — stress-test the planned change through fixed lenses and record a go/adjust/stop verdict before any code is written.
argument-hint: "[what you're about to build]"
---

# /challenge

Do this before writing code for a new or non-trivial change. It is the checkpoint that stops coding on inertia — especially once the session's context has grown.

1. State the change in one plain sentence (from the argument or by asking).
2. Run the **pre-build-critique** skill: challenge it through every lens — correctness, security & data, consistency, simplicity/necessity, reversibility (one-way vs two-way door), and a **pre-mortem** (imagine it failed months later — the single most likely reason) — with a concrete one-line finding each.
3. Decide a verdict: **go** (build the smallest slice), **adjust** (fix scope/approach first), or **stop** (hand back to the founder / analyst for a decision).
4. Record the gate token: write `.kit/state/gate.json` with your verdict (a non-empty `decision`) and the active task id in `task` (from `.kit/state/current-task`, if you use `/task`). The gate is **per-task** — a new task needs its own critique. In `standard`/`strict`, a hook blocks the first code write for the task until this exists; in `vibe` it only reminds.
5. If the verdict is **go**, proceed to build (`/start`). If **adjust/stop**, say so plainly and don't start coding.
