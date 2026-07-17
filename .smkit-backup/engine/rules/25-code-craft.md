---
id: code-craft
scope: paths
enforce: agent-read
paths:
  - "src/**"
  - "app/**"
  - "lib/**"
  - "components/**"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.php"
title: Code craft — naming, design, OOP
---

# Code craft — name, design, and structure with intent

Loads when you touch code. Complements the consistency-guard (reuse over reinvention) and
the stack conventions (casing/layout).

## Naming (intention-revealing)
- A name says WHAT it is / WHY it exists — a reader understands it without reading the
  body. No cryptic abbreviations or single letters (except a loop index / math):
  `userCount`, not `uc`; `elapsedMs`, not `t`.
- Functions/methods are verbs (`sendInvoice`); booleans read as predicates (`isValid`,
  `hasAccess`); collections are plural.
- Follow the language's standard casing (see the stack conventions) — never hand-invent a
  scheme.
- A misleading name is a bug: rename as understanding improves.

## Design — the simplest thing that works
- **YAGNI** — build for today's requirement, not an imagined future. No speculative
  abstraction or "just in case" config.
- **KISS** — pick the simplest design a competent reader would choose; clarity over
  cleverness.
- Use a design pattern **only when it earns its place** (it removes real duplication or a
  real change-cost) — then **name it** (Strategy, Adapter, Factory…) so the intent is
  obvious. Don't apply patterns preemptively.
- **One way per thing** (consistency-guard): reuse the existing approach; record any new
  one in the Decision Log.

## Data & algorithms — fit the shape to the work
- **Match the container to the access.** Look-up or membership by key — especially inside a
  loop — belongs in a `Map`/`Set` (O(1)), not a repeated `.find()` / `.includes()` / `in`
  scan over a list (O(n)). A scan nested inside a loop is the usual accidental **O(n²)**.
- **Index one side, then one pass.** To join two collections, build a `Map` of one and
  iterate the other once — don't nest-scan both.
- **Compute once.** Hoist loop-invariant work out of the loop; cache a reused result
  instead of recomputing; don't re-sort / re-filter the same list repeatedly.
- **Right approach beats micro-tuning.** Choosing the fitting structure and an early exit
  matters far more than hand-optimizing a poor one.
- **But don't over-engineer (YAGNI).** For small, bounded data, a plain array and clear
  code win; reach for the heavier structure only when the size can actually grow or the
  path is hot. Measure before micro-optimizing.

## OOP — with restraint
- **Composition over inheritance** — prefer small collaborating objects/functions to deep
  class hierarchies.
- Make a class to encapsulate **state + the behavior that operates on it** — not to bag
  unrelated functions, and not "everything is a class". Use pure functions for stateless
  logic; keep side effects at the edges.
- **SOLID, pragmatically** — one clear responsibility per unit (SRP); depend on an
  interface/abstraction at a real seam (DIP), not everywhere.

## Dependencies — vet before adding
Before adding a package, confirm: it actually exists and is actively maintained (not a
hallucinated or abandoned name); it's compatible with the current framework/runtime; there
isn't a smaller or standard-library alternative; what it pulls in (check the lockfile diff)
and its license/security history are acceptable. Never `--force` past an install/audit
warning to make it go in. Record a kept dependency in the Decision Log — and never add a
second library for a job that already has one (consistency-guard).

> Sources: naming & functions — *Clean Code* (R. C. Martin); SOLID — R. C. Martin;
> patterns "use when justified" — *Design Patterns* (GoF); casing verified 2026-07-16 —
> Effective Go (`MixedCaps`, go.dev/doc/effective_go) and PEP 8 (snake_case / CapWords,
> peps.python.org/pep-0008); TypeScript handbook for TS.
