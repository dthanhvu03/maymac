---
id: nextjs-conventions
scope: paths
enforce: agent-read
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
  - "**/*.ts"
  - "**/*.tsx"
title: Next.js conventions (App Router)
---

# Next.js conventions — one way to do each thing

- **Router:** App Router (`app/`). Do not add the Pages Router.
- **Language:** TypeScript everywhere. No plain `.js` for app code.
- **Naming:** `camelCase` for variables/functions, `PascalCase` for components/types, `UPPER_SNAKE` for constants; component files `PascalCase.tsx`.
- **Components:** Server Components by default; add `"use client"` only when you need interactivity/state.
- **Styling:** one system only (the one recorded in the Decision Log). Do not mix Tailwind + CSS modules + styled-components.
- **Data:** fetch in Server Components / route handlers; keep secrets server-side. Don't call the DB from client components.
- **Structure:** feature folders under `app/` for routes, shared UI in `components/`, non-UI helpers in `lib/`.
- **State:** prefer server state + URL; add a client state library only if the Decision Log says so — never a second one.

Before adding a library or a new pattern, check the Decision Log. If it introduces a second way to do something that exists, STOP and ask in plain language.
