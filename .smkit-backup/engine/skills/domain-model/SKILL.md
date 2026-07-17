---
name: domain-model
description: Use when the problem is framed but before design or code. Invoke to turn the business idea into an explicit domain model: the core entities in the founder's words, the states each moves through (a state machine), and the invariants that must always hold. Prevents whole classes of bugs — impossible states, illegal transitions, broken money/booking rules — by naming them up front.
license: Apache-2.0
compatibility: Requires repository read access.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Domain Model skill

The bridge from "what the founder wants" to a model the code **cannot** violate. Run it
after the problem is clear (analyst / `/discover`) and before design. Talk to the founder in
plain language; make the artifact precise. This is where vague requirements become correct
software — most high-stakes bugs are an illegal state or transition that was never named.

## Workflow
1. **Entities & ubiquitous language** — name the core things (`Booking`, `Order`, `Payment`,
   `Slot`) using the **founder's own words**. One term per concept, reused everywhere — code,
   UI, and docs. A shared vocabulary is half the battle.
2. **States & transitions (state machine)** — for anything with a lifecycle, list its states
   and the **allowed** transitions; everything else is illegal by definition. e.g. `Booking:
   pending → confirmed → completed | cancelled`; a `completed` booking can't be cancelled.
3. **Invariants — what must ALWAYS be true** — the high-stakes rules for THIS domain, as
   checkable statements: money is never negative; a slot is never double-booked; an order's
   total equals its line items; one active subscription per user.
4. **Commands → events** — the actions that change state (`confirmBooking`, `refundPayment`)
   and what each produces. A command may only move the machine along a **legal** transition.
5. **Make illegal states unrepresentable** — prefer a shape where a bad state can't even be
   built (a discriminated union / status enum with the fields each state requires) over
   runtime checks bolted on afterwards. Design the bug out, don't guard against it.
6. **Record & enforce** — put the entities, the state diagram (as text), and the invariants
   into the task / Decision Log, and add the hard ones to `kit.config.yaml` `invariants:` so
   the guardrail holds the line in every future change.

## Output format (required)
```md
## Entities & glossary (founder's words)
## State machines (states → allowed transitions)
## Invariants (always-true, checkable)
## Commands → events (each a legal transition)
## Illegal states designed out
## To enforce (invariants for kit.config.yaml)
```
An invariant with no plan to enforce it is just a hope — wire it into `invariants:` / a DB
constraint / a test, or say plainly why it can't be. Scale to the mode: `vibe` = the entities,
one state machine, and the top 2–3 invariants; `strict` = the full model and every invariant
enforced.
