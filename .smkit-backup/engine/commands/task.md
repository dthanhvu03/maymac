---
id: task
title: Open and prepare a work task
description: Before building anything non-trivial, open a task record — scope, acceptance criteria, impact map, plan, and tests — so the work is prepared, traceable, and resumable next session. Use inside /ship or on its own.
argument-hint: "[task id] [short title]"
---

# /task

Open a **task record** and prepare it *before* touching code. This is how "each piece of work" gets a scope, a definition of done, and a map of what it touches — so nothing is built blind, and the work is resumable next session. Scale the ceremony to the mode; a trivial one-line fix does not need a task file.

1. **Create the file.** Copy `.kit/task.template.md` to `.kit/tasks/<id>.md`. Use your tracker's id if you have one (Jira / GitHub issue) so the PR title `[TASK-<id>]` links back; otherwise a short slug (`login-rate-limit`). Mark it the **active task** — write the id to `.kit/state/current-task` — so the critique gate scopes to *this* task: switching tasks re-opens the gate instead of coasting on the previous task's critique.
2. **Scope.** Fill **In** / **Out** — what this task delivers and what it explicitly does not (so it doesn't quietly grow). This is the output of `/discover`.
3. **Acceptance criteria.** Write the concrete, checkable conditions that mean "done." Nothing merges until these are met (the evidence gate).
4. **Impact map.** Run the **impact-map** skill and paste the result — the files/tables/endpoints this reads and writes, every caller / job / event that depends on them, and the tests affected. This answers *"which files are in play"* before editing.
5. **Estimate (machine-readable).** Fill the `estimate:` yaml block — `complexity` (S/M/L/XL), `effort_days`, `confidence` (0..1), `risk`, and a real `basis` (the concrete reasons for the size, not a vibe). An **XL** task should be sliced smaller before starting; **low confidence** means say so and cut scope. Treat every number as an estimate, never a promise — like a real IT team quoting work.
6. **Plan + tests.** Break it into the smallest slices (planner), each with the tests that prove it (test-design). One slice ≈ one commit.
7. **Branch + status.** Note the `feature/<slug>` branch (git-workflow), and keep **Status** current (todo → in-progress → in-review → done). Record the PR link once opened. As each gate passes (challenge · impact · review · tests · approval), tick it in the task's **Gate status** — that checklist is the single glance-able source of truth for where the task stands, and a red/skipped gate blocks shipping.
8. **Commit the task file**, then start building. The task file travels with the work — the next session (or teammate) picks it up without re-deriving the plan.

The task location defaults to `.kit/tasks/`; if the team keeps work items elsewhere (a tracker, `docs/tasks/`), record that in `.kit/decisions.md` and use it consistently.
