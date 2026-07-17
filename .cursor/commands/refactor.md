<!-- FILE SINH TỰ ĐỘNG — ĐỪNG SỬA. Sửa engine/ hoặc kit.config.yaml rồi chạy: kit build -->

# Refactor skill

Change shape, not behavior. Plan before editing.

Work from **[references/refactor-guide.md](references/refactor-guide.md)** — the "small
steps under a green suite" discipline, characterization tests for untested code, and the
smell → named-refactoring catalog.

## Workflow
1. State the behavior that must stay identical (the invariant). Ensure a **safety net**:
   existing tests are green, or add **characterization tests** first (§2 of the reference).
2. Map impact: which files/callers/tests are affected; pick the **named refactoring** for
   each smell (§3–§4).
3. Propose the smallest safe steps; note anything that touches a kit.config invariant.
4. Define how to verify behavior is unchanged (tests to run) and how to roll back.

## Output format (required)
```md
## Goal (what improves)
## Behavior kept identical
## Impact (files / callers / tests)
## Steps (smallest safe order)
## Verification (tests to run)
## Rollback plan
```
Do not start editing until the plan is confirmed in standard/strict mode.
