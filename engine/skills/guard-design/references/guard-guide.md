# Guardrail design reference — fail-safe defaults, bypass taxonomy

Loaded on demand by the `guard-design` skill (progressive disclosure). Compiled from the
sources listed at the end, including the kit's own guard threat model.

## 1. First principle: damage-control, not isolation
A string/AST command guard reduces honest-mistake blast radius; it is **NOT** a security
boundary. A determined bypass (env-var indirection, a wrapper script, an interpreter) can
always get through — the real boundary is an **OS sandbox / least-privilege process**.
State this honestly; never claim a markdown/regex guard is isolation.

## 2. Fail securely (secure-by-default)
- **Fail closed on ambiguity**: if the guard cannot understand the input, BLOCK, don't
  ALLOW. (guard-shell blocks unparseable tool input.)
- **Deny by default, allow by exception**: enumerate what's allowed, not what's banned,
  where feasible.
- **Defense in depth**: the guard is one layer; assume it can fail and keep the sandbox,
  approvals, and audit log behind it.
- **A guard that bricks legitimate work gets disabled** — for advisory checks, fail *open*
  with a loud warning (consistency-guard, critique-gate); for destructive-command
  blocking, fail *closed*. Choose per the cost of each error.

## 3. BLOCK / WARN / ALLOW decision design
For each case decide the outcome and why:
- **BLOCK** — clearly catastrophic and rarely legitimate (`rm -rf /`, force-push a shared
  branch, `DROP TABLE`, workspace-root delete). Block in every mode.
- **WARN** — risky but sometimes legitimate (bulk delete of a real subdir, unpinned
  `npx`, embedded code). Allow with a reason; let the human judge.
- **ALLOW** — safe or whitelisted (build/cache dirs, normal commands).
Scale by mode where it makes sense (e.g., high-risk → block in `strict`, warn otherwise).

## 4. Bypass taxonomy — enumerate and cover each
A guard is only as good as the evasions it anticipates. Check:
- **Chaining / composition** — `;`, `&&`, `||`, `|`, newlines; check EACH segment, not the
  whole string.
- **Quoting & escaping** — single/double quotes, backslashes hiding the verb.
- **Case & whitespace** — `RM -RF`, extra spaces/tabs.
- **Substitution / embedding** — `$(...)`, backticks, `bash -c`, base64/`FromBase64String`,
  PowerShell `-enc`.
- **Network→shell** — `curl … | sh` (pipe download into interpreter).
- **Path escape** — `~`, absolute paths, `../` out of the workspace, symlinks/junctions
  (resolve real path).
- **Platform variants** — Windows verbs (`Remove-Item -Recurse`, `del`, `rmdir /s`).
For each: confirm handled, or declare explicitly out of scope with the residual risk.

## 5. Prove it
Every case in the decision table needs a test (a command string → expected decision),
including the bypass attempts. Note the residual risk only an OS sandbox closes, and a
rollback (how to disable the guard if it misfires).

---

## Sources
- OWASP — Fail securely / secure design principles.
  https://owasp.org/www-community/Fail_securely
- OWASP Top 10:2021 A04 Insecure Design. https://owasp.org/Top10/A04_2021-Insecure_Design/
- NIST SP 800-160 / saltzer-schroeder secure-design principles (least privilege,
  fail-safe defaults, defense in depth).
- The kit's own guard threat model: `docs/adr/ADR-003-guardrail-threat-model.md` and
  `docs/kit-refactor/06-P1-guard-v2-design.md` (BLOCK/WARN/ALLOW, segment split, path
  boundary, "damage-control not isolation").

> Provenance note: compiled from the sources above and the kit's own threat-model docs. An
> automated adversarial cross-check was not completed this session (API session limit) —
> the principles are well-established; verify against the linked sources if precision matters.
