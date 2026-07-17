---
name: decision-brief
description: Use when a request is vague or new and a build decision has not been made yet. Invoke to turn a fuzzy idea into a founder-ready brief — the real problem, options with trade-offs, rough cost/risk, and the smallest slice worth building.
license: Apache-2.0
compatibility: Requires repository read access.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Decision Brief skill

Turn a vague request into information a non-technical founder can decide on — *before* anyone plans or writes code. Frame the request as a problem, not the feature the founder guessed at.

Work from **[references/decision-guide.md](references/decision-guide.md)** — problem-vs-
solution framing, Jobs-to-be-Done, MVP/smallest-slice, reversible vs irreversible (one-way
/ two-way door) decisions, and cost of delay.

## Workflow
1. **Reframe** the request as the underlying problem and who has it (Jobs-to-be-Done, §1–§2 of the reference). State it in one plain sentence and confirm.
2. **Explore options** — at least two ways to solve it (including the cheapest/manual one and "do nothing"), each with an honest trade-off. The smallest option that still teaches us something usually wins.
3. **Size it roughly** — effort, cost, and the risk most likely to make it a waste. Label every number an estimate; never present a guess as a fact.
4. **Classify reversibility** — is this a **two-way door** (cheap to undo → decide fast, don't over-analyze) or a **one-way door** (hard/expensive to reverse — a database, a data model, a pricing model, a public API → decide deliberately, and note the exit cost)? Spend the founder's attention where it's actually one-way.
5. **Isolate the founder's decision** — the one or two questions only they can answer (budget, audience, acceptable risk), asked in plain language.
6. **Recommend** one option and define what "done" looks like in a sentence they would accept.

## Output format (required)
```md
## The real problem
## Who it's for (and the job they're hiring it to do)
## Options
| Option | What it is | Trade-off | Rough effort (estimate) |
|---|---|---|---|
## Cost & risk (estimates)
## Reversibility (two-way door → decide fast · one-way door → decide deliberately)
## Smallest slice worth building
## Questions only the founder can answer
## Recommendation
## What "done" looks like
```
Empty **Options** or **Recommendation** fails the evidence gate — a brief with no real choice is not a decision. Keep the whole thing in plain, non-technical language.
