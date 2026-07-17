---
id: consistency-guard
scope: paths
enforce: hook+agent-read
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
  - "**/*.php"
title: Consistency guard (when editing code)
---

# Before writing or editing code, self-check

- **Does this already exist?** Search for an existing component/util/service doing this before creating a new one.
- **Am I following the established pattern?** Same folder layout, naming convention, and libraries recorded in the Decision Log.
- **Am I adding a second way?** If this introduces a parallel approach (a 2nd state library, a 2nd styling system, a 2nd HTTP client, a 2nd folder convention) — STOP. Explain the conflict to the user in plain language and ask before proceeding.
- **After a non-trivial choice**, append it to the Decision Log with a one-line plain-language reason.
