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
                │  │   truth)        │  │   knowledge, domains)   │  │
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
         │   local machine)   │   │  self-hosted, │  │  (own board,   │
         │                    │   │    Discord)   │  │   own secrets, │
         │  Peer review,      │   │               │  │   own scope)   │
         │  risk surfacing,   │   │  Advisory,    │  │                │
         │  architectural     │   │  research,    │  │  May share     │
         │  advice            │   │  board mgmt   │  │  knowledge     │
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
| **CC Orchestrator** | Claude Code (Opus) | Local machine (terminal) | Senior peer: architectural review, risk surfacing, knowledge hygiene, continuous improvement |
| **Clawdius** | OpenClaw (Haiku) | Self-hosted server (Discord) | Strategy, research, advisory, board management, inter-agent coordination |
| **Satellite workspaces** | Claude Code (Sonnet/Opus) | Local machine (separate terminals) | Focused work outside the main delivery flow |

Each orchestrator has its own persona, its own area of focus, and its own runtime. But they all share:

- **The same Kanban board** (via the board CLI)
- **The same knowledge system** (reading and writing to domain files directly)
- **The same secrets infrastructure** (`pass` store)
- **The same codebase** (git repos)

No orchestrator owns the board.  No orchestrator owns the knowledge system.  These are shared infrastructure that any agent can read from and write to.

**Important: multiple orchestrators here means different runtimes with different scopes, not two CC orchestrators running simultaneously against the same board.** Within any given runtime and scope, the rule is one instance per named role. Two CC orchestrators hitting the same cards creates conflicts (see [Mistakes we made](mistakes-we-made.md)). Two of the same project agent creates duplicate inbox handling. The multiplicity in the table above works because each orchestrator has a distinct focus area, runtime, and set of responsibilities. See [agent-communication.md](agent-communication.md) for the full multiplicity rules.

**Exception: autonomous agents.** An agent with its own mandate (e.g. an autonomous revenue experiment) may have its own board, its own secrets store, and its own scope entirely. It shares the knowledge system and communication channels (so it can learn from and coordinate with the team) but its operational infrastructure is separate. This is deliberate: autonomy means owning your own resources, not borrowing someone else's.

## Staging collision guard

When multiple agents work in the same repository (even sequentially, via shared branches), git's staging area becomes a subtle concurrency hazard.  Agent A stages files, then Agent B's tool call runs before the commit, staging additional files.  Agent A commits, unknowingly including Agent B's changes.

Three rules prevent this:

1. **Stage and commit in a single shell call.**  `git add <files> && git commit -m "..."` in one Bash invocation.  Never stage in one tool call and commit in a separate one; the gap between them is where collisions happen.

2. **Name files explicitly.**  Never use `git add .` or `git add -A`.  These sweep up whatever is in the working tree, including files staged by other processes, generated artefacts, or files an agent edited speculatively and decided not to keep.

3. **Check before committing.**  If unexpected files appear in `git status` before a commit, investigate.  They may be another agent's in-progress work, a build artefact, or an accidentally created file.

This is a mechanical discipline, not a judgement call.  It should be in every agent's operating instructions.

## How coordination works without a single coordinator

If there's no single hub, how do the orchestrators avoid conflicting with each other?

**The board is the coordination mechanism.** WIP limits, blocked cards, and card ownership make conflicts visible:

- An orchestrator checks the board on startup. If a card is already in Doing, someone is working on it.
- WIP limits prevent multiple orchestrators from pulling more work than the system can handle.
- Blocked cards with reasons tell any orchestrator what's stuck and why.
- Comments on cards provide an asynchronous communication channel between orchestrators.

**Card comments enable asynchronous agent-to-agent communication.** When an agent needs input from another, it posts a routing comment using a `[prefix]` convention. A Businessmap business rule fires on the comment event, routes through a Cloudflare Worker proxy, and an n8n handler creates a transient inbox card for the target agent within seconds. The target polls the inbox on a schedule, does the work, and responds using the requester's prefix to close the loop. See [agent-communication.md](agent-communication.md) for the full design.

**Personas prevent scope overlap.** Each orchestrator has a defined area of focus. The CC orchestrator handles software delivery. Clawdius handles strategy and advisory. A satellite workspace handles one-off research. They don't step on each other because their responsibilities are explicitly different.

## Components

### Orchestrators

Each orchestrator:
- Has its own persona (soul file + instructions file)
- Has its own area of focus and set of responsibilities
- Checks the board on startup: WIP state, blockers, age
- Pulls work from Ready within its scope when under WIP target
- Can dispatch sub-agents (if its runtime supports it)
- Reviews knowledge entries for contradictions and staleness
- Flags decisions that need the PO's input

An orchestrator might dispatch sub-agents (the CC orchestrator does), or it might work directly (Clawdius handles research and advisory without spawning children). The pattern is flexible.

### Three delegation modes (a maturity arc)

Agents in this system have three ways to get specialist work done.  These form a maturity arc, not a menu.  Most agentic systems stop at the first or second mode and wonder why things degrade on longer tasks.

**Mode 1: Inline.**  The agent does the work itself.  Fine for small tasks.  Falls over when complexity exceeds what one context window can hold.

**Mode 2: Session-scoped specialists.**  The agent spawns a focused sub-agent inside its own session.  The specialist runs synchronously, returns a structured result, and is discarded.  Faster than async coordination.  But the specialist's output, reasoning, and tool calls all return to the parent agent's context window.  Spawn enough specialists and you have not saved context; you have distributed the compression across more actors while making it less visible.

**Mode 3: External coordination.**  The agent tasks another agent through the board.  A comment with a routing prefix, a transient inbox card, a response on the originating card.  Both agents keep their full context windows.  The coordination layer (the board, the knowledge system, the communication protocol) carries state, not the model's memory.  Slower, but both parties retain clear heads.

The key insight: **context window exhaustion is the real constraint, not model capability.**  Every sub-agent you spawn inside a session eats your available context.  Every result that returns, every reasoning chain, every tool call output shrinks the parent agent's working memory.  When the runtime compacts the conversation to make room, it does so silently; the agent does not know what it has forgotten.

Mode 3 avoids this entirely.  Neither agent carries the other's reasoning.  Neither agent's memory is diminished by the other's work.  The trade-off is latency: async coordination is measured in minutes, not milliseconds.  For planned delivery work, which is what Kanban is for, this is acceptable.

The practical question is when to use which:

| Signal | Mode |
|--------|------|
| Task is small and within the agent's competence | Inline (mode 1) |
| Task needs a different skill set but the result is compact (a report, a yes/no, a file path) | Session-scoped specialist (mode 2) |
| Task is substantial, the result is large, or the parent agent's context is already under pressure | External coordination (mode 3) |
| Task requires tools or access the parent agent does not have | External coordination (mode 3) |

### Sub-agents (project delivery)

- Dispatched by an orchestrator for focused delivery work
- Each targets a specific project directory
- Work independently within their project scope
- Update board cards as they progress
- Write observations directly to domain knowledge files after completing work
- Report back concisely: what was done, what's blocked, what needs a decision

Sub-agents are **task-based, not persistent**. They're spun up for a card, do the work, and finish. The board carries state between sessions, not the agent's memory.

### Session-scoped specialists

Session-scoped specialists are a distinct category from project sub-agents.  They are ephemeral, synchronous, and disposable.  A project agent spawns one mid-task for a focused concern (security review, voice compliance, board health check), receives a structured result, and continues.

Key composition principles:

- **Scoped tools.**  Each specialist gets only the tools it needs.  A voice compliance checker gets read and search access.  A security reviewer gets read, search, and shell access.  No specialist gets write access to the codebase unless its role demands it.
- **Model selection by task weight.**  Not every specialist needs the most capable model.  Board health checks can run on a lighter model.  Security reviews warrant a heavier one.  Match the model to the cognitive demand of the task.
- **Structured output contracts.**  Every specialist returns results in a defined format.  The parent agent knows exactly what shape the response will take and can act on it mechanically.  No parsing ambiguity, no narrative to wade through.
- **Turn limits.**  Specialists have a hard cap on how many turns they can take.  This prevents runaway exploration and forces the specialist to synthesise early.

The distinction from project sub-agents matters: a sub-agent owns a card and progresses it through the board.  A session-scoped specialist does not touch the board; it provides a capability that the parent agent consumes and moves on.

Think of it as the difference between delegating a task and asking a colleague to glance at something.  The task delegation (sub-agent) creates board-visible work.  The quick glance (specialist) is invisible to the board but improves the quality of the parent agent's output.

#### Sub-agent resource guardrails

Sub-agents (child agents spawned by an orchestrator or parent agent) can consume disproportionate time and tokens if left unconstrained.  A research sub-agent given a vague brief will exhaustively search the codebase, read every file, and return a 2000-line analysis when a 10-line answer was needed.  These guardrails prevent runaway consumption:

**Timeout enforcement.**  Set explicit time limits per task type:
- Research tasks: 5 minutes max
- Code generation: 10 minutes max
- Exploratory searches: 3 minutes max
- Any task exceeding 10 minutes should be broken into smaller subtasks

**Scope containment.**  Every sub-agent dispatch should specify:
- A precise, bounded task (not "investigate the auth system" but "find which middleware file handles JWT validation")
- An exact output format ("return the file path and line number, nothing else")
- A limited search space ("look in `src/middleware/`, not the entire repo")

**Synthesise-early pattern.**  Sub-agents should return findings as soon as the answer is clear, not exhaustively search every remaining possibility.  If the task is "find where rate limiting is configured" and the answer is found in the first file checked, return immediately.

**Parallelism over depth.**  Prefer 3 focused parallel sub-agents over 1 broad sequential one.  Three agents searching three directories simultaneously finish faster and produce less noise than one agent searching the entire repo.

**Kill criteria.**  If a sub-agent returns off-target results, do not re-spawn it with a broader scope.  Reassess the task.  Never retry with the same prompt; if it failed once, the prompt is the problem.

### Satellite Workspaces

- Separate instances for scratch work, research, or tasks outside the main delivery flow
- Not dispatched by an orchestrator; opened directly by the PO
- Can create board cards when work becomes substantial
- Can contribute to the knowledge system by writing directly to domain files
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

Two distinct knowledge layers serve different purposes:

**Domain knowledge** (epistemic: earned through evidence)

```
knowledge/
├── INDEX.md                    # Domain registry
├── prokanban/                  # Example domain
│   ├── rules.md                # Apply by default
│   ├── hypotheses.md           # Test with real work
│   └── knowledge.md            # Raw observations
└── <your-domain>/              # Add as needed
    ├── rules.md
    ├── hypotheses.md
    └── knowledge.md
```

Any orchestrator or agent can read and write to domain files directly.  In-progress observations are captured in card comments; completed learnings are written to the appropriate domain file.

**Estate knowledge** (factual: infrastructure state that is either correct or not)

```
ESTATE.md                          # Global: tooling, practices, shared infra
estate/
├── domain-a.md                    # Secrets paths, deploy targets, CI status
└── domain-b.md                    # Board column IDs, third-party accounts
Project CLAUDE.md files             # Inherit from global + relevant domain
```

Agents discover infrastructure facts during work and append them to a `## Pending` section in the relevant estate file.  The orchestrator curates Pending entries on session start: verifies, promotes to the canonical body, or rejects.  This write protocol prevents drift and ensures one person owns accuracy.

The two layers are complementary.  Domain knowledge uses the observation → hypothesis → rule promotion cycle because product patterns need evidence.  Estate knowledge uses a Pending → curate cycle because infrastructure facts need verification, not repeated confirmation.  See [knowledge-system.md](knowledge-system.md) for both designs.

## Communication Flow

```
PO ←→ CC Orchestrator ←→ Sub-agents
PO ←→ Clawdius (Discord)
PO ←→ Satellite workspaces

All orchestrators and agents ←→ Board (cards, comments, WIP)
All orchestrators and agents ←→ Knowledge system (domain files, direct read/write)
```

- **PO ↔ Orchestrators**: the PO interacts with each orchestrator through its native interface. Claude Code in the terminal, Clawdius via Discord. Each orchestrator briefs the PO on board state within its area of focus.
- **Orchestrator → Sub-agents**: dispatched with a card ID and project path. Sub-agents work independently.
- **Sub-agents → Board**: report progress via board comments and card transitions. Don't flood any orchestrator context with implementation detail.
- **Between orchestrators**: the board and knowledge system are the coordination layer. Direct messaging (Discord) is available for real-time coordination when needed. Card comments are the asynchronous default.

## Infrastructure (reference implementation)

The system this blueprint was extracted from runs on:

- **Local machine** (Windows): Claude Code sessions for the CC orchestrator, sub-agents, and satellite workspaces
- **Self-hosted server** (guest network DMZ): Clawdius (OpenClaw), Docker containers for self-hosted services, n8n workflows, health monitoring
- **Cloudflare**: DNS, tunnels (exposing self-hosted services publicly without open ports), Workers (edge functions), Access (Zero Trust policies)
- **GitHub**: Code hosting, CI/CD via Actions

This is one possible infrastructure shape.  The multi-orchestrator pattern works with any combination of local, cloud, and self-hosted infrastructure.  The requirement is shared access to the board and knowledge system, not co-location.  See [hardware.md](hardware.md) for the self-hosting option.

### CI and deployment are permanently separate

GitHub Actions (or your CI tool) runs checks: lint, typecheck, tests, assertion locks.  It never deploys.  Deployment is a separate step, run from a different machine, via a dedicated script.

This is a permanent architectural decision, not a billing workaround.  The reasons:

- **Deterministic deploy paths.**  A deploy script on a known machine with known state is reproducible.  A deploy job in CI depends on runner availability, environment variables that may drift, and third-party action versions.
- **ARM64 vs x86 build differences.**  If your production infrastructure runs on ARM (Raspberry Pi, ARM VMs), CI runners are typically x86.  Builds that work on the runner may fail on the deploy target.  Building on the target eliminates this class of failure.
- **Free-tier conservation.**  CI minutes on free plans are finite.  Using them for deployment means CI and deployment compete for the same budget.  Separating them means CI always has capacity for checks.

The pattern: CI runs on every push and PR.  If CI is green and the PR is merged, deployment is triggered separately (manually, via webhook, or via a deploy script that the merge process calls).

### Version-controlling automation workflows

If your system uses n8n, Zapier, Make, or any workflow automation tool, the workflow definitions are infrastructure.  They should be version-controlled alongside the orchestrator repo, not left as opaque state inside the automation tool's database.

The pattern: export workflow definitions as JSON, store them in a directory (e.g. `n8n-workflows/`), and include a CLI wrapper for importing, activating, and deactivating workflows via the tool's API.  When a workflow changes, the JSON export is updated in the repo and committed.

This gives you: git history showing what changed and when, the ability to restore a workflow after accidental deletion, and a diff-reviewable format for workflow changes that would otherwise be invisible clicks in a GUI.

### Deploy commit drift detection

In systems with multiple environments (pre-prod, production, staging), deployed state can silently drift from the repository.  A commit merges to main; pre-prod auto-deploys; production requires a manual dispatch.  Two weeks later, production is 15 commits behind and nobody noticed.

A deploy status script that queries each environment's deployed commit SHA and compares it to the repo's HEAD makes this drift visible:

```
$ deploy-status
Environment   Deployed SHA   HEAD SHA       Drift
pre-prod      a1b2c3d        a1b2c3d        ✓ current
production    e4f5g6h        a1b2c3d        ✗ 15 commits behind
```

Run this at session start or as part of the environment parity check in the wrap-up checklist (see [session-boundaries.md](session-boundaries.md)).  The agent sees the drift and can flag it or create a card for the promotion.

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
