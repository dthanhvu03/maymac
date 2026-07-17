---
id: evidence-gate
scope: always
enforce: gate
title: Evidence gate (no unverified "done")
---

# Evidence gate — don't claim done without proof

- **Never report a task as done, passing, or fixed without evidence.** State what you actually ran and its result.
- If tests exist: run them and quote the outcome (pass/fail counts). If they fail, say so with the output — do not hide it.
- If there are no tests: describe concretely how you verified the behavior (what you ran, what you observed).
- If a step was skipped or is unverified, say that plainly — don't imply it was checked.
- Skills that produce a review/verdict (code-review, test-design) must fill their **Test evidence** section; an empty evidence section means the gate is not satisfied.

## Required artifacts by risk (completeness)
Some change types are not "done" until a specific artifact exists — this is **not optional**, it is part of the gate:
- **Schema / data-shape change** → a **migration note AND a rollback step** (in the task / handoff). No migration note → not ready to ship.
- **Money, authentication, or personal-data (PII) touch** → a plain-language **business walkthrough AND a second review pass**. These carry real-world risk; a bare diff is not enough.
- **Destructive or irreversible operation** → the **reversible / backed-up step is written down** before it runs.

If a required artifact is missing, STOP and produce it — or state plainly why it does not apply — before shipping. This mirrors the task file's **Gate status** checklist; keep the two in sync.
