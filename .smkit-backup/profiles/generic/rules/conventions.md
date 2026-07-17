---
id: generic-conventions
scope: always
enforce: agent-read
title: Generic project conventions
---

# Conventions (generic profile)

- One way to do each thing. Pick a single approach for state, styling, data access, and routing; record it in the Decision Log and reuse it everywhere.
- **Naming:** intention-revealing (a reader understands without the body); no cryptic abbreviations. Follow the language's standard casing.
- Small, readable changes. Prefer clarity over cleverness.
- Keep files where similar files already are. Don't invent a new top-level folder without recording why.
- No secrets in code. Use env/config.
