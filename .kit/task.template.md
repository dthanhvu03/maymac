# [TASK-<id>] <short title>

<!-- Copy this to .kit/tasks/<id>.md before starting non-trivial work.
     Prepare it FIRST (scope + acceptance + impact), then build. Keep Status current. -->

- **Status:** todo · in-progress · in-review · done   <!-- one -->
- **Owner:** <who>
- **Branch:** feature/<slug>   ·   **PR:** <link once opened>
- **Mode:** vibe · standard · strict

## Gate status
<!-- One glance = where this task stands. Tick as each gate passes; a gate that failed
     or was skipped BLOCKS shipping — say which and why. Mark n/a when a gate doesn't apply. -->
- [ ] **Challenge** (pre-build critique) — <verdict: go / adjust / stop>
- [ ] **Impact map** done (required if it touches shared data/behaviour)
- [ ] **Review** (correctness + consistency)
- [ ] **Tests** pass (evidence — what ran → result)
- [ ] **Required artifacts** present (schema → migration + rollback; money/auth/PII → walkthrough + 2nd review)
- [ ] **Approval** (schema / prod / data) — or n/a

## Scope
- **In:** <what this task delivers — one or two lines>
- **Out:** <what is explicitly NOT in this task, so it doesn't grow>

## Acceptance criteria (definition of done)
<!-- How we know it's finished. Concrete + checkable. From /discover. -->
- [ ] <criterion 1>
- [ ] <criterion 2>

## Impact map (what it touches)
<!-- Run the impact-map skill. List the files/functions this reads & writes,
     the callers/jobs/events/triggers, and the tests affected — so nothing breaks silently. -->
- Reads/writes: <files · tables · endpoints>
- Callers / jobs / events: <who depends on this>
- Tests affected: <which>

## Plan (smallest slices, in order)
<!-- planner: each slice builds & passes on its own; one commit per slice. -->
1. <slice> → test → commit
2. <slice> → test → commit

## Tests to add / run
<!-- test-design: what proves each acceptance criterion. -->
- <test name / command>

## Risks & rollback
- <risk> — rollback: <how to undo safely>

## Decisions
<!-- Non-trivial choices; also append the durable ones to .kit/decisions.md. -->
- <decision + why>
