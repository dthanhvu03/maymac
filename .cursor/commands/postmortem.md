<!-- FILE SINH TỰ ĐỘNG — ĐỪNG SỬA. Sửa engine/ hoặc kit.config.yaml rồi chạy: kit build -->

# /postmortem

Run after an incident or a shipped bug. The goal is to **learn and prevent the class**, not to assign blame — assume everyone acted reasonably with the information they had. A postmortem that ends at "be more careful" has failed.

1. **Timeline** — what happened, when it was noticed, how it was mitigated. Plain language, no blame.
2. **Impact** — who and what was affected, and how badly (users · money · data). Be honest about scale.
3. **Root cause, not the trigger** — ask "why" until you reach the real cause (5 Whys). The trigger is *what* broke; the root cause is *why it was possible* to break.
4. **The class** — what OTHER bugs of this same shape could already exist? Fixing only this one instance lets the class recur — name the class.
5. **Prevention (concrete + owned)** — the specific change that makes this class impossible or caught early: a test, an **invariant** (→ `kit.config.yaml`), a guard/hook, an evidence-gate artifact, or a monitoring alert. Each says exactly what and where.
6. **Record it** — append the root cause and the prevention as a decision (`/decide`, ADR format). If it revealed a missing invariant, add it to `kit.config.yaml` `invariants:` so the guardrail enforces it from now on, and add a regression test.

Scale to the mode: `vibe` = timeline + root cause + one concrete prevention; `standard`/`strict` = the full record with the invariant/test/guard actually wired in before the incident is closed.
