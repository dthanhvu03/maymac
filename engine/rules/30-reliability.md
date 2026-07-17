---
id: reliability
scope: paths
enforce: agent-read
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
  - "**/*.go"
  - "**/*.php"
title: Reliability — correct under concurrency, failure, and in production
---

# Reliability — correct when things run twice, fail, or need debugging in prod

Loads when you touch code. For anything touching **money, bookings, inventory, or an
external service**, these are not optional — they are where a working-looking app loses real
money. Complements code-craft (how to write) and the evidence-gate (prove it).

## Concurrency & idempotency — assume two of everything, at once
- **Two requests, two clicks, a retried webhook.** Code must stay correct when the same
  action runs twice or in parallel. Design for it; don't hope it won't happen.
- **Idempotency** — anything that can be retried (a payment, a webhook, a background job)
  must be safe to run again: use an idempotency key / dedupe, or make the write naturally
  idempotent (upsert). A retried charge must **never** double-charge.
- **A check-then-act on shared data is a race.** Reading availability/balance, deciding,
  then writing across an `await` gap lets two callers both win. Enforce at the database — a
  transaction, a **unique constraint**, or a conditional/optimistic update — not in app code.
- **No double-booking / double-spend** — make the illegal outcome impossible at the data
  layer, not just guarded in a handler.

## Failure modes & resilience — every call can fail or hang
- **Set timeouts** on every external call; **retry only idempotent** ones, with backoff.
- **Degrade gracefully** — when a dependency is down, fail that feature cleanly instead of
  cascading the outage across the whole app.
- **Fail fast and explicit** — validate inputs at the boundary; raise a clear, typed error.
  Never swallow an error or return a silent `null` that hides it.
- **Partial failure leaves state consistent** — if step 3 of 5 fails, use a transaction or a
  compensating undo. Never a half-applied money or state change.

## Observability — you can't fix what you can't see
- **Structured logs at the edges** (request in/out, external calls, state transitions) with
  enough context to trace one request end-to-end — and **never** secrets or PII in logs.
- **Surface failures** to somewhere a human actually sees (log/alert), not into the void.
- Make the key business events (payment, booking, signup) observable so a production issue
  is diagnosable after the fact.

> Scale to the mode: `vibe` = the essentials (idempotent retries · timeouts · one error
> surfaced); `standard` = + guarded shared state and structured logs; `strict` = the full
> set plus a written failure/rollback plan for the risky path.
