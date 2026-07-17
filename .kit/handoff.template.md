# Handoff — [TASK-<id>] <title>

<!-- The human-control package: what an owner reads to review, approve, and stay in
     control of what was built. Generated at the end of /ship (or via /handoff) by
     synthesising what the pipeline already produced. Plain language first, no jargon.
     Scale to the mode — a small change keeps this short. -->

- **Status:** ready for review · approved · shipped   <!-- one -->
- **Mode:** vibe · standard · strict
- **Branch / PR:** feature/<slug> · <PR link>
- **Task:** .kit/tasks/<id>.md

## 1. What was delivered  (plain language)
<!-- Explain to a non-technical owner what now works and how to see it for themselves. -->

## 2. Is it done?  (acceptance criteria)
<!-- Copy the criteria from the task; tick only what is actually met, with the proof. -->
- [ ] <criterion> — <met? evidence>

## 3. What it touched · how to undo  (impact & rollback)
<!-- From the impact-map: files / tables / endpoints changed, and who depends on them.
     Rollback = the exact steps to revert safely. -->
- Touched: <...>
- Rollback: <...>

## 4. Proof it works  (evidence)
<!-- The evidence gate: "done" is shown, not asserted. -->
- Tests: <what ran> → <pass / fail>
- Review: <reviewer verdict>
- Gates: challenge <verdict> · consistency <ok?> · <others>

## 5. Before it goes live  (release)
<!-- From release-check. -->
- Migration: <none | note>
- Backup / rollback ready: <yes / no>
- Go / no-go: <...>

## 6. Your decision needed
<!-- What the OWNER must approve before it is live: schema change, prod deploy, data delete. -->
- [ ] <approval needed — or "none, self-approve">

## 7. Summary
<!-- One paragraph the owner can forward. Links: PR, task file, .kit/decisions.md. -->
