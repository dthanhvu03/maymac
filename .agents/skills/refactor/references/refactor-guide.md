# Refactor reference — safe, behavior-preserving change

Loaded on demand by the `refactor` skill (progressive disclosure). Compiled from the
authoritative sources listed at the end.

## 1. The one rule: behavior stays identical
Refactoring changes *structure*, not *behavior*. Mixing a refactor with a behavior change
is how refactors introduce bugs — do one at a time. Fowler's discipline: **only refactor
under a green test suite**, in **small steps**, running tests after each step so any break
is caught immediately and localized.

## 2. If there are no tests yet — write characterization tests first
For untested/legacy code, first pin the CURRENT behavior with **characterization tests**
(tests that capture what the code does today, bugs and all), so the refactor can prove it
changed nothing. Find the **seams** where you can insert tests without a big rewrite.
(Feathers, *Working Effectively with Legacy Code*.)

## 3. Smell → refactoring (what to look for, what to apply)
| Code smell | Typical refactoring |
|---|---|
| Long function | Extract Function |
| Duplicated code | Extract Function / Pull Up Method |
| Long parameter list | Introduce Parameter Object / Preserve Whole Object |
| Large class | Extract Class |
| Feature envy (method uses another object's data) | Move Function |
| Primitive obsession | Replace Primitive with Object |
| Switch/conditional complexity | Replace Conditional with Polymorphism; Decompose Conditional |
| Comments explaining bad code | Extract Function with an intention-revealing name |
| Temporary field / data clumps | Extract Class / Introduce Parameter Object |

## 4. Common named refactorings (Fowler catalog)
Extract Function · Inline Function · Extract Variable · Rename Variable/Function · Move
Function/Field · Change Function Declaration · Encapsulate Variable · Combine Functions
into Class · Replace Conditional with Polymorphism · Split Phase · Introduce Parameter
Object. Each is a small, named, reversible step with a known mechanics.

## 5. Method (matches the skill's output)
1. State the **invariant** — the behavior that must stay identical.
2. Ensure a **safety net**: existing tests are green, or add characterization tests first.
3. Map **impact**: files, callers, tests affected; flag anything touching a
   `kit.config` invariant.
4. Apply the **smallest safe steps** (one named refactoring at a time); run tests after
   each.
5. Define **verification** (the exact tests to run to prove behavior is unchanged) and a
   **rollback** (revert the commit/steps).

## 6. When NOT to refactor
Don't refactor on top of a red suite, don't bundle it into a feature commit, and don't
start a large refactor without agreement in standard/strict mode (see the skill). Prefer
many tiny reviewed steps over one big rewrite.

---

## Sources
- Martin Fowler, *Refactoring: Improving the Design of Existing Code* (2nd ed.) — catalog,
  smells, and the "small steps under green tests" discipline. https://refactoring.com/
- Refactoring catalog (online). https://refactoring.com/catalog/
- Michael Feathers, *Working Effectively with Legacy Code* — characterization tests, seams.
- Refactoring code smells reference. https://refactoring.guru/refactoring/smells

> Provenance note: Fowler's definition ("without changing its observable behavior") and
> the small-steps-under-green-tests discipline ("kept fully working after each
> refactoring") were verified against refactoring.com on 2026-07-16. The smell → refactoring
> catalog draws on the same source.
