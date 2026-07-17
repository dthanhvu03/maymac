---
id: decide
title: Record a decision
description: Append a technical decision to the Decision Log so future sessions stay consistent.
argument-hint: "[the decision, in plain words]"
---

# /decide

Record a decision so the whole project (and every future AI session) stays consistent.

1. Take the user's decision (from the argument or by asking).
2. Append an entry to `.kit/decisions.md` in this format:
   ```
   ## <today's date> — <short title>
   - **Decision:** <what was chosen>
   - **Why:** <plain-language reason>
   - **Applies to:** <paths / areas>
   ```
3. If this decision replaces an earlier one, note that (don't delete history — append a superseding entry).
4. Confirm in one sentence what was recorded.
