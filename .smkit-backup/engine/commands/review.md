---
id: review
title: Review current changes
description: Review the current changes for correctness and consistency with the recorded decisions before finishing.
---

# /review

1. Look at what changed (the current diff / recently edited files).
2. Check two things:
   - **Correctness:** obvious bugs, missing error handling, broken edge cases.
   - **Consistency:** matches the Constitution + Decision Log; no second way to do an existing thing; naming/structure follow convention; no `invariant` violated.
3. Report findings in plain language, most severe first. Say clearly if it's good to ship.
4. In `standard`/`strict`, run the project's tests before giving a verdict; never report green on unverified work.
