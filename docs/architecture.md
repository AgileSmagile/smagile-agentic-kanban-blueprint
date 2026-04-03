# System Architecture

## Overview

This is a multi-orchestrator model with shared global resources. There is no single hub. Multiple orchestrators, potentially running on different runtimes and different machines, each manage their own domain while sharing the same board, knowledge system, and secrets infrastructure.

The Kanban board and the knowledge system are the coordination layers. They don't belong to any single orchestrator; they belong to the system.

```
                ┌───────────────────────────────────────────────────┐
                │                 Shared Resources                  │
                │                                                   │
                │  ┌────────────────┐  ┌─────────────────────────┐  │
                │  │  Kanban Board   │  │    Knowledge System     │  │
                │  │  (source of     │  │  (rules, hypotheses,    │  │
                │  │   truth)        │  │   inbox, domains)       │  │
                │  └───────┬────────┘  └───────────┬─────────────┘  │
                │          │                       │                │
                │  ┌───────┴───────────────────────┴─────────────┐  │
                │  │     Secrets (pass), Board CLI, Memory        │  │
                │  └─────────────────────────────────────────────┘  │
                └─────────┬───────────────┬───────────────┬─────────┘
                          │               │               │
         ┌────────────────┴───┐   ┌───────┴───────┐  ┌───┴────────────┐
         │  CC Orchestrator   │   │   Clawdius    │  │  Autonomous    │
         │  (Claude Code,     │   │   (OpenClaw,  │  │  Agents        │
         │   local machine)   │   │    Pi 5,      │  │  (own board,   │
         │                    │   │    Discord)   │  │   own secrets, │
         │  Dispatches:       │   │               │  │   own scope)   │
         │  ├─ Product Agent  │   │  Advisory,    │  │                │
         │  ├─ Website Agent  │   │  research,    │  │  May share     │
         │  └─ Research Agent │   │  board mgmt   │  │  knowledge     │
         └────────────────────┘   └───────────────┘  └────────────────┘
```

## The key insight: orchestrators, not an orchestrator

The simpler version of this architecture has one orchestrator at the top of a tree. That's how many agentic systems are described, and it's how this one started. But in practice, a single orchestrator becomes a bottleneck:

- It can only run when its host session is open
- It couples all coordination to one runtime and one context window
- If the PO isn't at the terminal, nothing gets coordinated

The production system this blueprint was extracted from runs multiple orchestrators concurrently:

| Orchestrator | Runtime | Where it runs | Primary focus |
|-------------|---------|--------------|---------------|
| **CC Orchestrator** | Claude Code (Opus) | Local machine (terminal) | Software delivery: dispatches sub-agents, manages PRs, runs CI |
| **Clawdius** | OpenClaw (Haiku) | Raspberry Pi 5 (Discord) | Strategy, research, advisory, board management, inter-agent coordination |
| **Satellite workspaces** | Claude Code (Sonnet/Opus) | Local machine (separate terminals) | Focused work outside the main delivery flow |

Each orchestrator has its own persona, its own area of focus, and its own runtime. But they all share:

- **The same Kanban board** (via the board CLI)
- **The same knowledge system** (reading domains, writing to the inbox)
- **The same secrets infrastructure** (`pass` store)
- **The same codebase** (git repos)

No orchestrator owns the board. No orchestrator owns the knowledge system. These are shared infrastructure that any orchestrator (or sub-agent) can read from and write to.

**Exception: autonomous agents.** An agent with its own mandate (e.g. an autonomous revenue experiment) may have its own board, its own secrets store, and its own scope entirely. It shares the knowledge system and communication channels (so it can learn from and coordinate with the team) but its operational infrastructure is separate. This is deliberate: autonomy means owning your own resources, not borrowing someone else's.

## How coordination works without a single coordinator

If there's no single hub, how do the orchestrators avoid conflicting with each other?

**The board is the coordination mechanism.** WIP limits, blocked cards, and card ownership make conflicts visible:

- An orchestrator checks the board on startup. If a card is already in Doing, someone is working on it.
- WIP limits prevent multiple orchestrators from pulling more work than the system can handle.
- Blocked cards with reasons tell any orchestrator what's stuck and why.
- Comments on cards provide an asynchronous communication channel between orchestrators.

**The knowledge inbox serialises learning.** Multiple orchestrators can write to the inbox concurrently (file naming is timestamp-based, so no conflicts). Whichever orchestrator runs the merge process at session start applies them in chronological order.

**Personas prevent scope overlap.** Each orchestrator has a defined area of focus. The CC orchestrator handles software delivery. Clawdius handles strategy and advisory. A satellite workspace handles one-off research. They don't step on each other because their responsibilities are explicitly different.

## Components

### Orchestrators

Each orchestrator:
- Has its own persona (soul file + instructions file)
- Has its own area of focus and set of responsibilities
- Checks the board on startup: WIP state, blockers, age
- Pulls work from Ready within its scope when under WIP target
- Can dispatch sub-agents (if its runtime supports it)
- Merges knowledge inbox entries (any orchestrator can do this)
- Flags decisions that need the PO's input

An orchestrator might dispatch sub-agents (the CC orchestrator does), or it might work directly (Clawdius handles research and advisory without spawning children). The pattern is flexible.

### Sub-Agents

- Dispatched by an orchestrator for focused delivery work
- Each targets a specific project directory
- Work independently within their project scope
- Update board cards as they progress
- Write to the knowledge inbox after completing work
- Report back concisely: what was done, what's blocked, what needs a decision

Sub-agents are **task-based, not persistent**. They're spun up for a card, do the work, and finish. The board carries state between sessions, not the agent's memory.

### Satellite Workspaces

- Separate instances for scratch work, research, or tasks outside the main delivery flow
- Not dispatched by an orchestrator; opened directly by the PO
- Can create board cards when work becomes substantial
- Can contribute to the knowledge system via the inbox
- Have their own CLAUDE.md with explicit instructions not to replicate orchestrator behaviour

### The Kanban Board

The board is the shared state layer that all orchestrators and agents rely on. It holds:

- **What's in flight** (cards in Doing, Done, VR)
- **What's blocked and why** (blocked cards with reasons)
- **What's ready to pull** (cards in Ready, ordered by priority)
- **How long things have been in progress** (WIP age)
- **Strategic priorities** (initiatives workflow)
- **Who is working on what** (card assignment and comments)

Agents interact with the board via a CLI wrapper around the board tool's REST API. The CLI is the same regardless of which orchestrator or agent is using it.

### The Knowledge System

A three-tier system that compounds learning across sessions. Shared by all orchestrators and agents.

```
knowledge/
├── INDEX.md                    # Domain registry
├── inbox/                      # Write-only queue for any agent
│   ├── README.md               # Format spec
│   └── processed/              # Archive of merged entries
├── prokanban/                  # Example domain
│   ├── rules.md                # Apply by default
│   ├── hypotheses.md           # Test with real work
│   └── knowledge.md            # Raw observations
└── <your-domain>/              # Add as needed
    ├── rules.md
    ├── hypotheses.md
    └── knowledge.md
```

Any orchestrator or agent can read domain files. Any can write to the inbox. The merge process (inbox → domain files) can be run by whichever orchestrator starts a session first. See [knowledge-system.md](knowledge-system.md) for the full design.

## Communication Flow

```
PO ←→ CC Orchestrator ←→ Sub-agents
PO ←→ Clawdius (Discord)
PO ←→ Satellite workspaces

All orchestrators and agents ←→ Board (cards, comments, WIP)
All orchestrators and agents ←→ Knowledge system (inbox → merge → domain files)
```

- **PO ↔ Orchestrators**: the PO interacts with each orchestrator through its native interface. Claude Code in the terminal, Clawdius via Discord. Each orchestrator briefs the PO on board state within its area of focus.
- **Orchestrator → Sub-agents**: dispatched with a card ID and project path. Sub-agents work independently.
- **Sub-agents → Board**: report progress via board comments and card transitions. Don't flood any orchestrator context with implementation detail.
- **Between orchestrators**: the board and knowledge system are the coordination layer. Direct messaging (Discord) is available for real-time coordination when needed. Card comments are the asynchronous default.

## Infrastructure (reference implementation)

The system this blueprint was extracted from runs on:

- **Local machine** (Windows): Claude Code sessions for the CC orchestrator, sub-agents, and satellite workspaces
- **Raspberry Pi 5** (guest network DMZ): Clawdius (OpenClaw), Docker containers for self-hosted services, n8n workflows, health monitoring
- **Cloudflare**: DNS, tunnels (exposing Pi services publicly without open ports), Workers (edge functions), Access (Zero Trust policies)
- **Supabase**: Hosted Postgres with RLS for SaaS products
- **GitHub**: Code hosting, CI/CD via Actions
- **Netlify / Vercel**: Static site hosting, preview deployments

This is one possible infrastructure shape. The multi-orchestrator pattern works with any combination of local, cloud, and self-hosted infrastructure. The requirement is shared access to the board and knowledge system, not co-location.

## Security Model

Security is covered in depth in [security.md](security.md). The key architectural points:

### Shared Memory

Beyond the knowledge system (which is explicit and structured), orchestrators and agents may share memory files: auto-generated notes, session handoffs, and project context that persists across conversations.

- **Memory files are shared by default.** Any orchestrator or agent can read memory written by another. This is how context about user preferences, project decisions, and working practices propagates across the team.
- **Memory is context, not authority.** Memory records can become stale. Agents should verify memory against current state (read the code, check the board) before acting on it. If a memory conflicts with what's observed now, trust the observation and update the memory.
- **Autonomous agents may maintain separate memory.** An agent with its own scope writes to its own memory store. It reads from the shared knowledge system but doesn't pollute shared memory with its operational state.

### Secrets

- All secrets in a single encrypted store (`pass`, GPG-backed)
- Agents reference secrets by variable name, never by value
- `.env` files are runtime artefacts, not the source of truth
- The secrets store is accessible to all orchestrators and agents via the same CLI
- Autonomous agents may have their own isolated secrets store (separate `pass` instance), giving them access to their own credentials without access to the team's

### Agent Autonomy

Autonomy boundaries are encoded in the operating model, not enforced through conversation prompting. They apply equally to all orchestrators and agents:

| Action | Permission |
|--------|-----------|
| Read, write, search, build, test | Autonomous |
| Commit to feature branches | Autonomous |
| Push feature branches | Autonomous |
| Open PRs | Autonomous |
| Merge to main | Confirm with PO |
| Deploy | Confirm with PO |
| Delete files/branches/data | Confirm with PO |
| Display secrets | Never |

### Pre-push Checks

Every push runs a security scan checking for:
- npm vulnerabilities (HIGH/CRITICAL)
- Hardcoded secret patterns
- `eval()` usage
- Accidentally committed `.env` files

FAIL = blocked. WARN = noted on the card.

## Scaling the model

The multi-orchestrator pattern scales naturally:

- **Add a new orchestrator**: give it a persona, point it at the board and knowledge system, define its area of focus. It immediately benefits from every rule and observation accumulated by existing orchestrators.
- **Add a new sub-agent type**: any orchestrator can dispatch it. It reads the same knowledge, uses the same board CLI, follows the same operating model.
- **Add a new runtime**: as long as it can read files and run the board CLI (or make equivalent API calls), it participates in the shared system. See [cross-runtime.md](cross-runtime.md).
- **Add a new knowledge domain**: create the directory structure, seed rules.md, add to INDEX.md. All orchestrators and agents see it on their next session start.

The ceiling is not "how many agents can one orchestrator manage" but "how many orchestrators can share a board and knowledge system coherently." WIP limits are the natural governor.
