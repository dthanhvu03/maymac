# Test design reference — techniques for high-signal cases

Loaded on demand by the `test-design` skill (progressive disclosure). Compiled from the
authoritative sources listed at the end.

## 1. Pick cases by technique, not by guessing
A senior derives cases systematically so coverage is defensible, then adds experience-based
cases on top. Combine these black-box techniques:

- **Equivalence partitioning** — split each input into classes that should behave the same
  (valid / invalid / special); test one representative per class instead of many similar
  values.
- **Boundary value analysis** — bugs cluster at edges: test min, min−1, min, max, max+1,
  and just-inside/just-outside each boundary (off-by-one, `<` vs `<=`).
- **Decision tables** — for logic with several conditions, enumerate the combinations of
  inputs → expected action; catches missed rules.
- **State transition testing** — for stateful features, test valid transitions AND invalid
  ones (can't cancel an already-shipped order).
- **Pairwise / combinatorial** — when many parameters interact, cover all *pairs* of values
  (most defects come from single- or two-factor interactions) instead of the full cross
  product.
- **Error guessing / experience** — nulls, empty strings, huge inputs, unicode, duplicate
  submits, wrong types.

## 2. Always cover these axes
- **Happy path** — the intended behavior.
- **Boundaries & empties** — 0, 1, many; empty list; first/last.
- **Error paths** — invalid input, downstream failure, timeout; assert the error is handled
  and state isn't left half-updated.
- **Idempotency & concurrency** (where relevant) — repeat the call; two callers at once;
  retries don't double-charge.
- **Security-adjacent** — authorization on the endpoint; injection via inputs (link to the
  security-review skill for depth).

## 3. Property-based testing (when logic has invariants)
Instead of hand-picking examples, state a **property that must always hold** (e.g. "decode
∘ encode == identity", "output is always sorted", "total never goes negative") and let a
generator throw hundreds of random inputs at it. Excellent for parsers, serializers, and
math/aggregation logic. (QuickCheck lineage: Hypothesis (Py), fast-check (JS), jqwik (Java).)

## 4. Shape of the suite — the test pyramid
Favor many fast **unit** tests, fewer **integration** tests, and a small number of slow
**end-to-end** tests. Don't push logic checks up to E2E where they're slow and flaky.

## 5. Coverage is a floor, not a goal
Line/branch coverage shows what was *executed*, not what was *verified* — 100% coverage
with weak assertions still misses bugs. Use coverage to find untested code, not to declare
quality. Every case must assert the actual result; a test with no meaningful assertion is
theater.

## 6. Output discipline
Map each case to a concrete, runnable command and record the real result. An empty
**Results / evidence** section fails the evidence gate — never mark a case passing without
the actual output.

---

## Sources
- ISTQB Foundation Level syllabus — black-box test techniques (equivalence partitioning,
  boundary value analysis, decision tables, state transition). https://www.istqb.org/
- G. J. Myers, *The Art of Software Testing* — boundary/edge-case testing.
- Combinatorial (pairwise) testing — NIST. https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software
- Property-based testing — QuickCheck (Claessen & Hughes); Hypothesis docs.
  https://hypothesis.readthedocs.io/
- The Practical Test Pyramid — Ham Vocke (martinfowler.com).
  https://martinfowler.com/articles/practical-test-pyramid.html

> Provenance note: compiled from the authoritative sources above. An automated adversarial
> cross-check was not completed this session (API session limit) — these are standard,
> well-established techniques; verify against the linked sources if precision matters.
