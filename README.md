# Agentic Kanban Blueprint

### Seriously: read this before doing anything else.

A working reference for running AI agents with Kanban discipline.

This repository documents how to coordinate autonomous AI agents using a Kanban board as the shared source of truth. It's extracted from a real production system where AI agents deliver software, manage their own work queues, and learn from session to session, all coordinated through explicit flow management.

Everything here has been tested in practice across dozens of real delivery sessions.

## How to use this repository

This repository is a collection of documents, configuration files, and working examples. You don't need to install anything to get value from it. Pick the path that matches what you're looking for:

### "I want to understand the ideas"

Start here. Read these in order:

1. **This page** (keep reading below for the core ideas)
2. **[Architecture overview](docs/architecture.md)** explains how the pieces fit together: multiple AI orchestrators sharing a Kanban board, a knowledge system, and a secrets store
3. **[Knowledge system](docs/knowledge-system.md)** explains how AI agents learn across sessions using a three-tier system (observations, hypotheses, confirmed rules)
4. **[Security model](docs/security.md)** covers how to run AI agents safely: network isolation, secrets management, compliance, and the specific threat model for agents that can execute code

No technical knowledge required for these. They explain the concepts and the reasoning behind the design decisions.

### "I want to implement this"

Once the ideas make sense, the implementation guide walks you through setup step by step:

1. **[Getting started](docs/getting-started.md)** is the step-by-step guide to adapting this for your own setup
2. **[Tools and stack](TOOLS.md)** covers every tool used in the system, what it does, whether it has a free tier, and how it fits in
3. **[Hardware and self-hosting](docs/hardware.md)** covers running this on your own hardware (including a Raspberry Pi) instead of paying for cloud hosting
4. **[Flow Guardian pattern](docs/flow-guardian.md)** explains how to build an agent that monitors flow health, nudges for action on aging items, and flags when your processes are impeding the system
5. **[Cross-runtime compatibility](docs/cross-runtime.md)** explains how the same files work across different AI agent platforms simultaneously

### "I want to browse the actual files"

The working configuration files are in these folders:

| Folder | What's in it | In plain terms |
|--------|-------------|----------------|
| [`orchestrator/`](orchestrator/) | The main AI agent's instructions and operating rules | This is what tells the AI how to behave, what it can and can't do, and how to use the board |
| [`orchestrator/bin/`](orchestrator/bin/) | A command-line tool for interacting with the Kanban board | A script that lets AI agents create cards, move them, add comments, and check what's in progress |
| [`knowledge/`](knowledge/) | The learning system: rules, hypotheses, and observations | Where the AI stores what it's learned, organised by topic, with a process for promoting guesses to confirmed rules |
| [`personas/`](personas/) | Identity files for different AI agent roles | Includes lead agent, autonomous agent, and flow guardian. Each has a "soul" (identity, values) and "instructions" (responsibilities, constraints). |
| [`workspace/`](workspace/) | Configuration for a focused helper workspace | How a secondary AI assistant connects back to the main system |
| [`docs/`](docs/) | Guides and explanations | The human-readable documentation you're reading now |

You can click any folder above to browse its contents directly on GitHub. Every file is plain text (Markdown), readable in any browser.

### "I want a copy to work with"

Two options:

- **Download**: click the green **Code** button above, then **Download ZIP**. Unzip it anywhere. No special software needed.
- **Fork** (if you use Git): click **Fork** at the top of this page to create your own copy on GitHub that you can modify.

---

## Who this is for

- **Practitioners experimenting with agentic AI** who want a concrete starting point, not just theory
- **Agile coaches and Kanban practitioners** curious about how flow principles translate to AI agent coordination
- **Solo founders and small teams** looking to amplify delivery capacity with AI agents
- **Anyone using AI coding tools** (Claude Code, Cursor, Copilot, or similar) who wants to see how far you can push autonomous agent workflows
- **People who've heard about this system** and want to understand how it works or try it themselves

You don't need to be a developer to understand the concepts. You do need some technical comfort to implement the full system, but the ideas (Kanban for AI agents, compounding knowledge, explicit autonomy boundaries) are accessible to anyone familiar with Kanban or Agile practices.

## The core ideas

### 1. The board is the single source of truth

AI agents lose their memory when a conversation ends. The Kanban board solves this. Every piece of work is a card on the board. Agents check the board when they start, pull work from it, update it as they go, and leave it in a state the next agent can pick up.

The board isn't just a visualisation tool; it's the coordination layer that makes multi-agent work possible.

### 2. Agents pull work; they don't wait for instructions

Instead of telling agents what to do each session, the board tells them. The agent checks what's in progress, looks at how long each item has been there (WIP age), and pulls the oldest unblocked item. Work-in-progress limits prevent agents from starting too many things at once.

This is standard Kanban practice, applied to AI agents instead of humans.

### 3. Knowledge compounds across sessions

A three-tier system makes agents smarter over time:

- **Knowledge**: raw observations from real work ("this API takes 10 seconds to respond")
- **Hypotheses**: patterns that might be true but need more evidence ("agents make better decisions when they check the board first")
- **Rules**: confirmed patterns that agents apply by default ("always check WIP age before pulling new work")

Hypotheses get promoted to rules after 5+ independent confirmations. Rules can be demoted back if new evidence contradicts them. The system self-corrects.

### 4. Personas define behaviour, not just capability

Each agent has two files: a **soul** (identity, values, communication style) and **instructions** (responsibilities, constraints, tools). The soul shapes *how* the agent works; the instructions shape *what* it works on. This means you can have multiple agents with different personalities and focus areas, all sharing the same board and knowledge.

### 5. Autonomy has explicit boundaries

Agents can read code, write code, run tests, and make commits freely. They confirm with a human before deploying, merging to the main branch, or making architectural decisions. They must never display passwords or API keys. These boundaries are written into the agent's instructions, not left to chance.

### 6. Security is architectural, not instructional

Telling an AI agent "don't leak secrets" in its instructions is the weakest form of protection. The real security comes from network isolation (running agents on a separate network segment), encrypted secrets management, scope boundaries (agents can only access their own project), and automated security scans before code is shared. See [docs/security.md](docs/security.md) for the full model, including alignment with GDPR, SOC 2, and ISO 27001.

## The stack

This system was built on a specific set of tools. See [TOOLS.md](TOOLS.md) for the full breakdown, including what each tool does, whether it has a free tier, and how it fits into the system.

Key components:
- **[Claude Code](https://claude.ai/code)**: the AI agent platform (terminal-based, can read/write code, run commands, interact with APIs)
- **[Businessmap](https://businessmap.io)**: the Kanban board (any board with an API works; the patterns are tool-agnostic)
- **[Supabase](https://supabase.com)**: database and authentication (free tier available)
- **[Cloudflare](https://cloudflare.com)**: networking, tunnels for self-hosted services, edge compute (free tier available)
- **[n8n](https://n8n.io)**: workflow automation between services (self-hosted, free)

Most of the stack is available at zero cost to start. See [docs/hardware.md](docs/hardware.md) for running this on a Raspberry Pi (~£115 one-time) instead of paying for cloud hosting.

## Context

This blueprint was extracted from a live system run by [smagile](https://smagile.co), a consultancy experimenting with agentic AI delivery. The system coordinates multiple AI agents across multiple products (a SaaS CV builder, a company website, lead generation, content, and an autonomous revenue experiment). It's operated by a solo founder who is also a licensed [ProKanban.org](https://prokanban.org) trainer, which is why the Kanban integration is unusually rigorous.

The operating model has been iterated through real delivery sessions since early 2026. The knowledge system, board integration patterns, and persona definitions are all products of that iteration.

## Runtime compatibility

The files in this repo aren't locked to one AI platform. In the production system, the same operating model, knowledge system, and board are used simultaneously by:

- **Claude Code agents** (terminal-based: the main delivery engine)
- **OpenClaw agents** (Discord-based: advisory, monitoring, and coordination)

Both platforms read the same knowledge, interact with the same board, and contribute observations back to the same learning system. The architecture is deliberately platform-agnostic. See [docs/cross-runtime.md](docs/cross-runtime.md) for how this works.

## Acknowledgements

The knowledge system (knowledge/hypotheses/rules with 5+ confirmation promotion) was originally inspired by [Pawel Huryn](https://www.linkedin.com/in/pawel-huryn)'s CLAUDE.md pattern for compounding AI learning across sessions. His insight that one block of instructions can make an AI agent build and maintain its own institutional knowledge was the seed.

Specific patterns in the operating model (time-decay on knowledge, failure-first observation capture, explicit decision vocabulary) were extracted from [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) by selectively adapting what was useful rather than adopting the framework wholesale.

The current architecture is a product of those starting points combined with sustained personal experimentation, real delivery sessions, and the application of ProKanban principles to agentic workflows.

## What this is not

- **Not software to install.** These are documents, configuration files, and patterns. You read them, adapt them to your context, and use them with whatever AI tools you prefer.
- **Not prescriptive about tools.** The patterns work with any Kanban board that has an API, any AI model that supports tool use, and any infrastructure stack. The specific tools are choices, not requirements.
- **Not a finished product.** This is a snapshot of a system that continues to evolve. Some hypotheses are unconfirmed. Some patterns are early. That's the point: the system is designed to learn.

## Licence

[CC BY-SA 4.0](LICENSE). Use it, adapt it, share it. Attribution appreciated.

---

Built with [Claude Code](https://claude.ai/code). Coordinated with [Businessmap](https://businessmap.io). Grounded in [ProKanban](https://prokanban.org) principles.
