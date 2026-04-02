# Agentic Kanban Blueprint

A working reference for running AI agents with Kanban discipline. Not a framework. Not a library. A documented operating model, extracted from a real production system where Claude Code agents deliver software autonomously, coordinated through a Kanban board.

This repo contains redacted versions of the actual configuration files, persona definitions, knowledge systems, and tooling used to run a multi-agent delivery system for a small software company. Everything here has been tested in production across dozens of sessions.

## Who this is for

- **Practitioners experimenting with agentic AI** who want a concrete starting point, not just theory
- **Agile coaches and Kanban practitioners** curious about how flow principles translate to AI agent coordination
- **Solo founders and small teams** looking to amplify delivery capacity with AI agents
- **Anyone building with Claude Code** who wants to see how far you can push autonomous agent workflows

## What's inside

| Directory | What it contains |
|-----------|-----------------|
| [`orchestrator/`](orchestrator/) | The hub: CLAUDE.md (system prompt), operating model, autonomy boundaries, CI/CD practices |
| [`orchestrator/bin/`](orchestrator/bin/) | Board CLI tool for agents to interact with the Kanban board via API |
| [`knowledge/`](knowledge/) | The compounding knowledge system: domain-based rules, hypotheses, observations, and an inbox pattern for multi-agent contribution |
| [`personas/`](personas/) | Identity and instruction files for different agent roles (lead advisor, autonomous revenue agent) |
| [`workspace/`](workspace/) | Satellite workspace config showing how focused agents relate to the orchestrator |
| [`docs/`](docs/) | Human-readable guides: architecture, knowledge system, security, hardware/self-hosting, cross-runtime, getting started |
| [`TOOLS.md`](TOOLS.md) | The full stack with what each tool does, free tier availability, and setup notes |

## The core ideas

**1. The board is the single source of truth.** Not conversation history, not memory files, not plans. The Kanban board provides continuity across sessions. Agents check the board on startup, pull work autonomously, and update cards as they go. When a session ends, the board state persists.

**2. Agents pull work; they don't wait for instructions.** WIP age (how long a card has been in progress) is the primary signal. Oldest unblocked item gets priority. WIP limits are targets, not just ceilings; being under WIP is a flow problem.

**3. Knowledge compounds across sessions.** A three-tier system (knowledge, hypotheses, rules) with explicit promotion criteria means agents get better over time. Observations earn their way to rules through repeated confirmation, not assumption.

**4. Personas define behaviour, not just capability.** Each agent has a soul file (identity, values, character) and an instructions file (responsibilities, constraints, operating model). The soul shapes *how* the agent works; the instructions shape *what* it works on.

**5. Autonomy has explicit boundaries.** Agents can read, write, build, test, and commit freely. They confirm before pushing, deploying, or making architectural decisions. They must never expose secrets. The boundaries are encoded in the operating model, not enforced through conversation.

**6. Security is architectural, not instructional.** "Don't leak secrets" in a system prompt is the weakest layer. The real security comes from network isolation (self-hosted agents on a DMZ), encrypted centralised secrets management (`pass` over scattered `.env` files), agent scope boundaries, pre-push security scans, and compliance-aligned design (GDPR, SOC 2, ISO 27001). See [`docs/security.md`](docs/security.md) for the full model.

## Quick start

See [`docs/getting-started.md`](docs/getting-started.md) for a step-by-step guide to adapting this for your own setup.

The short version:
1. Fork this repo
2. Adapt `orchestrator/CLAUDE.md` and `orchestrator/agent-guidelines.md` for your projects and board tool
3. Set up the knowledge system with your own domains
4. Write persona files for your agent roles
5. Configure the board CLI for your Kanban tool's API

## The stack

This system was built on a specific set of tools. See [`TOOLS.md`](TOOLS.md) for the full breakdown, including what each tool does, whether it has a free tier, and how it fits into the system. Most of the stack is available at zero cost to start.

Key components: [Claude Code](https://claude.ai/code) for the AI agents, [Businessmap](https://businessmap.io) for the Kanban board, [Supabase](https://supabase.com) for database and auth, [Cloudflare](https://cloudflare.com) for networking and edge compute, [n8n](https://n8n.io) for workflow automation.

## Context

This blueprint was extracted from a live system run by [smagile](https://smagile.co), a consultancy experimenting with agentic AI delivery. The orchestrator coordinates sub-agents across multiple products (a SaaS CV builder, a company website, lead generation, content, and an autonomous revenue experiment). The system is operated by a solo founder who is also a licensed [ProKanban.org](https://prokanban.org) trainer, which is why the Kanban integration is unusually rigorous.

The operating model has been iterated through real delivery sessions since early 2026. The knowledge system, board integration patterns, and persona definitions are all products of that iteration.

## Runtime compatibility

The operating model, knowledge system, and persona files in this repo are not locked to a single agent runtime. In the production system they were extracted from, the same files are used simultaneously by:

- **Claude Code agents** (terminal-based: orchestrator, sub-agents, satellite workspaces)
- **OpenClaw agents** (Discord-based: advisory, monitoring, and coordination roles)

Both runtimes read the same knowledge domains, interact with the same board via the CLI, and contribute to the same inbox. The architecture is deliberately runtime-agnostic. See [`docs/cross-runtime.md`](docs/cross-runtime.md) for how this works in practice.

## Acknowledgements

The knowledge system (knowledge/hypotheses/rules with 5+ confirmation promotion) was originally inspired by [Pawel Huryn](https://www.linkedin.com/in/pawel-huryn)'s CLAUDE.md pattern for compounding AI learning across sessions. His insight that one block of instructions can make an AI agent build and maintain its own institutional knowledge was the seed.

Specific patterns in the operating model (time-decay on knowledge, failure-first observation capture, explicit decision vocabulary) were extracted from [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) by selectively adapting what was useful rather than adopting the framework wholesale.

The current architecture is a product of those starting points combined with sustained personal experimentation, real delivery sessions, and the application of ProKanban principles to agentic workflows.

## What this is not

- **Not a framework to install.** There's no `npm install`. These are configuration files, documentation, and patterns. You adapt them to your context.
- **Not prescriptive about tools.** The patterns work with any Kanban board that has an API, any AI model that supports tool use, and any infrastructure stack. The specific tools are choices, not requirements.
- **Not a finished product.** This is a snapshot of a system that continues to evolve. Some hypotheses are unconfirmed. Some patterns are early. That's the point: the system is designed to learn.

## Licence

[CC BY-SA 4.0](LICENSE). Use it, adapt it, share it. Attribution appreciated.

---

Built with [Claude Code](https://claude.ai/code). Coordinated with [Businessmap](https://businessmap.io). Grounded in [ProKanban](https://prokanban.org) principles.
