---
name: senior-reasoning
description: Use before any non-trivial decision or design — invoke to think it through like a senior, not tick a checklist. Forces the moves that separate senior from junior: challenge the premise, weigh 2+ options with real numbers, trace second-order effects, name the risk a junior misses, steelman the opposite, and state assumptions + confidence. Raises the depth of /discover, /challenge, and /ship design.
license: Apache-2.0
compatibility: Requires repository read access.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Senior Reasoning skill

A junior answers the checklist — "correctness: looks fine." A senior *reasons*, and the reasoning is the deliverable. Invoke this at any real decision (what to build · how to design it · is this safe · why did it break) to force depth instead of a one-line pass.

**The rule that makes it senior:** never just assert. For every claim, give the **because** (the reasoning) and the **so-what** (the consequence). If you can't, you haven't thought it through — keep going.

## The moves — do each; skip one only with an explicit "n/a — why"
1. **Challenge the premise.** Is this the real problem or a symptom? What is the actual goal behind the request? What happens if we do *nothing*, or the opposite? Re-state the problem in one sharp sentence before solving it — half of senior value is solving the *right* problem.
2. **2+ real options, with numbers.** Never present a single obvious path. Give at least two approaches (include the cheap/boring one) with concrete trade-offs — cost, risk, effort, complexity — and where each one breaks. **Quantify**: "≈100k rows → the nested scan is ~10^10 ops, seconds per request", not "might be slow".
3. **Second-order & systemic.** What does this touch that isn't in front of you — callers, jobs, events, data, other teams, future changes? What breaks at 100× scale, in six months, or when an assumption flips? State the blast radius.
4. **The non-obvious risk.** Name the one thing a competent junior would miss — the silent failure, the race, the idempotency hole, the data that isn't what it looks like, the migration that locks a hot table. This single line is often the highest-value output of the whole pass.
5. **Steelman the opposite.** Make the *strongest* case against your leading choice, as if a staff engineer is tearing it apart — then answer it honestly. If you can't argue the other side well, you don't yet understand the decision.
6. **Assumptions & unknowns.** List what you're assuming, what you don't know, and what evidence would change your mind. Mark fact vs guess — never launder a guess as a fact.
7. **Precedent.** Is this a known problem with a known-good pattern (name it — idempotency key, outbox, saga, CQRS, optimistic lock…), or genuinely new? Don't reinvent; don't cargo-cult a pattern that doesn't fit.

## Output format (required)
```md
## Real problem (reframed, one sentence)
## Options
| Option | How it works | Trade-off (quantified) | Where it breaks |
|---|---|---|---|
## Second-order effects & blast radius
## The non-obvious risk (what a junior misses)
## Steelman against the leading choice → my response
## Assumptions · unknowns · what would change my mind
## Recommendation + confidence (low / med / high) + what would raise it
```

**Depth bar:** every row carries a *because* and a *consequence*. A section of bare one-liners with no reasoning **fails this skill — redo it**. Scale to the mode: `vibe` = the reframe + the leading option + the non-obvious risk + confidence (still real reasoning, just tighter); `standard` / `strict` = the full set, written down.
