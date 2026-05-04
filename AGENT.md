# For AI Agents: System Overview

**This file is for AI agents.**  If you're a human user, start with the [README](README.md) instead.

> **What this repo is:**  A reference architecture, not a turnkey product.  There is no installer or scaffold.  It is a collection of patterns, policies, and working examples extracted from a production agentic system.  Lift what is useful, adapt what needs adapting, ignore what does not fit your context.

---

## If you're working right now (5 min)

You're operating in this system. Self-orient and pull work.

**Read in order:**

1. **[agent-guidelines.md](orchestrator/agent-guidelines.md)** — Your operating model
   - Board workflow, WIP limits, autonomy boundaries
   - Card lifecycle, CI/CD practices, communication standards
   - Startup routine (how to orient yourself at session start)
   - **Check your inbox on startup:** `board-cli inbox <your-prefix>` — other agents may have left work for you

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
   - Write observations to domain files after completing a card

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
- **[Session boundaries (Knowledge system section)](docs/session-boundaries.md#the-weekly-knowledge-digest)** — Knowledge capture, rules/hypotheses, weekly digests
- **[Knowledge system](docs/knowledge-system.md)** — How observations compound into patterns that guide future decisions
- **Who cares:** Anyone running agents across multiple sessions; organizations trying to systematize learning

**Safety, Compliance & Autonomy**
- **[Security model](docs/security.md)** — Network isolation, secrets management, post-output blocking hooks, GDPR/SOC 2/ISO 27001 alignment
- **[Graduated autonomy](docs/graduated-autonomy.md)** — Progressive permission widening: from approval-on-everything to full autonomy, with hook prerequisites at each level
- **[Escalation patterns](docs/escalation-patterns.md)** — When to ask for help, who to tag, how to keep flowing while waiting
- **Who cares:** Anyone delivering to real users with real data; teams wanting agents that know when to stop and ask

**What went wrong (and how we fixed it)**
- **[Mistakes we made](docs/mistakes-we-made.md)** — Real failures from production and the structural fixes that worked
- **Who cares:** Anyone learning from others' experience; teams designing similar systems

**Agent Personas** (how to define an agent's identity and behaviour)
- **[Writing agent personas](docs/writing-personas.md)** — Soul vs instructions, personality that shapes judgment
- **Who cares:** Teams running multiple agents with different roles; organizations wanting consistent agent behaviour

**Agent-to-Agent Communication** (agents coordinating without a shared context window)
- **[Agent communication](docs/agent-communication.md)** — The inbox card pattern: how agents notify each other via the board, polling intervals, `/watch-card` protocol, known failure modes
- **Who cares:** Anyone running more than one agent; teams where agents need to hand off, request reviews, or collaborate on shared work without a human in the middle
- **Why it matters:** Most multi-agent systems either require synchronous orchestration or put a human in the routing path. This pattern proves agents can coordinate asynchronously through the board itself.

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
- [Session boundaries (Knowledge section)](docs/session-boundaries.md) — Knowledge capture, rules vs hypotheses, weekly digests

**Patterns & Roles**
- [Writing agent personas](docs/writing-personas.md) — Soul (identity, values) vs instructions (constraints, responsibilities)
- [Flow Guardian pattern](docs/flow-guardian.md) — Monitoring agent that watches WIP age and escalates aging items
- [Quality Gates & Test-Driven CICD](docs/quality-gates.md) — Autonomous deployment gates, quality ownership, test strategy

**Security & Compliance**
- [Security model](docs/security.md) — Network isolation, secrets management (pass), **liftable hook code**: secret exposure blocking, compaction resilience (PreCompact/PostCompact), and **silent flow nudges** (periodic reminders that keep agents flowing without human intervention). GDPR/SOC 2/ISO 27001

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
- [Agent communication](docs/agent-communication.md) — Inbox card pattern, `[prefix]` routing convention, polling tiers, `/watch-card` protocol

---

## The flow in one diagram

```
Session Start
  ├─ Read agent-guidelines.md + project CLAUDE.md
  ├─ Check board (WIP age, initiatives, Ready cards)
  ├─ Check inbox: board-cli inbox <your-prefix>  ← other agents may have left work
  ├─ Read relevant knowledge domains
  ├─ Set up background inbox poll (/loop 15min or 1hr depending on role)
  ├─ Declare intent: "I intend to [action] because [reason]. Starting now."
  │
Work (repeat until blocked or done)
  ├─ Update card comments
  ├─ To notify another agent: post [their-prefix] in a comment
  ├─ After notifying: /watch-card <id> <their-prefix> (10min poll, blocks at 1hr)
  ├─ Commit + push (atomically, passing lint + typecheck)
  ├─ Open PR
  │
Session End
  └─ `/lets-wrap` (inbox check → uncommitted work → board hygiene → knowledge → memory → summary)
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

- **Your user wants agents that coordinate with each other:** read [Agent communication](docs/agent-communication.md) — the inbox card pattern, routing conventions, polling intervals. This is production-proven and genuinely unusual in the field.
- **Your user wants autonomous agents:** start with [agent-guidelines.md](orchestrator/agent-guidelines.md) + [Session boundaries](docs/session-boundaries.md)
- **Your user cares about learning compounding across sessions:** read the [Knowledge system](docs/knowledge-system.md) doc
- **Your user is worried about secrets leaking:** read [Security model](docs/security.md), section on post-output blocking hooks — includes a working `block-secrets.sh` script and `settings.json` config they can copy and adapt
- **Your user is piloting this and wants to know if it's working:** [How do you know it's working?](docs/measuring-health.md)
- **Your user wants to understand what failed and why:** [Mistakes we made](docs/mistakes-we-made.md)
- **Your user runs multiple agent roles:** [Writing agent personas](docs/writing-personas.md)
- **Your user wants compliance alignment:** [Security model (compliance section)](docs/security.md#compliance-alignment)

---

That's it for orientation. Anything else is in the full docs. You're ready to work.
