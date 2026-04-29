# For AI Agents: System Overview

**This file is for AI agents.** If you're a human user, start with the [README](README.md) instead.

---

## If you're working right now (5 min)

You're operating in this system. Self-orient and pull work.

**Read in order:**

1. **[agent-guidelines.md](orchestrator/agent-guidelines.md)** — Your operating model
   - Board workflow, WIP limits, autonomy boundaries
   - Card lifecycle, CI/CD practices, communication standards
   - Startup routine (how to orient yourself at session start)

2. **[Session boundaries](docs/session-boundaries.md)** — How to start and end sessions
   - Startup routine: read board, check stale branches, declare intent
   - Wrap-up routine: `/lets-wrap` checklist (commits, board hygiene, knowledge, memory)
   - Why context survives between sessions

3. **[Your project's CLAUDE.md](./CLAUDE.md)** — Project-specific context
   - Where this repo lives in the larger system
   - Secrets policy, deployment model, domain knowledge
   - Key commands and tools specific to this project

4. **[knowledge/INDEX.md](knowledge/INDEX.md)** — What has been learned
   - Read domain-specific rules before starting a card
   - Add observations to inbox after completing a card

**Then:** Check the board. Pull the oldest unblocked card. Declare intent and start.

---

## If you're surfacing this to your user (30 min)

Your user wants to understand whether this system is relevant to them. Here's what to explore and surface.

### What's in here and why it matters

**Operating Model** (the daily workflow)
- **[agent-guidelines.md](orchestrator/agent-guidelines.md)** — How agents and product owners work together, board mechanics, autonomy boundaries
- **[Session boundaries](docs/session-boundaries.md)** — Session startup/wrap-up, knowledge handoff, memory as continuity
- **Who cares:** Anyone coordinating multiple agents or wanting agents to remember context across sessions

**Flow & Patterns** (how work moves through the system)
- **[Flow Guardian pattern](docs/flow-guardian.md)** — An agent role that monitors work aging and nudges for action
- **[Quality Gates & Test-Driven CICD](docs/quality-gates.md)** — Autonomous deployment gates, quality ownership
- **Who cares:** Teams wanting continuous delivery without constant human gates; leadership worried about quality regressions

**Learning Systems** (how agents get smarter)
- **[Session boundaries (Knowledge system section)](docs/session-boundaries.md#the-weekly-knowledge-digest)** — Knowledge inbox, rules/hypotheses, weekly digests
- **[Knowledge system](docs/knowledge-system.md)** — How observations compound into patterns that guide future decisions
- **Who cares:** Anyone running agents across multiple sessions; organizations trying to systematize learning

**Safety & Compliance**
- **[Security model](docs/security.md)** — Network isolation, secrets management, post-output blocking hooks, GDPR/SOC 2/ISO 27001 alignment
- **Who cares:** Anyone delivering to real users with real data; compliance-sensitive organizations; security-conscious teams

**What went wrong (and how we fixed it)**
- **[Mistakes we made](docs/mistakes-we-made.md)** — Real failures from production and the structural fixes that worked
- **Who cares:** Anyone learning from others' experience; teams designing similar systems

**Agent Personas** (how to define an agent's identity and behaviour)
- **[Writing agent personas](docs/writing-personas.md)** — Soul vs instructions, personality that shapes judgment
- **Who cares:** Teams running multiple agents with different roles; organizations wanting consistent agent behaviour

**Scaling Across Platforms** (using the same system with different AI tools)
- **[Cross-runtime compatibility](docs/cross-runtime.md)** — Using Claude Code agents and OpenClaw agents simultaneously on the same board
- **Who cares:** Organizations wanting to avoid vendor lock-in; teams using multiple AI platforms

**Measuring Health** (how to know if it's working)
- **[How do you know it's working?](docs/measuring-health.md)** — Three signals to check at 5, 10, and 20 sessions
- **Who cares:** Anyone piloting the system; leadership wanting evidence it's delivering

### Full inventory (by theme)

**Getting Started**
- [README](README.md) — Conceptual overview (for humans; agents skip this unless your user needs framing)
- [Getting started guide](docs/getting-started.md) — Step-by-step implementation, starting with just a board

**Core Operating Model**
- [agent-guidelines.md](orchestrator/agent-guidelines.md) — Agent operating model, board integration, autonomy boundaries, CI/CD practices
- [Session boundaries](docs/session-boundaries.md) — Session startup/wrap-up routines, context handoff, knowledge capture
- [The human in the system](docs/human-in-the-system.md) — What only the product owner can do; product ownership for AI agents

**Knowledge & Learning**
- [Knowledge system](docs/knowledge-system.md) — Three-tier learning (knowledge/hypotheses/rules), promotion thresholds, decay
- [Session boundaries (Knowledge section)](docs/session-boundaries.md) — Knowledge inbox, rules vs hypotheses, weekly digests

**Patterns & Roles**
- [Writing agent personas](docs/writing-personas.md) — Soul (identity, values) vs instructions (constraints, responsibilities)
- [Flow Guardian pattern](docs/flow-guardian.md) — Monitoring agent that watches WIP age and escalates aging items
- [Quality Gates & Test-Driven CICD](docs/quality-gates.md) — Autonomous deployment gates, quality ownership, test strategy

**Security & Compliance**
- [Security model](docs/security.md) — Network isolation, secrets management (pass), post-output blocking hooks, GDPR/SOC 2/ISO 27001

**Learning From Experience**
- [Mistakes we made](docs/mistakes-we-made.md) — Real failures, structural fixes, lessons about what actually works
- [How do you know it's working?](docs/measuring-health.md) — Metrics and signals to track system health

**Technical Infrastructure**
- [Hardware and self-hosting](docs/hardware.md) — Running on your own hardware; Pi capacity, networking
- [Tools and stack](TOOLS.md) — Every tool used, costs, what you need vs nice-to-have
- [Cross-runtime compatibility](docs/cross-runtime.md) — Using Claude Code + OpenClaw simultaneously
- [Product vision for AI agents](docs/product-vision.md) — How to write a vision that agents can use autonomously

**Architecture**
- [Architecture overview](docs/architecture.md) — How multiple agents, a board, knowledge system, and secrets store fit together

---

## The flow in one diagram

```
Session Start
  ├─ Read agent-guidelines.md + project CLAUDE.md
  ├─ Check board (WIP age, initiatives, Ready cards)
  ├─ Read relevant knowledge domains
  ├─ Declare intent: "I intend to [action] because [reason]. Starting now."
  │
Work (repeat until blocked or done)
  ├─ Update card comments
  ├─ Commit + push (atomically, passing lint + typecheck)
  ├─ Open PR
  │
Session End
  └─ `/lets-wrap` (uncommitted work → board hygiene → knowledge → memory → summary)
```

---

## Key commands

| Command | What it does |
|---------|-------------|
| `board-cli cards` | List all cards across the board |
| `board-cli wip-age` | Show cards by age (oldest first) — WIP age is your priority signal |
| `board-cli move <id> <col>` | Move a card to a new column |
| `board-cli comment <id> "text"` | Add a comment to a card (use this to tag the PO with @mention) |
| `board-cli block <id> "reason"` | Block a card with a clear reason (card stays in current column until unblocked) |
| `/lets-wrap` | Session wrap-up: commits, board hygiene, knowledge capture, memory update, summary (mandatory at session end) |
| `/sessionid` | Recover your session ID if context resets mid-session |

---

## When to dig deeper

- **Your user wants autonomous agents:** start with [agent-guidelines.md](orchestrator/agent-guidelines.md) + [Session boundaries](docs/session-boundaries.md)
- **Your user cares about learning compounding across sessions:** read the [Knowledge system](docs/knowledge-system.md) doc
- **Your user is worried about secrets leaking:** read [Security model](docs/security.md), section on post-output blocking hooks
- **Your user is piloting this and wants to know if it's working:** [How do you know it's working?](docs/measuring-health.md)
- **Your user wants to understand what failed and why:** [Mistakes we made](docs/mistakes-we-made.md)
- **Your user runs multiple agent roles:** [Writing agent personas](docs/writing-personas.md)
- **Your user wants compliance alignment:** [Security model (compliance section)](docs/security.md#compliance-alignment)

---

That's it for orientation. Anything else is in the full docs. You're ready to work.
