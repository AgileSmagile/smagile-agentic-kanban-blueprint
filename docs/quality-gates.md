# Quality Gates & Test-Driven CICD

## The Problem

Without quality gates, every deployment is a gamble. Code passes your CI checks but breaks in production. Sensitive data leaks. Performance tanks. Security vulnerabilities slip through because tests were weak.

The root cause: tests are weak because agents treat them as an afterthought. Code first, tests last (or never). The test suite can't be trusted, so CICD has nothing to rely on except human judgment. Every deploy requires manual review.

This blocks your ability to ship autonomously.

## The Solution: Test-Driven CICD

Tests are not just quality assurance. Tests are what enable CICD to promote code automatically.

**Every card that touches code must produce three categories of tests:**

1. **Unit tests**: test the new behaviour in isolation. Test the specific function, method, or component changed. Fast, deterministic, no external dependencies.
2. **Regression tests**: confirm that adjacent functionality has not broken. Run against existing test fixtures. If a regression test doesn't exist for something this change could affect, write it.
3. **Smoke tests**: validate the user-facing path end-to-end. Not exhaustive, but enough to confirm the happy path works in a deployed environment.

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

The Quality Guardian's authority comes from **non-negotiable concerns**: things that, if broken, carry unacceptable consequences for your context.

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

## Cross-Agent Review Triggers

The [graduated autonomy](graduated-autonomy.md) model defines when agents need the **human's** involvement (Tier 1 auto-merge, Tier 2 confirm, Tier 3 full review). This section defines when agents need **each other's** involvement. These are complementary dimensions, not alternatives.

**The principle:** most work ships without cross-agent review. Mechanical sentinels (auth coverage, RLS verification, secret exposure scanning, dependency audits) catch the majority of security regressions automatically at commit time. Cross-agent review is reserved for changes where automated gates cannot assess correctness: architectural decisions, cross-project contracts, compliance judgment calls, and business logic in high-risk domains.

### When to tag the Quality Guardian

Tag for review when your card:
- Adds or modifies authentication, session handling, or authorisation logic
- Adds a database migration (new table, altered access policies, schema change)
- Changes an API contract consumed by another project
- Touches billing, payment, or subscription flows
- Handles personal data (collection, storage, processing, or deletion)
- Adds a new external integration or webhook handler

### When to tag the Orchestrator

Tag for review when your card:
- Changes something that affects another project's work (shared API, shared dependency, environment variable)
- Adds a new external dependency (package, SaaS integration, infrastructure component)
- Makes an architectural decision not covered by existing documentation
- Proposes to deviate from an established pattern in the operating model

### When no tag is needed

- All mechanical sentinels pass
- Change is within your project's existing patterns and conventions
- No cross-project impact
- Card qualifies for Tier 1 auto-merge

### Tiered review model (complete picture)

| Dimension | Tier 1 (auto) | Tier 2 (confirm) | Tier 3 (full review) |
|---|---|---|---|
| **Human involvement** | None (CI green, small diff) | Confirm before merge | Card goes through Done column |
| **Quality Guardian** | None (sentinels pass) | Tag in card comment | Three Amigos before build starts |
| **Orchestrator** | None (single-project scope) | Tag in card comment | Architecture discussion on card |

A card can be Tier 1 for human involvement but Tier 2 for the Quality Guardian (e.g. a small auth change that passes CI but touches session handling). The tiers are independent.

### What happens after tagging

The tagged agent picks up the request via their inbox. They respond on the card with approval or findings. If findings are blocking, they create follow-up cards or block the original. If the tagged agent is not running, the watch-card pattern applies (auto-block after the configured timeout with a comment for the human).

### Mechanical sentinels: the first line of defence

Before cross-agent review even comes into play, mechanical sentinels catch the most common regressions at commit time. These are tests that enforce architectural invariants, not behaviour:

- **Route auth coverage:** scans all API routes, verifies each has authentication or is explicitly exempted with a documented reason. A new route without auth fails pre-commit.
- **RLS verification:** scans database migrations, verifies every table has row-level security enabled. A new table without RLS fails pre-commit.
- **Secret exposure:** scans source files for patterns matching hardcoded API keys, tokens, and credentials. A pasted secret fails pre-commit.
- **Dependency audit:** runs security audit on dependencies. Critical vulnerabilities block the commit.

These sentinels are not tests for what the code does. They are tests for what the code must always be true of. The policy is the code.

---

## The Regression Gate: Skill Injection After Tests Pass

Sentinels catch what is missing. The review-trigger hook reminds agents to tag reviewers. But neither addresses the gap between "tests pass" and "tests are good enough." An agent can write sentinel tests that grep for auth middleware patterns, pass the gate, and ship code with authorisation bypasses that only a behavioural test would catch.

The regression gate closes this gap with a **skill injection pattern**: a hook that fires after tests pass, detects modified API routes in the diff, and injects a structured skill that walks the agent through six security vectors.

### How it works

```
Agent modifies API routes → runs tests → tests pass
  → PostToolUse hook fires
  → Hook checks: route files in diff? regression tests already added?
  → If route files present and no regression tests: inject prompt
  → Agent invokes regression-gate skill
  → Skill walks through 6 vectors per route:
      1. Cross-user/cross-tenant data isolation
      2. Resource ownership chains
      3. Role enforcement
      4. Auth enforcement
      5. Input validation on security boundaries
      6. Token-gated routes
  → Agent writes regression tests, documents coverage on card
  → Hook sees regression tests in diff → does not fire again
```

### Why skill injection, not just a hook

A hook can remind. A skill can guide. The regression gate skill doesn't just say "write regression tests"; it walks the agent through each vector with specific checks, specific test patterns, and explicit skip-with-reason requirements. This matters because:

- **Agents don't know what they don't know.** Without the vectors, an agent writes the tests it thinks of, which are the obvious ones. The non-obvious vectors (ownership chains, token opacity, input validation on foreign keys) are exactly the ones that sentinel tests miss.
- **The skill makes quality reproducible.** Every agent, every session, same vectors, same rigour. The quality of regression testing does not depend on the agent's experience or attention level.
- **Skip-with-reason forces deliberate choices.** The skill requires agents to document why a vector does not apply, not just skip it silently. This creates an audit trail and catches lazy skipping.

### Reference implementation

- **Hook:** [`regression-gate-trigger.sh`](../hooks/regression-gate-trigger.sh) (PostToolUse, fires once per session)
- **Skill:** [`skills/regression-gate/SKILL.md`](../skills/regression-gate/SKILL.md) (6 vectors, test patterns, documentation requirements)

### Defence in depth (complete picture)

| Layer | Mechanism | When | What it catches | Blocking? |
|-------|-----------|------|-----------------|-----------|
| Policy | Agent guidelines | Session start | Sets expectations | No |
| Awareness | Review trigger hook | Every N tool calls | Reminds to tag reviewer | No |
| Regression | Regression gate skill | After tests pass + route changes | Missing security regression tests | Soft (agent must invoke) |
| Enforcement | Sentinel tests | Pre-commit | Missing auth, missing RLS, exposed secrets | Yes |
| Assurance | Quality Guardian review | Before merge (tagged) | Architectural and logic gaps | Yes (blocking authority) |

The regression gate sits between awareness and enforcement. It is harder to ignore than a reminder but softer than a pre-commit block. This is deliberate: it gives the agent the structured guidance to do the right thing, rather than just blocking the wrong thing.

## Mechanical Enforcement

Policy documentation (CLAUDE.md, agent guidelines) tells agents what to do. Mechanical gates stop them when they don't. Both are needed; when they conflict, the mechanic wins.

The reference implementation uses:
- **Husky** for committed git hooks (survives clone, auto-installs via `npm install`)
- **Pre-commit**: typecheck (`tsc --noEmit`)
- **Pre-push**: test suite (vitest/jest)
- **Coverage thresholds** in test config (ratchet: set below baseline, raise over time)
- **CI** as the authoritative gate (same checks, cannot be bypassed)

See `knowledge/quality-engineering/rules.md` for the full rule set. See `knowledge/quality-engineering/knowledge.md` for the observations that drove these rules.

---

## References

- [test-depth-model.md](test-depth-model.md): Five-level test depth model and agentic-specific testing practices
- [review-trigger-hook.md](review-trigger-hook.md): Context-aware hook that reminds agents to tag reviewers during development
- [skills/regression-gate/](../skills/regression-gate/): Skill that walks agents through 6 security vectors for modified API routes
- [personas/quality-guardian/](../personas/quality-guardian/): Full role definition (soul & instructions)
- [architecture.md](architecture.md): How agents fit into the overall system
- [human-in-the-system.md](human-in-the-system.md): When humans intervene and why
