# Security Model

AI agents that can execute shell commands, read and write files, access APIs, and interact with external services are a fundamentally different security surface from a chatbot that answers questions. This document covers the security posture for an agentic delivery system: network isolation, secrets management, agent-specific threat modelling, compliance alignment, and code quality practices that reduce risk.

Parts of this model were informed by the [OpenClaw security documentation](https://docs.openclaw.ai/gateway/security), which is worth reading in full if you're running agents via that gateway.

## Threat model: what agents can do

Before anything else, be honest about the attack surface. An AI agent in this system can:

- Execute arbitrary shell commands
- Read and write files on the local filesystem
- Make HTTP requests to internal and external services
- Interact with APIs using stored credentials
- Create and push git commits
- Send messages via Discord or other communication channels
- Interact with the Kanban board (create cards, move cards, add comments)

This is powerful. It's also dangerous if the boundaries are wrong. The security model exists to make autonomous operation safe by default, not to prevent agents from being useful.

## Core principle: access control before intelligence

This framing comes from the [OpenClaw security model](https://docs.openclaw.ai/gateway/security) and is worth internalising:

> Most failures here are not fancy exploits; they're "someone messaged the bot and the bot did what they asked."

The defence layers, in priority order:

1. **Identity**: who (or what) can talk to the agent?
2. **Scope**: what is the agent allowed to do?
3. **Model**: assume the model can be manipulated; design so manipulation has limited blast radius.

Prompt-level instructions ("never reveal secrets") are the weakest layer. They help, but they're not a security boundary. The real boundaries are network isolation, filesystem permissions, tool restrictions, and the secrets architecture.

## Network isolation

### The DMZ pattern for self-hosted agents

If you're running agents on self-hosted hardware (Raspberry Pi, home server, VPS), network isolation is your first line of defence.

The production system this blueprint was extracted from runs agent infrastructure on a Raspberry Pi 5, isolated on a **guest network** with the following configuration:

- **Guest network segment**: the Pi sits on the guest WiFi/VLAN, separated from the primary home/office network. Devices on the guest network cannot reach devices on the primary network.
- **Access point disabled**: the Pi's onboard WiFi AP is disabled to prevent it from being used as a bridge between network segments.
- **Inbound access via tunnel only**: no ports are opened on the router. All inbound traffic reaches the Pi through [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), which terminate TLS at Cloudflare's edge and forward to the Pi over an outbound-only connection.
- **Firewall (ufw)**: the Pi's firewall allows only SSH from the local network segment and outbound HTTPS. Everything else is denied by default.

This creates a DMZ: the Pi can reach the internet (for API calls, git push, tunnel connectivity) but is isolated from the internal network. If the Pi is compromised, the blast radius is limited to the Pi itself and the services it can reach over the internet.

```
Internet
   │
   ├── Cloudflare Tunnel (TLS terminated at edge)
   │        │
   │   ┌────┴────┐
   │   │  Pi 5   │  ← Guest network (isolated VLAN)
   │   │  (DMZ)  │  ← No access to primary network
   │   └─────────┘  ← ufw: SSH local only, outbound HTTPS only
   │
   ├── Primary network (laptops, phones, NAS)
   │        ↑
   │        └── Cannot reach guest network
```

### Docker port publishing and firewall bypass

A common gotcha: Docker's port publishing (`-p HOST:CONTAINER`) bypasses host firewall rules (including `ufw`). Published ports are routed through Docker's own iptables chains, which are evaluated before `INPUT` rules.

**Fix**: enforce allowlist rules in the `DOCKER-USER` chain, which is evaluated before Docker's accept rules. See the [OpenClaw security docs](https://docs.openclaw.ai/gateway/security) for a worked example.

### Recommendations

- Self-hosted agent infrastructure belongs on an isolated network segment
- Prefer tunnel-based ingress (Cloudflare Tunnels, Tailscale Serve) over opening firewall ports
- Disable any unnecessary network interfaces (WiFi AP, Bluetooth)
- Test your firewall rules from outside the segment, not just from the host itself
- If using Docker, audit your `DOCKER-USER` chain

## Secrets management

### Why `pass` over scattered `.env` files

The production system uses [pass](https://www.passwordstore.org/) (the standard Unix password manager) as the single secrets store, rather than `.env` files per project.

**The problem with `.env` files:**

- Secrets are scattered across multiple directories, each with different ownership
- Every project has its own `.env` with its own copy of shared credentials
- Rotating a secret means updating N files across N projects
- A single `git add .` accident can commit secrets to version control
- Agents that can read files can read `.env` files; the more copies, the more exposure
- No encryption at rest; credentials sit in plaintext on disk

**Why `pass` is better:**

- **Single store, GPG-encrypted at rest.** One directory (`~/.password-store/`), encrypted per-entry with GPG. Even if the filesystem is accessed, secrets are cipherless without the GPG key.
- **Structured hierarchy.** `pass show businessmap/api-key` is self-documenting. No grepping through `.env` files to find which variable holds which credential.
- **One rotation point.** Update the secret once in `pass`; a sync script propagates to `.env` files where runtime tools require them.
- **Audit trail.** `pass` backs the store with git. Every secret change is a commit with a timestamp.
- **Agent-compatible.** Agents can run `pass show <path>` to retrieve a secret at runtime without the value ever appearing in a file the agent can `cat`.

**The pattern:**

```
pass (encrypted, single source of truth)
  │
  └── bin/sync-env (populates .env files for tools that need them)
        │
        ├── project-a/.env (gitignored, runtime only)
        ├── project-b/.env (gitignored, runtime only)
        └── ...
```

`.env` files are treated as runtime artefacts, not as the source of truth. They're gitignored, populated by a sync script, and can be regenerated at any time. The real secrets live in `pass`.

### Agent secret disclosure prevention

AI agents are language models. Their natural behaviour is to be helpful, which includes outputting information when asked. This makes them a disclosure risk for any secret they can access.

**The layered approach:**

1. **Instruction-level** (weakest, but still valuable):
   - "Never display, print, echo, or include secret values in output"
   - "Reference by variable name only"
   - "If debugging requires confirming a value is set, check its length, never the full value"

2. **Architecture-level** (stronger):
   - Secrets live in `pass`, not in files agents routinely read
   - `.env.example` files document expected variables without values
   - Agents are instructed to read `.env.example` to understand variables, not `.env`
   - The sync script runs outside agent sessions; agents don't need to know how secrets get into `.env`

3. **Detection-level** (backstop):
   - Pre-push security scan greps for hardcoded secret patterns (high-entropy strings, known key prefixes like `sk_`, `ghp_`, `supabase_`)
   - Conversation review: the "never display" instruction exists because credentials were exposed in a conversation once. The rotation cost across multiple systems and agents was significant. Prevention is cheaper than rotation.

4. **Blast radius reduction**:
   - Agents operate in project-scoped directories, not from the home directory
   - File access is bounded by the project scope; agents don't have reason to traverse to other projects' `.env` files
   - Sandbox mode (for OpenClaw agents) can restrict filesystem access to read-only or none

**The incident that drove this policy:** early in the system's development, an agent outputted credentials in conversation output. Rotating those credentials required updates across multiple services, agents, and CI/CD pipelines. The secrets policy is now the first non-negotiable in every CLAUDE.md and instructions file. It exists because the alternative is expensive.

### Recommendations

- Use an encrypted secrets manager (`pass`, Vault, 1Password CLI) as the single source of truth
- Treat `.env` files as disposable runtime artefacts, not as secrets storage
- Include explicit "never display secrets" instructions in every agent's system prompt
- Run pre-push scans for secret patterns
- When a secret is exposed, rotate immediately; don't assume the exposure was limited

## Compliance alignment

This system was designed with awareness of three compliance frameworks. None are formally certified (certification requires organisational processes beyond an operating model), but the design choices are aligned with their principles.

### GDPR

GDPR compliance is treated as non-negotiable for anything that touches personal data.

**Design choices:**

- **Multi-tenant architecture with row-level security (RLS).** Every database table that contains user data has RLS policies enforced at the Postgres level. No cross-tenant data leakage is possible under any application code path, including bugs, because the database itself enforces isolation.
- **Data minimisation.** Only collect and store data needed for the feature. No speculative data hoarding.
- **Right to deletion.** Account deletion must be a complete operation: user data, generated content, analytics, and any derived data. This is tested, not assumed.
- **Right to export.** Users can export their data in a portable format.
- **Encryption in transit.** All external communication over TLS. Cloudflare Tunnels enforce this for self-hosted services.
- **Encryption at rest.** Secrets in `pass` (GPG-encrypted). Database credentials scoped to minimum required access.
- **Agent constraint.** Agents are explicitly instructed that GDPR compliance is non-negotiable. Any feature that touches personal data must account for consent, minimisation, and deletion from the design phase, not bolted on after.

### SOC 2 alignment

SOC 2 is organised around five trust service criteria. The operating model addresses several:

| Criteria | How this system aligns |
|----------|----------------------|
| **Security** | Network isolation (DMZ), encrypted secrets, pre-push security scans, autonomy boundaries preventing agents from deploying without approval |
| **Availability** | Health monitoring (UptimeRobot), blue-green deploys with health-check gates, zero-downtime deploy patterns |
| **Processing integrity** | Board as single source of truth, atomic commits, CI/CD pipeline as quality gate, fail-first TDD |
| **Confidentiality** | Secrets policy (never display), encrypted at rest, RLS at database level, agent scope boundaries |
| **Privacy** | GDPR alignment (see above), data minimisation, right to deletion |

**Gaps to be aware of:** SOC 2 requires formal policies, access reviews, incident response procedures, and audit logging beyond what an operating model alone provides. The technical controls here support SOC 2, but organisational processes are needed for actual compliance.

### ISO 27001 alignment

ISO 27001's Annex A controls that this system addresses:

- **A.5 (Organisational controls):** Autonomy boundaries define who can do what. The operating model is the documented policy.
- **A.7 (Human resource security):** Onboarding agents with persona files and explicit constraints is the AI equivalent of security awareness training.
- **A.8 (Asset management):** SAM (Software Asset Management) register tracks all software assets, subscriptions, and costs. Hardware reference tracks physical infrastructure.
- **A.9 (Access control):** Secrets managed centrally, agents scoped to project directories, deployment requires confirmation.
- **A.12 (Operations security):** Pre-push security scans, CI/CD pipeline, vulnerability management via code health workflows.
- **A.14 (System development):** Fail-first TDD, atomic commits, branch strategy, code review via PRs.

**Reality check:** ISO 27001 certification requires an ISMS (Information Security Management System), risk assessments, and regular audits. This operating model provides the technical foundation but not the management framework.

## Code quality as a security practice

### Test-driven development (TDD)

TDD is not just a development practice; it's a security practice. Untested code is unverified code. In an agentic system, where AI writes the code, TDD is the primary mechanism for ensuring the code does what was intended, not just what the model hallucinated.

**The fail-first sequence (non-negotiable):**

1. Write the test(s) describing the expected behaviour
2. Run tests; **confirm they fail.** This step is critical. If a test passes without implementation, it's testing nothing. In an agentic context, this is the difference between "the agent wrote a test that validates the requirement" and "the agent wrote a test that mirrors its own output."
3. Write the implementation
4. Run tests; confirm they pass
5. Refactor if needed; tests must still pass

**Why step 2 matters more for AI agents than humans:** A human developer knows when they're writing implementation before tests. An AI agent might generate tests after (or alongside) implementation and produce tests that merely confirm what the code does rather than validate what it should do. The fail-first requirement is the structural check against this.

**Coverage expectations:**

- All new logic gets tests
- All bug fixes get a regression test (proves the bug existed, proves it's fixed)
- Tests run before every commit (locally) and on every PR (CI)
- Failing tests block merge; they are never deleted to make CI green

### Refactoring

Refactoring is a continuous practice, not an event. Agents are instructed to "regularly look for refactoring opportunities across the whole codebase" as part of normal delivery.

**Refactoring in an agentic context:**

- Agents can spot patterns that humans miss (repeated code across files, inconsistent naming, dead code paths) because they read the entire codebase per session
- Refactoring cards go through the same workflow: card, branch, tests, PR, CI, merge
- Refactoring without tests is not refactoring; it's editing. The test suite must pass before and after.
- The `/simplify` skill (in Claude Code) reviews changed code for reuse, quality, and efficiency, then fixes issues found. This is a lightweight refactoring pass integrated into the delivery flow.

### Pen testing

Security testing is built into the delivery cycle, not treated as a periodic external activity.

**Continuous practices:**

- **Pre-push security scan**: every branch push checks for npm vulnerabilities (HIGH/CRITICAL), hardcoded secret patterns, `eval()` usage, `dangerouslySetInnerHTML`, and accidentally committed `.env` files. FAIL = blocked.
- **Dependency audit**: `npm audit` runs as part of the code health workflow (daily + on push). Vulnerabilities are surfaced as board cards and tracked through the normal workflow.
- **OWASP top 10 awareness**: agents are instructed to avoid introducing common web application vulnerabilities from the [OWASP](https://owasp.org) (Open Worldwide Application Security Project) list, including command injection, XSS (cross-site scripting — where malicious code is injected into web pages viewed by other users), and SQL injection. This is instruction-level defence, reinforced by code review in PRs.

**Periodic practices:**

- **Pen test reports**: produced as part of security-focused cards. These assess the full attack surface: public endpoints, authentication flows, authorisation boundaries, data exposure, infrastructure access.
- **Vulnerability resolution**: surfaced vulnerabilities get cards, go through the workflow, and have explicit acceptance criteria. "Vulnerability exists but no fix available" is documented and blocked, not ignored.

**What agents test:**

- Authentication and authorisation boundaries (can user A access user B's data?)
- API endpoints (are all routes behind appropriate auth middleware?)
- Input validation (are user inputs sanitised before database queries or rendering?)
- Secret exposure (does any code path, log, or error message leak credentials?)
- Infrastructure (are ports, services, and firewall rules as expected?)

## Prompt injection awareness

Prompt injection is not a solved problem. No amount of system prompt hardening eliminates the risk of a model being manipulated by crafted input.

The [OpenClaw security model](https://docs.openclaw.ai/gateway/security) puts it well: prompt injection mitigations are not about preventing injection; they're about reducing blast radius.

**Practical measures:**

- **Scope tools tightly.** An agent that can only read files and run tests has a smaller blast radius than one with full shell access.
- **Treat external content as hostile.** Web pages, emails, pasted code, attachments, and log files can all carry injection payloads. Even if only you message the agent, the content it reads is a threat surface.
- **Model choice matters.** Larger, more recent models are more resistant to instruction hijacking. If using smaller models (for cost or latency), reduce their tool access.
- **Sandbox where possible.** OpenClaw supports Docker-based sandboxing per agent. Claude Code's permission model restricts tool access. Use both.
- **Secrets out of reach.** Don't put secrets in agent system prompts. Don't put secrets in files agents routinely read. Use `pass` or an equivalent, and let agents retrieve at runtime only when needed.

## Security checklist

For anyone adapting this blueprint, a minimum-viable security posture:

### Network
- [ ] Agent infrastructure on isolated network segment (guest VLAN, DMZ)
- [ ] No ports opened on the router; inbound via tunnel only
- [ ] Firewall configured and tested from outside the segment
- [ ] Docker `DOCKER-USER` chain audited if using published ports
- [ ] Unnecessary network interfaces disabled (WiFi AP, Bluetooth)

### Secrets
- [ ] Encrypted secrets manager as single source of truth
- [ ] `.env` files are gitignored and treated as runtime artefacts
- [ ] Every agent's system prompt includes "never display secrets"
- [ ] Pre-push scan for hardcoded secret patterns
- [ ] Secret rotation procedure documented and tested

### Agent boundaries
- [ ] Autonomy boundaries explicitly documented (can/should confirm/must not)
- [ ] Agents scoped to project directories, not home directory
- [ ] Deployment requires human confirmation
- [ ] Destructive operations (delete, force push) require human confirmation

### Compliance
- [ ] RLS on all multi-tenant database tables
- [ ] Data deletion tested end-to-end
- [ ] Data export capability exists
- [ ] All external communication over TLS
- [ ] Asset registers (SAM, hardware) maintained and current

### Code quality
- [ ] Fail-first TDD enforced (tests must fail before implementation)
- [ ] CI pipeline runs on every PR; merge blocked until green
- [ ] Pre-push security scan integrated into workflow
- [ ] Dependency vulnerabilities tracked as board cards
- [ ] Pen test reports produced for security-sensitive changes

### Monitoring
- [ ] External uptime monitoring for all public services
- [ ] Health check endpoints on all self-hosted services
- [ ] Alerting configured for downtime and anomalies
