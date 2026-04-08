# Agentic Kanban Blueprint

## What is this?

You have work you want AI to do. The problem: every time you start a new conversation, the AI forgets everything from last time. You end up repeating yourself, re-explaining context, and manually directing every step.

This system fixes that by putting a Kanban board between you and the AI.

You write down what needs doing on a card. The AI picks it up, does the work, updates the card, and moves on to the next one. Between sessions, the board remembers what's in progress, what's waiting, and what's done. The AI reads the board at the start of every session and picks up where it (or another AI) left off.

It gets more powerful with multiple AI assistants. One can build your website while another handles your outreach while a third manages your infrastructure, all pulling from the same board, all aware of each other's work, none duplicating effort.

**This repository documents how to set it up.** It's extracted from a production system where AI agents deliver software, manage their own work queues, and learn from session to session. Everything here has been tested in real delivery across dozens of sessions.

## What does it cost?

Upfront honesty: this isn't free to run.

| What you need | Cost | Notes |
|---------------|------|-------|
| AI agent (Claude Code) | ~£16-75/month | Required. Pro (~£16/month) for lighter use; Max (~£75/month) for heavy agentic workloads. Other AI tools with similar capabilities may work. |
| Kanban board | £0 to ~£38/month | Required. Free: Trello, GitHub Projects (or build your own). Paid: [Businessmap](https://businessmap.io/signup-partners?referral_code=smagile90referral) (from ~£38/month for 5 users, 90-day trial) has the best Kanban semantics and API. |
| Everything else | £0 | Database, networking, automation, monitoring all have free tiers. |
| Hardware (optional) | ~£160 one-time | Only if you self-host instead of using cloud services. |
| **Minimum to start** | **~£16/month** | AI subscription + free board tool. |

See [TOOLS.md](TOOLS.md) for the full breakdown.

## Who is this for?

- You have work (software, content, research, operations) that you'd like AI to handle autonomously
- You want to see what the AI is doing and redirect it when needed, without micromanaging every step
- You want AI assistants that get smarter over time instead of starting from zero every session
- You're curious how Kanban flow principles (WIP limits, age-based prioritisation, explicit policies) translate to AI coordination

You don't need to be a developer to understand the ideas. You do need some technical comfort to implement the full system, but the concepts are accessible to anyone.

## More than a to-do list

You probably already have a board. What you probably don't have is limits on how many things are in progress at once (which stops agents from starting everything and finishing nothing) or a way to see how long things have been stuck (which is the earliest signal that something's gone wrong). That's the difference between a to-do list and a flow system.

This blueprint builds good flow practice into the setup. You don't need to study Kanban theory first; the templates and guidelines embed the important bits. As you use the system, you'll start to feel why WIP limits and age-based prioritisation matter, because you'll see what happens when agents ignore them.

## The core ideas

### The problem this solves

Here's a concrete example. You ask an AI to write the "About" page for your website. It does a good job. Two days later, you ask it to write the "Services" page. The AI doesn't remember the About page. It doesn't know your voice, your values, or your brand. You explain everything again. Repeat for every page, every task, every session.

Now multiply that by three AI assistants working on different projects. None of them know what the others are doing. They duplicate work, contradict each other, and you spend more time directing them than you would doing the work yourself.

The Kanban board solves both problems at once.

### 1. The board is the single source of truth

Every piece of work is a card on the board. The card says what needs doing, why it matters, and what "done" looks like. AI agents check the board when they start, pull work from it, update it as they go, and leave it in a state the next agent can pick up.

The board isn't just a to-do list. It's the coordination layer that makes multi-agent work possible.

### 2. Agents pull work; they don't wait for instructions

Instead of telling agents what to do each session, the board tells them. The agent checks what's in progress, looks at how long each item has been there (this is called "WIP age" -- a signal that something might be stuck), and pulls the oldest unblocked item. Work-in-progress limits cap how many things are in flight at once, preventing the agent from starting everything and finishing nothing.

This is standard Kanban practice, applied to AI agents instead of humans.

### 3. Knowledge compounds across sessions

A three-tier learning system makes agents smarter over time:

- **Knowledge**: raw observations from real work ("this API returns errors when called too quickly")
- **Hypotheses**: patterns that might be true but need more evidence ("users prefer short descriptions over long ones")
- **Rules**: confirmed patterns that agents apply by default ("always run tests before committing code")

Hypotheses get promoted to rules after enough independent confirmations. Rules can be demoted back if new evidence contradicts them. The system self-corrects.

### 4. Personas define behaviour, not just capability

Each agent has two files: a **soul** (identity, values, communication style) and **instructions** (responsibilities, constraints, tools). The soul shapes *how* the agent works; the instructions shape *what* it works on. This means you can have multiple agents with different personalities and focus areas, all sharing the same board and knowledge.

### 5. Autonomy has explicit boundaries

Agents can read code, write code, run tests, and make commits freely. They confirm with a human before deploying, merging to the main branch, or making architectural decisions. They must never display passwords or API keys. These boundaries are written into the agent's instructions, not left to chance.

### 6. Security is architectural, not instructional

Telling an AI agent "don't leak secrets" in its instructions is the weakest form of protection. The real security comes from network isolation (running agents on a separate network segment), encrypted secrets management, scope boundaries (agents can only access their own project), and automated security scans before code is shared. See [docs/security.md](docs/security.md) for the full model.

## What a typical day looks like

Morning. You open Claude Code. It reads the board and tells you: "Two cards in progress, one is blocked waiting for an API key you haven't set up yet, and there's a card that's been in progress for three days, which is longer than usual. Nothing in Ready."

You create two new cards for today's priorities, writing a sentence or two on each about what needs doing and what "done" looks like. You unblock the stuck card by adding the API key. The agent pulls the oldest card and starts working.

You go do something else. Client call. Emails. Lunch.

You check back. The agent has finished the first card, moved it to Done with a comment explaining what it did and what to review, and has already pulled the second card. It hit a question about your brand voice and left a comment asking for direction rather than guessing.

You answer the question, review the finished card, and ship it. The agent incorporates your answer and finishes the second card before end of day.

Tomorrow, a fresh agent session starts. It reads the board, sees what shipped yesterday, picks up whatever is next, and carries on. It doesn't need you to re-explain anything. The board carries the context.

That's the system. Some days you're more hands-on; some days you barely check in. The board makes both modes work.

## How to use this repository

This isn't software to install. It's a collection of documents, configuration files, and working examples that you read, adapt, and use with whatever AI tools you prefer.

### Understand the ideas (30 minutes)

Start with these two. Everything else is reference material you can read when relevant.

1. **This page** (you're most of the way through the concepts)
2. **[The human in the system](docs/human-in-the-system.md)** -- what only you can do, what goes wrong when you abdicate, and how to be a good product owner to AI agents

Then go deeper on the areas that interest you:

3. **[Mistakes we made](docs/mistakes-we-made.md)** -- real failures from production and how we fixed them forward
4. **[Session boundaries](docs/session-boundaries.md)** -- how context survives when sessions end and new ones start
5. **[Architecture overview](docs/architecture.md)** -- how the pieces fit together: multiple AI agents sharing a board, a knowledge system, and a secrets store
6. **[Knowledge system](docs/knowledge-system.md)** -- how the three-tier learning system works in practice
7. **[Writing agent personas](docs/writing-personas.md)** -- why personality matters, soul vs instructions, and how to write a character that shapes judgment
8. **[Security model](docs/security.md)** -- how to run AI agents safely

### Implement it (a few hours)

1. **[Getting started](docs/getting-started.md)** -- step-by-step guide, starting with just a board and one agent
2. **[Writing a product vision for AI agents](docs/product-vision.md)** -- how to write a vision doc that agents can use to make product decisions autonomously, without asking you every time
3. **[Tools and stack](TOOLS.md)** -- every tool used, what it costs, and whether you need it
4. **[Hardware and self-hosting](docs/hardware.md)** -- running on your own hardware instead of paying for cloud
5. **[Flow Guardian pattern](docs/flow-guardian.md)** -- an agent that monitors flow health and nudges for action on aging items
6. **[Cross-runtime compatibility](docs/cross-runtime.md)** -- using the same files across different AI platforms
7. **[How do you know it's working?](docs/measuring-health.md)** -- three signals to check at 5, 10, and 20 sessions

### Browse the actual files

| Folder | What's in it | In plain terms |
|--------|-------------|----------------|
| [`orchestrator/`](orchestrator/) | The main AI agent's instructions and operating rules | This is what tells the AI how to behave, what it can and can't do, and how to use the board |
| [`orchestrator/bin/`](orchestrator/bin/) | A command-line tool for interacting with the Kanban board | A script that lets AI agents create cards, move them, add comments, and check what's in progress |
| [`knowledge/`](knowledge/) | The learning system: rules, hypotheses, and observations | Where the AI stores what it's learned, organised by topic, with a process for promoting guesses to confirmed rules |
| [`personas/`](personas/) | Identity files for different AI agent roles | Includes a lead agent, coordinator, autonomous agent, and flow guardian. Each has a "soul" (identity, values) and "instructions" (responsibilities, constraints) |
| [`workspace/`](workspace/) | Configuration for a focused helper workspace | How a secondary AI assistant connects back to the main system |
| [`docs/`](docs/) | Guides and explanations | The documentation you're reading now |

Every file is plain text (Markdown), readable in any browser. Click any folder above to browse its contents directly on GitHub.

### Get a copy

- **Download**: click the green **Code** button above, then **Download ZIP**. Unzip it anywhere.
- **Fork** (if you use Git): click **Fork** at the top of this page to create your own copy you can modify.

## The stack

This system was built on a specific set of tools. See [TOOLS.md](TOOLS.md) for the full breakdown.

Key components:
- **[Claude Code](https://claude.ai/code)**: the AI agent platform (can read/write code, run commands, interact with APIs)
- **A Kanban board with an API**: any board tool works. This repo includes a CLI adapted for [Businessmap](https://businessmap.io), but the patterns are tool-agnostic.
- **[Supabase](https://supabase.com)**: database and authentication (free tier)
- **[Cloudflare](https://cloudflare.com)**: networking and tunnels for self-hosted services (free tier)
- **[n8n](https://n8n.io)**: workflow automation between services (self-hosted, free)

## Context

This blueprint was extracted from a live system run by [smagile](https://smagile.co), a consultancy experimenting with agentic AI delivery. The system coordinates multiple AI agents across multiple products (a SaaS CV builder, a company website, lead generation, content, and an autonomous revenue experiment). It's operated by a solo founder who is also a licensed [ProKanban.org](https://prokanban.org) trainer, which is why the Kanban integration is unusually rigorous.

The operating model has been iterated through real delivery sessions since early 2026. The knowledge system, board integration patterns, and persona definitions are all products of that iteration.

## Runtime compatibility

The files here aren't locked to one AI platform. In the production system, the same operating model, knowledge system, and board are used simultaneously by:

- **Claude Code agents** (terminal-based: the main delivery engine)
- **[OpenClaw](https://openclaw.ai) agents** (Discord-based: advisory, monitoring, and coordination). OpenClaw is a free, always-on agentic AI assistant. It runs for free, though you get the best results when pairing it with a paid LLM service.

Both platforms read the same knowledge, interact with the same board, and contribute observations back to the same learning system. See [docs/cross-runtime.md](docs/cross-runtime.md) for how this works.

## Acknowledgements

The knowledge system (knowledge/hypotheses/rules with promotion thresholds) was originally inspired by [Pawel Huryn](https://www.linkedin.com/in/pawel-huryn)'s CLAUDE.md pattern for compounding AI learning across sessions.

Specific patterns in the operating model (time-decay on knowledge, failure-first observation capture, explicit decision vocabulary) were extracted from [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) by selectively adapting what was useful.

The current architecture is a product of those starting points combined with sustained personal experimentation, real delivery sessions, and the application of ProKanban principles to agentic workflows.

## Licence

[CC BY-SA 4.0](LICENSE). Use it, adapt it, share it. Attribution appreciated.

---

Built with [Claude Code](https://claude.ai/code). Coordinated with [Businessmap](https://businessmap.io). Grounded in [ProKanban](https://prokanban.org) principles.
