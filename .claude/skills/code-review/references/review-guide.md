# Code review reference — defect taxonomy, severity rubric, security checklist

Loaded on demand by the `code-review` skill (progressive disclosure — kept out of the
always-loaded SKILL.md). Distilled from the authoritative sources listed at the end.

## 1. What to look at, in priority order (Google's "what to look for")
Cover these aspects; **design is the most important** and the one automated tools can't
judge. Roughly in order:
1. **Design** — does the change belong here, integrate well, and not over-engineer for
   needs that don't exist yet?
2. **Functionality** — does it do what it intends, including **edge cases** and
   **concurrency** (race conditions/deadlocks can't be caught by running the code)?
   Consider the end user.
3. **Complexity** — simpler alternative? No speculative generality.
4. **Tests** — correct, useful, present for the change; will fail when the code breaks.
5. **Naming / comments / consistency** — clear names; comments explain *why* not *what*;
   follows the Decision Log and existing patterns.
6. **Style / docs** — lowest priority; see §4.

## 2. Defect taxonomy — the bug classes to scan for
A reviewer works through classes systematically rather than reading top-to-bottom. Map
each hunk to these (ODC "defect type" + common code-review classes):
- **Logic / algorithm** — wrong condition, inverted boolean, wrong operator, incorrect
  formula, missing case.
- **Boundary / off-by-one** — `<` vs `<=`, first/last element, empty input, overflow.
- **Null / undefined / error-handling** — unchecked null, unhandled rejection, swallowed
  exception, error path that leaves state half-updated.
- **Data / assignment / checking** — wrong variable, missing validation, type coercion,
  uninitialized value.
- **Interface / API / contract** — signature or return-shape change, **backward-
  compatibility break**, wrong argument order, broken callers.
- **Timing / concurrency** — race condition, deadlock, non-atomic read-modify-write,
  missing lock/await, order dependency.
- **Resource / memory** — leak (file/handle/connection not closed), unbounded growth,
  missing cleanup on the error path.
- **Performance** — N+1 query, work in a hot path/loop, blocking a startup or request
  path, needless re-computation.
- **Security smell** — see §3.

## 3. Security checklist — grounded in the OWASP Top 10 (2021)
Manual review specifically catches what scanners miss: business-logic flaws,
authorization complexity, race conditions, crypto misuse. Prioritize by OWASP rank:
- **A01 Broken Access Control** *(ranked #1 — check first)* — every sensitive action
  verifies the caller is authorized for THIS object; no IDOR (trusting a client-supplied
  id); deny-by-default.
- **A02 Cryptographic Failures** — secrets not hard-coded/logged; TLS for data in
  transit; no weak/DIY crypto; sensitive data not stored in plaintext.
- **A03 Injection** — SQL/NoSQL/OS-command/LDAP built by concatenation; XSS from
  unescaped output. Use parameterized queries / safe APIs; escape on output.
- **A04 Insecure Design** — the feature's threat model itself (rate limits, abuse cases).
- **A05 Security Misconfiguration** — debug on in prod, permissive CORS, default creds.
- **A06 Vulnerable/Outdated Components** — new dependency vetted and pinned?
- **A07 Identification & Authentication Failures** — session handling, credential storage.
- **A08 Software & Data Integrity Failures** — unsafe deserialization, unverified updates.
- **A09 Security Logging & Monitoring Failures** — security events logged, secrets NOT.
- **A10 Server-Side Request Forgery (SSRF)** — user-controlled URLs fetched server-side.

## 4. Substance over style — what to deprioritize
- **Do NOT block on personal style preference.** The formatter/linter and the project's
  style guide own style — not the reviewer. If a linter can catch it, it's not a review
  finding.
- **Approve when the change definitely improves overall code health** — perfection is not
  the bar; don't hold a good change hostage to unrelated cleanup.
- **Label optional polish as a nit** (see severity `nit` below) so the author knows it
  doesn't block.

## 5. Severity rubric (rank findings by this, most-severe first)
| Severity | Meaning | Blocks ship? |
|---|---|---|
| **blocker** | Breaks functionality, loses/corrupts data, or a real security hole (esp. A01–A03). | **Yes** |
| **major** | Wrong behavior on a real path, missing error handling, backward-compat break, likely perf regression. | Yes, unless explicitly deferred with a reason |
| **minor** | Narrow-case bug, weak test, small inconsistency with the Decision Log. | No, but should fix |
| **nit** | Naming/readability/optional polish; anything a formatter/linter owns. | No — author may ignore |
Severity = technical impact; it is distinct from business *priority*. When unsure between
two levels, pick the higher and say why.

## 6. Effectiveness guidance (SmartBear/Cisco study of 2,500 reviews / 3.2M LOC)
- Review **200–400 LOC at a time** (best detection **under ~200**); split larger changes.
- Keep inspection rate **under ~300–500 LOC/hour** — faster misses defects.
- Cap a sitting at **~60 minutes** (never >90) — detection collapses past that.
- Even a one-line change deserves a few minutes.
For an AI reviewer these translate to: for a large diff, review in bounded chunks and say
what was and wasn't covered rather than skimming everything at once.

---

## Sources
- Google Engineering Practices — Code Review: overview, *The Standard of Code Review*, and
  *What to Look For*. https://google.github.io/eng-practices/review/
- OWASP Top 10:2021. https://owasp.org/Top10/2021/
- OWASP Secure Code Review Cheat Sheet.
  https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
- OWASP Code Review Guide. https://owasp.org/www-project-code-review-guide/
- SmartBear / Cisco Systems code review case study (2,500 reviews, 3.2M LOC).
  https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/
- Orthogonal Defect Classification (defect-type taxonomy) and practitioner severity/
  priority references.

> Provenance note: key facts verified against the linked primary sources on 2026-07-16 —
> the OWASP Top 10:2021 ranking, Google eng-practices' review aspects + the `Nit:`
> convention, and the SmartBear/Cisco figures ("no more than 200 to 400 LOC", "under 500
> LOC per hour", review sessions "under 60 minutes"). The defect-taxonomy items draw on
> the same standard material (ODC).
