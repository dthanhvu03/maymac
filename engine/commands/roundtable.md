---
id: roundtable
title: Team roundtable — hash it out to an agreed decision
description: Get the relevant roles to debate a non-trivial change and converge on a decision BEFORE building — bounded rounds, then converge or escalate to you. Not for small fixes.
argument-hint: "[the change or question to decide]"
---

# /roundtable

For a non-trivial or contested change, get the team to agree before committing — without an endless debate.

1. Read `.kit/constitution.md` and `.kit/decisions.md`.
2. **Set the bar:** write the acceptance criteria — what "good" looks like — from the decision brief / plan / invariants. No criteria → define them first.
3. Run the **cross-review** skill: a bounded roundtable where each relevant role gives one concise conclusion per round (architect proposes, reviewer challenges, qa says how it's verified, planner checks scope).
4. **Converge or escalate.** Stop as soon as the criteria are met and record the agreed decision. Respect the cap — `vibe`: skip (one pass); `standard`: ≤2 rounds; `strict`: ≤3 rounds. At the cap with no agreement, present the trade-off to me in plain language and let me decide — never loop forever.
5. Append the converged decision (and any open items / risks accepted) to `.kit/decisions.md`.
6. Hand the agreed decision to `/start` to build the smallest slice.
