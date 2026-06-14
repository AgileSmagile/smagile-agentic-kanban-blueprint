# Estate Knowledge — Global

This file contains infrastructure, tooling, and practices that apply to every agent regardless of project.  It is the top tier of a three-tier hierarchy:

1. **This file** (global): shared infra, tooling, operating practices
2. **`estate/<domain>.md`** (domain): account-specific state per product/service
3. **Project `CLAUDE.md`** (leaf): inherits from global + relevant domain file

An agent reads three files and has full infrastructure context.

## Infrastructure

<!-- Fill in your own infrastructure details -->

| Component | Location | Purpose |
|-----------|----------|---------|
| Secrets manager | `pass` on [host] | Single source of truth for all credentials |
| Board tool | [tool] board [ID] | Work state, coordination, communication |
| CI | GitHub Actions | Checks only (lint, typecheck, tests). Never deployment. |
| Automation | [n8n / Zapier / etc.] on [host] | Workflow automation, webhooks, scheduled jobs |

## CI/CD

<!-- Document your deploy model here -->

| Project | Host | Method | Auto-deploy? |
|---------|------|--------|-------------|
| example-app | [host] | `bin/deploy` | No — manual dispatch |

**Rule:** CI tools run checks.  Deployment is a separate step from a known machine.  This is permanent, not a workaround.

## Security hooks

<!-- List your hooks and their fail mode -->

| Hook | Event | Fail mode |
|------|-------|-----------|
| `block-secrets.sh` | PreToolUse, PostToolUse | Closed (blocks on parse failure) |
| `retry-loop-detector.sh` | PostToolUse | Open (observation only) |
| `flow-nudges.sh` | PostToolUse | Open (observation only) |

**Design rule:** PreToolUse hooks fail closed.  PostToolUse hooks fail open.  See [security.md](docs/security.md#hook-design-principle-fail-closed).

## Agent communication

<!-- Document your routing convention -->

Comment prefix convention: `[TargetAgent]` in card comments triggers routing to the target.

## Quality standards

<!-- Document your non-negotiable quality practices -->

- Fail-first TDD: tests must fail before implementation
- Pre-push security scan: blocks on HIGH/CRITICAL vulnerabilities
- Atomic commits: stage and commit in a single shell call, name files explicitly

## Domain estate files

<!-- List your domain files and what they cover -->

| Domain | File | Scope |
|--------|------|-------|
| example-product | `estate/example.md` | Accounts, secrets paths, deploy targets, board columns |

---

## Pending

<!-- Agents: append infrastructure discoveries here. The orchestrator curates on session start. -->
