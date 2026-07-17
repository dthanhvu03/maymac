# Security review reference — OWASP, CWE, threat modeling

Loaded on demand by the `security-review` skill (progressive disclosure). Compiled from
the authoritative sources listed at the end.

## 1. Method — think like an attacker, be concrete
For each change: map the **attack surface**, then for each risk write a **concrete exploit
scenario** (specific input/state → bad outcome), not a vague concern. A finding without a
plausible exploit path is a note, not a vulnerability. Manual review exists to catch what
scanners miss: business-logic flaws, authorization gaps, race conditions, crypto misuse.

## 2. STRIDE — six threat categories to walk a change through
- **S**poofing — can someone pretend to be another user/service? (auth, tokens)
- **T**ampering — can data/requests be modified in transit or at rest?
- **R**epudiation — can an action be denied because it isn't logged?
- **I**nformation disclosure — can secrets/PII leak (errors, logs, responses)?
- **D**enial of service — can input exhaust CPU/memory/connections?
- **E**levation of privilege — can a user do something they shouldn't?

## 3. OWASP Top 10 (2021) — prioritized checklist
1. **A01 Broken Access Control** *(#1)* — every sensitive action re-checks the caller is
   authorized for THIS resource; no IDOR (trusting a client-supplied id); deny by default;
   server-side enforcement (never rely on hidden UI).
2. **A02 Cryptographic Failures** — no hard-coded/logged secrets; TLS in transit; strong,
   standard algorithms (no home-grown crypto); sensitive data encrypted at rest; proper
   password hashing (bcrypt/argon2, salted).
3. **A03 Injection** — SQL/NoSQL/OS-command/LDAP built by string concatenation; XSS from
   unescaped output. Use parameterized queries / prepared statements; escape on output;
   allow-list input.
4. **A04 Insecure Design** — missing rate limits, abuse cases, or a threat model for the
   feature itself.
5. **A05 Security Misconfiguration** — debug/verbose errors in prod, permissive CORS,
   default credentials, unnecessary features enabled.
6. **A06 Vulnerable & Outdated Components** — new dependency vetted, pinned, and from a
   trusted source; known CVEs checked.
7. **A07 Identification & Authentication Failures** — session fixation, weak/missing MFA,
   credential stuffing exposure, insecure "remember me".
8. **A08 Software & Data Integrity Failures** — unsafe deserialization, unsigned/unverified
   updates or CI artifacts.
9. **A09 Security Logging & Monitoring Failures** — security events logged; secrets and
   PII NOT logged; logs tamper-evident where it matters.
10. **A10 Server-Side Request Forgery (SSRF)** — user-controlled URLs fetched server-side;
    allow-list destinations, block internal ranges.

## 4. Highest-frequency dangerous coding patterns (CWE)
- **CWE-89 SQL Injection**, **CWE-78 OS Command Injection**, **CWE-79 XSS** — untrusted
  input reaching an interpreter.
- **CWE-22 Path Traversal** — user input in file paths (`../`).
- **CWE-352 CSRF** — state-changing requests without anti-CSRF.
- **CWE-434 Unrestricted Upload** — file type/size not validated.
- **CWE-798 Hard-coded Credentials**, **CWE-200 Sensitive Data Exposure**.
- **CWE-502 Unsafe Deserialization**, **CWE-918 SSRF**, **CWE-190 Integer Overflow**.
(See the CWE Top 25 for the current ranked list.)

## 5. Depth for higher assurance (OWASP ASVS)
For anything auth/payment/PII, review against **ASVS** verification requirements (levels
L1 basic → L3 high-assurance): authentication, session management, access control, input
validation, cryptography, error handling & logging, and data protection.

## 6. Output discipline
Rank risks by severity with a concrete exploit and evidence (file:line). Position the
guard honestly: the kit's `guard-shell` hook is damage-control for honest mistakes, NOT
isolation — the real boundary is the OS sandbox. Flag any guardrail gap explicitly.

---

## Sources
- OWASP Top 10:2021. https://owasp.org/Top10/2021/
- OWASP Application Security Verification Standard (ASVS).
  https://owasp.org/www-project-application-security-verification-standard/
- OWASP Secure Code Review Cheat Sheet.
  https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
- MITRE CWE Top 25 Most Dangerous Software Weaknesses. https://cwe.mitre.org/top25/
- Microsoft STRIDE threat modeling (Threat Modeling: Designing for Security, Shostack).
  https://learn.microsoft.com/azure/security/develop/threat-modeling-tool-threats

> Provenance note: the OWASP Top 10:2021 ranking used here (A01 Broken Access Control …
> A03 Injection … A10 SSRF) was verified against owasp.org/Top10/2021 on 2026-07-16.
> STRIDE, the CWE Top 25, and OWASP ASVS are standard OWASP/MITRE frameworks — verify
> against the linked sources if precision matters.
