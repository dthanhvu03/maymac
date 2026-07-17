# Release readiness reference — versioning, changelog, safe rollout

Loaded on demand by the `release-check` skill (progressive disclosure). Compiled from the
sources listed at the end.

## 1. The gate: nothing ships without evidence
Every checklist item needs a real result attached (build/test/lint output, a diff, a
command run). "Looks fine" is not evidence. A single un-evidenced item ⇒ **no-go**.

## 2. Versioning — Semantic Versioning (SemVer)
`MAJOR.MINOR.PATCH`:
- **MAJOR** — incompatible/breaking API change.
- **MINOR** — backward-compatible new functionality.
- **PATCH** — backward-compatible bug fix.
Confirm the bump matches what actually changed (a breaking change with only a PATCH bump
is a release bug). Pre-1.0.0 (`0.y.z`) — anything may change; communicate that.

## 3. Changelog — human-readable, per release
Keep a curated `CHANGELOG.md` (Keep a Changelog format): an entry per version grouped as
**Added / Changed / Deprecated / Removed / Fixed / Security**, newest first, dated.
Conventional Commits can drive it, but the changelog is written for humans, not a raw git
log. Confirm the entry exists and matches the diff.

## 4. Safe rollout (Google SRE release engineering)
- **Reversible & backed up** — can you roll back fast? Is there a backup/migration-down?
- **Gradual rollout / canary** — release to a small slice first where possible; watch,
  then widen. Avoid big-bang deploys.
- **Hermetic, reproducible build** — the artifact is built from a known, pinned source;
  the same inputs produce the same output.
- **Data/schema migrations** — never a destructive migration without a rollback plan and
  the schema_change approver's sign-off.

## 5. Pre-release checklist (adapt to the project)
- [ ] build / test / lint green — output quoted.
- [ ] version bumped per SemVer; changelog entry matches the diff.
- [ ] no secrets, no debug/temp files, no `.env` committed.
- [ ] generated config in sync (`smkit check`) and `smkit doctor` clean.
- [ ] dependencies vetted/pinned; no new critical CVE.
- [ ] rollback path known; destructive migration has a plan + approval.
- [ ] smoke test of the critical path after deploy.
- [ ] explicit **go / no-go** with the risks named.

## 6. Production readiness (beyond "it works in the demo")
A demo runs without these; production needs them. Check the ones that apply to the change:
- **Structured logging** — treat logs as event streams to stdout (12-factor); no secrets
  or PII in logs; enough context to debug an incident.
- **Error tracking & health** — errors surface to a tracker, not just the console; a
  health/readiness endpoint exists.
- **Timeouts & rate limiting** — every outbound/external call has a timeout; abuse-prone
  endpoints are rate-limited.
- **Retries & idempotency** — a retried request must not double-charge or double-write.
  Make write operations idempotent (an idempotency key, or a naturally idempotent design).
  Note: `GET`/`PUT`/`DELETE` are idempotent by definition; `POST`/`PATCH` are not.
- **Backups & restore** — a tested backup and a written restore procedure before anything
  touches prod data.
- **Rollback** — every deploy is reversible; a destructive migration has a down-migration
  and the approver's sign-off.
- **Monitoring** — the critical path is observed; a breakage is noticed in minutes.
Prototype / low-risk software can skip most of this; the more users and the higher the cost
of failure, the more of it becomes mandatory.

---

## Sources
- Semantic Versioning 2.0.0. https://semver.org/
- Keep a Changelog. https://keepachangelog.com/
- Conventional Commits. https://www.conventionalcommits.org/
- Google SRE Book — Ch. 8, Release Engineering (hermetic builds, gradual rollout).
  https://sre.google/sre-book/release-engineering/
- The Twelve-Factor App — XI. Logs (logs as event streams). https://12factor.net/logs
- MDN — Idempotent (HTTP method semantics).
  https://developer.mozilla.org/en-US/docs/Glossary/Idempotent

> Provenance note: verified against source on 2026-07-16 — SemVer's MAJOR/MINOR/PATCH
> increment rules and the `0.y.z` pre-1.0 rule (semver.org), the Keep a Changelog
> categories + "changelogs are for humans" principle (keepachangelog.com), the 12-factor
> "treat logs as event streams… write… to stdout" principle (12factor.net/logs), and the
> HTTP idempotency definition (GET/PUT/DELETE idempotent, POST/PATCH not — MDN). The Google
> SRE release-engineering principles draw on the linked chapter.
