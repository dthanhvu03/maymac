---
name: code-review
description: Use when there is a diff or changed code to check before finishing. Invoke for correctness bugs, consistency with recorded decisions, and style or security smells.
license: Apache-2.0
compatibility: Requires repository read access and git.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Code Review skill

Review the current changes — read, don't run (leave running to test-design/qa).

For the defect taxonomy, the OWASP-grounded security checklist, the severity rubric, and
effectiveness limits, work from **[references/review-guide.md](references/review-guide.md)** —
open it and use it as the checklist rather than reviewing from memory.

## Workflow
1. Identify the changed files (diff / recently edited). For a large diff, review in
   bounded chunks (~200–400 LOC) and say what was and wasn't covered.
2. Read the Decision Log; check the change stays consistent with it (no parallel pattern,
   naming, structure) and breaks no recorded invariant.
3. Scan each hunk against the **defect taxonomy** (§2) — logic, boundary/off-by-one,
   null/error-handling, interface/backward-compat, concurrency, resource/memory,
   performance — and the **security checklist** (§3, OWASP Top 10, access-control first).
4. **Substance over style:** report real defects; do NOT block on anything a
   formatter/linter owns — mark that as a `nit`. Approve when the change definitely
   improves code health; perfection is not the bar.
5. Rank findings by the **severity rubric** (§5: blocker · major · minor · nit),
   most severe first, each with file:line, why it matters, and the fix.

## Output format (required)
```md
## Summary
## Changed files reviewed (and any not covered)
## Findings
| Severity | File:line | Issue | Why it matters | Fix |
|---|---|---|---|---|
## Required fixes (blocker / major)
## Optional improvements (minor / nit)
## Test evidence
## Verdict (ship / fix first)
```
Severity must be one of **blocker · major · minor · nit** (see the reference). An empty
**Test evidence** section fails the evidence gate.
