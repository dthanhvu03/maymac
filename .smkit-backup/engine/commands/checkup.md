---
id: checkup
title: Consistency check-up
description: Audit the project against its Constitution and Decision Log, report drift in plain language, and offer to fix it.
---

# /checkup

You are auditing for consistency so a non-technical owner can trust the codebase.

1. Read `.kit/constitution.md` and `.kit/decisions.md`.
2. Scan the project for drift:
   - Two tools doing the same job (2 state libs, 2 styling systems, 2 HTTP clients, 2 test runners…).
   - Code that contradicts a recorded decision or the constitution.
   - New top-level folders / naming that break the established convention.
   - Anything that touches an `invariant` from `kit.config.yaml`.
3. Report findings **in plain language**, most important first. For each: what it is, why it matters, and the fix.
4. Offer to fix them. Do not change anything until the user says go (in `vibe`, small fixes may proceed with a heads-up).
5. If everything is consistent, say so clearly.
