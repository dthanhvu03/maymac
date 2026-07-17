---
id: start
title: Start or continue a task
description: Begin (or resume) work. Reads the project memory, plans the smallest next step, and builds it per the current mode.
argument-hint: "[what you want to build]"
---

# /start

> Use `/start` for the **smallest next step**. To deliver a **whole feature** A→Z (discovery → build → review → deploy) in one orchestrated run, use `/ship` instead.

1. Read `.kit/constitution.md` and `.kit/decisions.md`. Obey them.
2. If the user gave a request, restate it in one plain sentence and confirm. If not, ask what they want to build.
   - If the idea is **vague or a brand-new feature**, run discovery first (`/discover`, the analyst role): produce a decision brief and confirm the real problem before building. Scale to the mode — `vibe`: a 3–5 sentence brief inline; `standard`/`strict`: the full brief (strict also records sign-off).
3. Plan the **smallest useful next step** (not the whole thing). For a non-trivial piece of work, open a task first (`/task` → `.kit/tasks/<id>.md`) so its scope, impact, and plan are written down and resumable; a one-line fix doesn't need one.
   - Before writing code for a new/non-trivial change, **challenge it first** (`/challenge`, the pre-build-critique skill): correctness · security & data · consistency · simplicity · reversibility → a go/adjust/stop verdict. In `standard`/`strict` a hook blocks the first code write until this is recorded; in `vibe` it only reminds.
4. Build it following the current mode:
   - `vibe`: just do it, reuse existing patterns, talk in plain language.
   - `standard`: short brief → build → self-review → run tests.
   - `strict`: full gate chain; get approver sign-off for schema/prod/data.
5. When a non-trivial decision is made, append it to `.kit/decisions.md`.
6. Finish with a plain-language summary of what changed and ask what's next.
