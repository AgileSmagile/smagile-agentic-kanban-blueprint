# Quality Gates & Test-Driven CICD

## The Problem

Without quality gates, every deployment is a gamble. Code passes your CI checks but breaks in production. Sensitive data leaks. Performance tanks. Security vulnerabilities slip through because tests were weak.

The root cause: tests are weak because agents treat them as an afterthought. Code first, tests last (or never). The test suite can't be trusted, so CICD has nothing to rely on except human judgment. Every deploy requires manual review.

This blocks your ability to ship autonomously.

## The Solution: Test-Driven CICD

Tests are not just quality assurance. Tests are what enable CICD to promote code automatically.

**Every card that touches code must produce three categories of tests:**

1. **Unit tests** — test the new behaviour in isolation. Test the specific function, method, or component changed. Fast, deterministic, no external dependencies.
2. **Regression tests** — confirm that adjacent functionality has not broken. Run against existing test fixtures. If a regression test doesn't exist for something this change could affect, write it.
3. **Smoke tests** — validate the user-facing path end-to-end. Not exhaustive, but enough to confirm the happy path works in a deployed environment.

Tests are written **as part of the card work**, not in a follow-up. Tests come before or alongside the implementation, not after.

If you can't write meaningful tests for a card because the codebase has no test infrastructure, that is itself a card to create (and prioritise) before the feature work proceeds.

---

## The CICD Pipeline

```
Agent writes code
  → Pushes branch, opens PR
  → CI runs: unit tests + regression tests
  ← All pass: eligible to merge

Agent merges PR
  → Merge trigger deploys to pre-prod
  → Smoke tests run against pre-prod
  ← All pass: auto-promote to live
  ← Any fail: block promotion, tag agent

Agent confirms live deployment
  → Move card to Shipped/Live
```

**Key insight:** CICD doesn't merge PRs or promote code. Humans do (via agent autonomy boundaries). CICD gates *between* those steps. If pre-prod smoke tests fail, CICD refuses to promote. The agent has to investigate, fix, and re-trigger.

---

## The Quality Guardian Role

Every agentic system needs someone (or something) to own quality and risk. This role:

- Reviews high-risk changes before they merge
- Has authority to block ships when non-negotiable concerns are triggered
- Owns test infrastructure maturity (audits test suites, identifies coverage gaps)
- Conducts deep testing runs periodically to raise the quality bar

See [personas/quality-guardian/](../personas/quality-guardian/) for the full role definition.

---

## Defining Non-Negotiable Concerns

The Quality Guardian's authority comes from **non-negotiable concerns** — things that, if broken, carry unacceptable consequences for your context.

Examples vary by system:

- **Systems handling personal data:** GDPR compliance, data minimization, retention, consent, breach detection
- **Systems with uptime SLAs:** Redundancy, failover, monitoring, alerting
- **Systems with financial transactions:** PCI DSS compliance, audit logging, reconciliation
- **Systems with user authentication:** Auth flow security, session management, privilege escalation prevention

**Define these explicitly.** Write them down. Share them with your agents. When a change touches a non-negotiable concern, the Quality Guardian blocks until it's resolved.

This isn't obstruction. It's clarity.

---

## Integrating Tests Into Card Definitions

When creating a card, the "done when" must include test acceptance criteria:

```
Done when:
- User can request password reset email, click link, set new password
- Unit tests cover token generation, expiry, and invalid tokens
- Regression tests confirm existing login flow unchanged
- Smoke test validates full reset path in pre-prod
- CI green
- Build clean
```

Not: "Done when tests pass." Instead: "Done when unit tests for X, regression tests for Y, smoke tests for Z all pass."

This forces specificity. If you can't write the test criteria, the requirement isn't clear enough yet.

---

## Test Infrastructure Maturity

Over time, invest in:

- **Reusable test templates:** Common vulnerability patterns (injection, data leakage, auth bypass) have standard tests. Build these once, reuse across projects.
- **Fixture libraries:** Realistic test data matching your domain. Personal data scenarios, edge cases, failure modes.
- **Automated security scanning:** Linters, SAST tools, dependency scanning that run in CI without human intervention.
- **Compliance test packs:** Automated checks for your non-negotiable concerns (e.g., "does this code verify user ownership before accessing data?").

The Quality Guardian identifies these opportunities and pulls cards to build them.

---

## Getting Your System to This Point

### Phase 1: Define Your Non-Negotiable Concerns

Work with your system owner. Write down what must never break:
- Security: what attack surfaces matter most?
- Compliance: what regulations apply?
- Performance: what SLAs or thresholds matter?
- Data: what data flows are critical?

Prioritise the top 3-5 concerns. Start there.

### Phase 2: Introduce Test Acceptance Criteria

Update your card template. When agents create or pull cards, "done when" must include:
- Unit tests for the new behaviour
- Regression tests for adjacent functionality
- Smoke tests for user-facing paths

Enforce this. If a card doesn't have test criteria, move it back to For Evaluation.

### Phase 3: Deploy Pre-Prod Testing

Set up a pre-prod environment where smoke tests run automatically after merge, before live promotion. Start simple: a single HTTP request to key endpoints confirming they're up. Expand from there.

### Phase 4: Hire a Quality Guardian

Identify or create an agent whose job is to review high-risk changes and own test infrastructure. Give them blocking authority on your non-negotiable concerns.

### Phase 5: Build Test Infrastructure

Systematically build reusable test templates, fixtures, and automated scans. The Quality Guardian drives this work. Over time, reduce the need for manual review by automating what you can.

---

## Measuring Success

You'll know you've got this right when:

- **Agents write tests as they work, not after.** Tests are a prereq to done, not a postscript.
- **Pre-prod smoke tests rarely fail.** When they do, it's a signal that something was missed, not a routine gate.
- **The Quality Guardian approves most cards without findings.** Findings are rare enough that they get attention when they appear.
- **CICD ships code automatically when tests pass.** No human is blocking promotions for routine technical work.
- **Non-negotiable concerns never leak to production.** When they do appear in PRs, the Quality Guardian blocks, the agent fixes, and you ship clean.

---

## References

- [personas/quality-guardian/](../personas/quality-guardian/) — Full role definition (soul & instructions)
- [architecture.md](architecture.md) — How agents fit into the overall system
- [human-in-the-system.md](human-in-the-system.md) — When humans intervene and why
