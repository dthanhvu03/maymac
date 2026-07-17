---
id: decide
title: Record a decision
description: Append a technical decision to the Decision Log so future sessions stay consistent.
argument-hint: "[the decision, in plain words]"
---

# /decide

Record a decision so the whole project (and every future AI session) stays consistent.

1. Take the user's decision (from the argument or by asking).
2. Append an entry to `.kit/decisions.md` as a lightweight **ADR** (Architecture Decision Record) — the context and consequences are what make it useful later, not just the choice:
   ```
   ## <today's date> — <short title>   [status: accepted]
   - **Context:** <the situation / forces that made a decision necessary>
   - **Decision:** <what was chosen>
   - **Why / alternatives:** <plain-language reason, and what was rejected>
   - **Consequences:** <the trade-offs accepted; what this now constrains going forward>
   - **Reversibility:** one-way (hard/expensive to undo) | two-way (easy) — <if one-way, the exit cost>
   - **Applies to:** <paths / areas>
   ```
3. If this decision replaces an earlier one, mark the old entry `[status: superseded by <date/title>]` (don't delete history) and append the new one.
4. Confirm in one sentence what was recorded.
