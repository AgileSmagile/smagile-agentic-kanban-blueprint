---
name: ntest
description: Security penetration test + GDPR/SOC 2/ISO 27001 compliance audit. Targets a single project or the estate. Produces categorised findings, board cards, and regression tests. Invocable by any agent or the product owner.
---

# NTEST: Security and Compliance Testing

You have been asked to run a security penetration test and compliance audit. This skill walks you through a structured methodology. Do not skip sections. Do not summarise findings as "looks insecure"; every finding must be specific (file, line, endpoint, attack vector, remediation).

## Scope

Determine scope from the invocation:
- `/ntest [project-name]` — audit a single project
- `/ntest estate` — audit all active projects
- `/ntest [project-name] [area]` — audit a specific area (e.g. `/ntest my-app auth`)

If no argument is given, ask which project or whether to run estate-wide.

## Phase 0: Orientation (do this first)

1. Read the project's configuration and any test-specialist notes in the project directory.
2. Read the test specialist memory for this project (if it exists).
3. Check the audit registry for previous findings: has this project been audited before? What was found? What was fixed?
4. Read the project's existing test suite to understand what is already covered.
5. Run `git log --oneline -30` to see recent changes; focus on what has changed since the last audit.

**Output:** A brief orientation summary stating what you know, what has changed, and where you expect risk.

## Phase 1: Attack surface mapping

Enumerate the attack surface systematically:

### 1.1 API routes
- Find all API route files (patterns: `api/`, `routes/`, `pages/api/`, `app/api/`, `src/routes/`, `functions/`)
- For each route: method, path, auth requirement, what it accesses
- Flag any route without auth that accesses user data

### 1.2 Authentication mechanisms
- How does the app authenticate? (session, JWT, bearer token, URL token, access proxy, API key)
- Where is auth checked? (middleware, per-route, both)
- Are there auth bypass paths? (fallback logic, optional auth, development-only routes)

### 1.3 Data stores
- What databases/stores are used? (PostgreSQL, SQLite, key-value store, object storage, local file system)
- Is row-level security enabled? On which tables?
- Are there service role keys in use? Where?

### 1.4 External integrations
- What external APIs are called? (payment, email, webhook, AI)
- Are webhook signatures verified?
- Are API keys stored securely?

### 1.5 Client-side exposure
- What data is sent to the client? (API responses, SSR props, embedded config)
- Are there client-side secrets? (API keys in JS bundles, tokens in localStorage)
- CSP headers?

**Output:** Attack surface inventory with risk annotations.

## Phase 2: Vulnerability testing

Work through each category. For each finding, record: file path, line number(s), description, severity, attack vector, remediation.

### 2.1 Authentication and authorisation

- [ ] Auth bypass: can any endpoint be accessed without valid credentials?
- [ ] Role escalation: can a lower-role user access higher-role functionality?
- [ ] IDOR: can user A access user B's resources by manipulating IDs?
- [ ] Token handling: are tokens validated correctly? Timing-safe comparison? Expiry checked?
- [ ] Session management: secure cookies? HttpOnly? SameSite? Session fixation?
- [ ] Password handling: hashed? Salted? Bcrypt/argon2 or weaker?

### 2.2 Input validation

- [ ] SQL injection: raw user input in queries? Parameterised queries used?
- [ ] XSS: user input rendered without sanitisation? Both stored and reflected.
- [ ] Command injection: user input passed to shell commands or child_process?
- [ ] Path traversal: user input used in file paths without validation?
- [ ] SSRF: user-supplied URLs fetched server-side without allowlist?
- [ ] Request body validation: are unexpected fields stripped? Type coercion issues?

### 2.3 Data isolation

- [ ] Multi-tenant isolation: can tenant A see tenant B's data?
- [ ] Cross-site isolation (if applicable): can site A data leak to site B?
- [ ] Ownership chains: nested resources validated at each level?
- [ ] Foreign key references: client-supplied IDs verified against auth scope?
- [ ] API response filtering: are internal fields (IDs, emails, roles) leaked in responses?

### 2.4 Rate limiting and abuse

- [ ] Public endpoints: rate limited?
- [ ] Admin endpoints: rate limited?
- [ ] Token-gated routes: rate limited? Token state not leaked in error responses?
- [ ] Resource exhaustion: can a single request consume excessive memory/CPU/time?
- [ ] Batch operations: bounded? Can a user trigger unbounded work?

### 2.5 Secrets and configuration

- [ ] Hardcoded secrets in source code?
- [ ] Secrets in client-side bundles?
- [ ] .env files in git history?
- [ ] Service role keys used where anon keys would suffice?
- [ ] CORS configuration: overly permissive?
- [ ] Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy?

### 2.6 CSRF and request forgery

- [ ] State-changing operations protected by CSRF tokens?
- [ ] SameSite cookie attribute set?
- [ ] Custom headers required for mutations?

### 2.7 Error handling

- [ ] Stack traces leaked to client?
- [ ] Database errors leaked to client?
- [ ] Different error messages for "user not found" vs "wrong password"?
- [ ] Error responses include internal IDs or paths?

## Phase 3: Compliance checks

### 3.1 GDPR

- [ ] **Article 5(1)(b) — Purpose limitation:** Is data collected only for stated purposes?
- [ ] **Article 5(1)(c) — Data minimisation:** Is the minimum necessary data collected?
- [ ] **Article 5(1)(e) — Storage limitation:** Is there a data retention policy? Automated cleanup?
- [ ] **Article 6 — Lawful basis:** Is consent collected where required? Is it freely given, specific, informed?
- [ ] **Article 17 — Right to erasure:** Can user data be deleted on request? Cascade to related records?
- [ ] **Article 15 — Right of access (SAR):** Can user data be exported on request?
- [ ] **Article 25 — Data protection by design:** Is PII encrypted at rest? In transit? Minimised in logs?
- [ ] **Article 32 — Security of processing:** Covered by Phase 2 findings.
- [ ] **Article 33 — Breach notification:** Is there an audit trail sufficient to detect and report breaches within 72 hours?

### 3.2 SOC 2 (Trust Services Criteria)

- [ ] **CC6.1 — Logical access:** Are access controls enforced consistently?
- [ ] **CC6.2 — Credentials:** Are credentials stored securely? Rotated?
- [ ] **CC6.3 — Authorisation:** Is access limited to authorised users and functions?
- [ ] **CC7.1 — Monitoring:** Is there logging sufficient to detect unauthorised activity?
- [ ] **CC7.2 — Incident response:** Are alerts configured for security events?
- [ ] **CC8.1 — Change management:** Are changes tested before deployment? (CI/CD pipeline)

### 3.3 ISO 27001 (Annex A, relevant controls)

- [ ] **A.8.2 — Asset classification:** Is data classified by sensitivity?
- [ ] **A.9.1 — Access control policy:** Documented access control?
- [ ] **A.9.4 — System access control:** Technical enforcement of access control?
- [ ] **A.10.1 — Cryptographic controls:** Encryption for sensitive data?
- [ ] **A.12.4 — Logging:** Are security events logged?
- [ ] **A.14.1 — Security in development:** Are security requirements part of the development process?

## Phase 4: Findings and output

### 4.1 Categorise findings

| Severity | Definition | Board action |
|----------|-----------|--------------|
| CRITICAL | Active data exposure, auth bypass, or compliance violation with immediate customer risk | Block deploy. Escalate to the product owner and orchestrator immediately. |
| HIGH | Exploitable vulnerability or significant compliance gap, but requires specific conditions | Create card, tag orchestrator. |
| MEDIUM | Security weakness that increases attack surface but is not directly exploitable | Create card, let board prioritise. |
| LOW | Best practice deviation, defence-in-depth improvement | Create card or document in audit report. |

### 4.2 Create board cards

For each finding at MEDIUM or above:
1. Create a card on the project's board with severity in the title
2. Description must include: finding, evidence, risk, suggested fix
3. Link to the audit initiative

For CRITICAL findings, also:
- Post an escalation comment on the initiative card for the orchestrator
- If the fix is straightforward, write it yourself and open a PR

### 4.3 Write regression tests

For every confirmed vulnerability (not just compliance gaps):
- Write a regression test that will fail if the vulnerability is reintroduced
- Use static source analysis (read file, assert pattern) where possible
- Reference the finding card number in the test description
- Place in the project's existing test directory

### 4.4 Update audit registry

Update the test specialist's memory with:
- Findings summary
- Comparison to previous audit (if exists): what is new, what is fixed, what has regressed
- Updated maturity ranking if significant changes

### 4.5 Summary

End with a structured summary:

```
## NTEST Summary: [project] — [date]

**Scope:** [what was tested]
**Previous audit:** [date or "none"]
**Changes since last audit:** [key changes]

**Findings:**
- CRITICAL: [count] — [one-line each]
- HIGH: [count] — [one-line each]
- MEDIUM: [count]
- LOW: [count]

**Compliance status:**
- GDPR: [pass/gaps]
- SOC 2: [pass/gaps]
- ISO 27001: [pass/gaps]

**Regression tests written:** [count]
**Cards created:** [list card numbers]

**Delta from last audit:** [improved/degraded/stable] — [key changes]

**Top 3 priorities for remediation:**
1. [finding]
2. [finding]
3. [finding]
```

## Rules

- Every finding must be specific: file path, line number, attack vector, remediation.
- Do not report findings that have already been fixed (check git history and existing tests).
- Do not weaken or delete existing tests.
- CRITICAL compliance findings are always blocking. Full stop.
- If you find a vulnerability that is actively exploitable in production, escalate immediately; do not wait for the full audit to complete.
- Check for drift: if the codebase has changed significantly since the last audit, note which previous findings need re-verification.
- This is not a theoretical exercise. Read the actual code. Test the actual endpoints. Verify the actual database schema.
