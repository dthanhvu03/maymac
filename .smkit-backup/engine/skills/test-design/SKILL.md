---
name: test-design
description: Use when a task needs a QA or test gate. Invoke to design test cases and edge cases and to produce the exact commands that prove the behavior works.
license: Apache-2.0
compatibility: Requires repository read access and git.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Test Design skill

Turn a feature into concrete, runnable checks — this is how the evidence gate gets satisfied.

Derive cases from **[references/test-guide.md](references/test-guide.md)** — equivalence
partitioning, boundary value analysis, decision tables, state transitions, pairwise, and
property-based testing — rather than guessing; then add experience-based cases.

## Workflow
1. Restate the behavior to prove and its acceptance criteria.
2. Derive cases by technique (§1 of the reference): happy path, then **boundary** and
   **equivalence** classes, error paths, idempotency/concurrency where relevant; use a
   **property** when the logic has an invariant.
3. Map each case to a concrete test (existing framework if any) and the command to run it.
4. Run them if possible and record results.

## Output format (required)
```md
## Behavior under test
## Test cases
| # | Case | Type (happy/edge) | How to verify | Command |
|---|---|---|---|---|
## Commands to run
## Results / evidence
## Gaps (untested)
```
Never mark a case passing without the actual result in **Results / evidence**.
