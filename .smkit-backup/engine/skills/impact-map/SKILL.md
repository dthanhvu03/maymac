---
name: impact-map
description: Use BEFORE a non-trivial change — do not edit code yet. Invoke to map every read/write of the affected data and all the routes, services, jobs, events, and tests that touch it, so a change doesn't silently break something the agent never saw.
license: Apache-2.0
compatibility: Requires repository read access.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Impact Map skill

An AI sees only the files it opened — it misses cron jobs, queue workers, event
listeners, DB triggers, and other callers, then "fixes" one place and breaks another.
Before a non-trivial change, map the blast radius. **Read-only: produce the map, do not
edit code.**

## Workflow
1. Name exactly what is changing — a field/column, a function/endpoint, a data shape, or a
   shared module.
2. Find every **read and write** of it: grep the field/symbol across the whole repo,
   including migrations, models, serializers/DTOs, and the frontend (a field is often
   named differently on each side — check).
3. Trace **callers and callees** — who calls the function, and what it calls; if the
   return shape or signature changes, list the call sites that break.
4. Find the **cross-cutting touchers** the agent easily misses: routes/controllers,
   services, background jobs / queue workers, cron/scheduled tasks, event
   listeners/observers, DB triggers, caches, and other services/APIs.
5. List the **tests** that cover any of the above.
6. Flag any **invariant** (from kit.config.yaml) or Decision-Log entry the change touches.

## Output format (required)
```md
## Change (one line)
## Reads / writes (file:line)
## Callers & callees affected
## Cross-cutting (jobs · events · cron · triggers · cache · other services)
## Tests covering it
## Invariants / decisions touched
## Risk & smallest safe order
```
Do not start editing until the map is produced and the plan reflects it. If the map is
large, that itself is a signal to slice the change smaller.
