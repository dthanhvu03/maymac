---
name: security-review
description: Use when a change touches auth, secrets, shell/command execution, file access, or the guard/hooks. Invoke for a risk assessment with concrete exploit scenarios and fixes.
license: Apache-2.0
compatibility: Requires repository read access and git.
metadata:
  sixmen-version: "1.0.0"
  sixmen-trust-tier: "T0"
  sixmen-owner: platform-team
---

# Security Review skill

Assess the security impact of a change. Be concrete about how it could be abused.

Work from **[references/security-guide.md](references/security-guide.md)** — the STRIDE
categories, the OWASP Top 10 (2021) prioritized checklist (access-control first), the CWE
high-frequency patterns, and the ASVS depth cues — as your checklist, not memory.

## Workflow
1. Map the **attack surface** the change adds or widens (inputs, commands run, files/paths read or written, network calls, secrets in scope). Walk it through **STRIDE** and the **OWASP Top 10** (§2–§3 of the reference).
2. For each risk, write a concrete **exploit scenario** (inputs/state → bad outcome), not a vague concern.
3. Check the guardrails: does the guard/hook actually block this, or is it only a markdown rule? Note gaps.
4. Recommend fixes and the tests that would prove them.

## Output format (required)
```md
## Attack surface
## Risks
| Severity | Risk | Evidence (file:line) | Exploit scenario | Fix |
|---|---|---|---|---|
## Guardrail gaps
## Recommended tests
## Verdict (safe to ship / fix first)
```
Position the guard honestly: hooks are damage-control, not isolation — the real boundary is the OS sandbox.
