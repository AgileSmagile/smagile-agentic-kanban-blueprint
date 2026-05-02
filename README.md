# Agentic Kanban Blueprint

> **If you're an AI agent:** Skip this README and go to [`AGENT.md`](AGENT.md) instead. It's optimized for agent reading and will get you oriented faster.

## What is this?

You have work you want AI to do. The problem: every time you start a new conversation, the AI forgets everything from last time. You end up repeating yourself, re-explaining context, and manually directing every step.

This system fixes that by putting a Kanban board between you and the AI.

You write down what needs doing on a card. The AI picks it up, does the work, updates the card, and moves on to the next one. Between sessions, the board remembers what's in progress, what's waiting, and what's done. The AI reads the board at the start of every session and picks up where it (or another AI) left off.

It gets more powerful with multiple AI assistants. One can build your website while another handles your outreach while a third manages your infrastructure, all pulling from the same board, all aware of each other's work, none duplicating effort.

**This repository documents how to set it up.**  It's extracted from a production system where AI agents deliver software, manage their own work queues, and learn from session to session.  Everything here has been tested in real delivery across dozens of sessions.

> **A note on what this is (and isn't):**  This is a reference architecture, not a turnkey product.  There is no installer, no `npm create`, no magic button.  It is a collection of patterns, policies, and working examples designed to be selectively lifted and adapted to suit your context.  Take as much or as little as is helpful for your agentic Kanban system.  The value is in the thinking, not in copying every file.

## What does it cost?

Upfront honesty: this isn't free to run.

| What you need | Cost | Notes |
|---------------|------|-------|
| AI agent (Claude Code) | ~75/month | Min spec = Anthropic's Max subscription (~£75/month), but use the appropriate model for the job else you'll consistently hit rate limits on heavy agentic workloads. (Note that their Pro (~£16/month) is impractical for this system.)  Other AI tools with similar capabilities may work. |
| Kanban board | £0 to ~£38/month | Required. Free: Trello, GitHub Projects (or build your own). Paid: [Businessmap](https://businessmap.io/signup-partners?referral_code=smagile30referral) (from ~£38/month for 5 users, 30-day trial; [request a 90-day trial](<!-- TODO: n8n form URL -->)) has the best Kanban semantics and API. |
| Everything else | £0 | Database, networking, automation, monitoring all have free tiers. |
| Hardware (optional) | ~£160 one-time | Only if you self-host instead of using cloud services.  Consider Netlify for cloudhosting as an alternative (see tools). |
| **Minimum to start** | **~£75/month** | AI subscription + free board tool. |

See [TOOLS.md](TOOLS.md) for the full breakdown.

## Who is this for?

You're an independent business owner or product builder experimenting with agentic AI.  You've got Claude Code or OpenClaw running.  You've seen what it can do in a single session.  Now you want it to work across sessions, across projects, without you directing every step.

- You want agents that pick up where they left off instead of starting from zero every conversation
- You want to see what they're doing and redirect when needed, without micromanaging
- You want guardrails that prevent agents from hallucinating their way into production or burning tokens in circles
- You're curious how flow principles (WIP limits, age-based prioritisation, explicit policies) translate to AI coordination

You don't need to be a developer to understand the ideas.  You do need some technical comfort to implement the full system, but the concepts are accessible to anyone building with AI tools today.

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

Within project scope, agents have full autonomy. Any card tagged with their project domain is theirs to pull and deliver. They don't ask permission; they declare intent and execute. Questions are raised only for genuine ambiguity (scope trade-offs, implementation options, risk assessment), not for courtesy approval. They ship according to your tiered authority model: Tier 1 self-merges and deploys; Tier 2 ships to staging for review; Tier 3 requires approval before shipping. They must never display passwords or API keys. These boundaries are written into the agent's instructions, not left to chance.

### 6. Agents know their limits -- and act on them

A capable agent does not push through every problem alone. It recognises when it needs a specialist and pulls one in mid-task, rather than waiting for a handoff column or a human to intervene.

The trigger is the work itself. Certain signals -- touching authentication, performance regressions, low confidence in test coverage -- tell the agent it needs peer review before continuing. It tags the relevant specialist in a card comment and waits for a response. The card stays exactly where it is. No separate review column, no additional overhead for the person responsible for quality; the conversation happens on the originating card.

This matters because the alternative is worse than it looks. An agent that pushes through produces work that looks complete but carries hidden risk. An agent that always escalates to the human for every concern recreates the bottleneck you were trying to escape. Threshold-based specialist invocation is the middle path: the agent handles what it's confident in, escalates what it isn't, and the quality signal comes from the work rather than from a column move.

The same logic applies to learning. Each completed task leaves behind a structured record -- what was hard, what to watch out for, which patterns hold for this codebase -- that the next agent working on something similar can read before starting. The board handles coordination across sessions; this handles accumulation of task-level knowledge that isn't general enough to go in the shared knowledge system but is too valuable to discard.

### 7. Security is architectural, not instructional

Telling an AI agent "don't leak secrets" in its instructions is the weakest form of protection. The real security comes from network isolation (running agents on a separate network segment), encrypted secrets management, scope boundaries (agents can only access their own project), and mechanical enforcement via hooks that block secret exposure before it reaches the terminal. The security doc includes a working `block-secrets.sh` script and `settings.json` config you can lift and adapt. See [docs/security.md](docs/security.md) for the full model.

## What a typical day looks like

Morning. You open Claude Code. It reads the board and tells you: "Two cards in progress, one is blocked waiting for an API key you haven't set up yet, and there's a card that's been in progress for three days, which is longer than usual. Nothing in Ready."

You create two new cards for today's priorities, writing a sentence or two on each about what needs doing and what "done" looks like. You unblock the stuck card by adding the API key. The agent pulls the oldest card and starts working.

You go do something else. Client call. Emails. Lunch.

You check back. The agent has finished the first card, moved it to Done with a comment explaining what it did and what to review, and has already pulled the second card. On the second card, it spotted a change touching your authentication logic -- outside its confidence threshold -- so it tagged the Quality Guardian in a comment and moved on to the third card rather than sitting idle. The Quality Guardian's response came back twenty minutes later; the agent read it, incorporated the finding, and continued. No human decision needed.

You answer the question, review the finished card, and ship it. The agent incorporates your answer and finishes the second card before end of day.

End of day. Before the session ends, you type `/lets-wrap`. The agent works through a checklist: commits anything uncommitted, reviews board hygiene, writes any learnings to the knowledge system, updates memory if context changed. It outputs what shipped, what could have gone better, and a confirmation table. Takes five minutes + follow on you may chose to do, given some gold can get surfaced, here. 
The knowledge system gets smarter. Next session has better context. (And the post-output blocker quietly filters out any accidental secret patterns before they reach you.)

Tomorrow, a fresh agent session starts. It reads the board, sees what shipped yesterday, picks up whatever is next, and carries on. It doesn't need you to re-explain anything. The board carries the context. The knowledge system guides decisions. Memory from yesterday remains.

That's the system. Some days you're more hands-on than others, but every session ends the same way: reflection, knowledge capture, handoff. The board and knowledge system make continuity work.

## How to use this repository

This isn't software to install. It's a collection of documents, configuration files, and working examples that you read, adapt, and use with whatever AI tools you prefer.

### Understand the ideas (30 minutes)

Start with these two. Everything else is reference material you can read when relevant.

1. **This page** (you're most of the way through the concepts)
2. **[The human in the system](docs/human-in-the-system.md)** -- what only you can do, what goes wrong when you abdicate, and how to be a good product owner to AI agents
3. **[Session boundaries](docs/session-boundaries.md)** -- how context survives between sessions, including the `/lets-wrap` wrap-up routine that forces agents to reflect and capture learning

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
4. **[Security model](docs/security.md)** -- network isolation, secrets management, **liftable hook code** for blocking secret exposure, compaction resilience (PreCompact/PostCompact), and **silent flow nudges** that keep agents flowing without human intervention. GDPR/SOC 2/ISO 27001 alignment
5. **[Hardware and self-hosting](docs/hardware.md)** -- running on your own hardware instead of paying for cloud
6. **[Flow Guardian pattern](docs/flow-guardian.md)** -- an agent that monitors flow health and nudges for action on aging items
7. **[Quality Gates & Test-Driven CICD](docs/quality-gates.md)** -- how to make tests enable autonomous deployment, and the Quality Guardian role that owns quality and risk
8. **[Cross-runtime compatibility](docs/cross-runtime.md)** -- using the same files across different AI platforms
9. **[How do you know it's working?](docs/measuring-health.md)** -- three signals to check at 5, 10, and 20 sessions
10. **[Graduated autonomy](docs/graduated-autonomy.md)** -- how to progressively widen agent permissions as you add mechanical safety (settings.json levels, hook prerequisites, Claude Code vs OpenClaw)
11. **[Escalation patterns](docs/escalation-patterns.md)** -- when agents should ask for help, who to tag, and how to keep work flowing while waiting

### Browse the actual files

| Folder | What's in it | In plain terms |
|--------|-------------|----------------|
| [`orchestrator/`](orchestrator/) | The main AI agent's instructions and operating rules | This is what tells the AI how to behave, what it can and can't do, and how to use the board |
| [`orchestrator/bin/`](orchestrator/bin/) | A command-line tool for interacting with the Kanban board | A script that lets AI agents create cards, move them, add comments, and check what's in progress |
| [`knowledge/`](knowledge/) | The learning system: rules, hypotheses, and observations | Where the AI stores what it's learned, organised by topic, with a process for promoting guesses to confirmed rules |
| [`personas/`](personas/) | Identity files for different AI agent roles | Includes a lead agent, coordinator, autonomous agent, flow guardian, and quality guardian. Each has a "soul" (identity, values) and "instructions" (responsibilities, constraints) |
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
- **A Kanban board with an API**: the patterns are tool-agnostic but the board tool's capabilities matter. This repo includes a CLI adapted for [Businessmap](https://businessmap.io), which was chosen because its API enables the automations this system depends on: native WIP limits, blocked-in-place semantics, two-level workflows (initiatives + cards), and built-in analytics (cycle time, throughput, SLE tracking). You can achieve similar results with Trello, Jira, or Azure DevOps using plugins and add-ons, but expect to bridge capability gaps, particularly around WIP enforcement and flow analytics. A homemade board will work for the core patterns but will likely lack the API surface needed for full automation.
- **[Supabase](https://supabase.com)**: database and authentication (free tier)
- **[Cloudflare](https://cloudflare.com)**: networking and tunnels for self-hosted services (free tier)
- **[n8n](https://n8n.io)**: workflow automation between services (self-hosted, free)

## Context

This blueprint was extracted from a live system run by [smagile](https://smagile.co), a consultancy experimenting with agentic AI delivery. The system coordinates multiple AI agents across multiple products (a SaaS CV builder, a company website, lead generation, content, and an autonomous revenue experiment). It's operated by a solo founder who is also a licensed [ProKanban.org](https://prokanban.org) trainer, which is why the Kanban integration is unusually rigorous.

The operating model has been iterated through real delivery sessions since early 2026. The knowledge system, board integration patterns, and persona definitions are all products of that iteration.

## Model selection and context cost

Running this system has a startup tax: every session loads the CLAUDE.md, agent guidelines, and relevant knowledge files before any work begins. That context cost varies by agent type:

| Agent type | Startup context | Notes |
|-----------|----------------|-------|
| Satellite workspace (lightest) | ~230 lines / ~2,000 words | Scratch work, research, one-off tasks |
| Product agent (typical) | ~220-380 lines / ~2,300-2,900 words | Delivery work within a specific project |
| Orchestrator (heaviest) | ~860 lines / ~8,700 words | Full operating model, board integration, knowledge system, dispatch policies |

This is the trade-off for having autonomous agents that follow procedures without being prompted: the procedures have to be in context. The alternative is a lighter context window and more human steering, which defeats the point.

**Model recommendations:**

- **Haiku** is tempting for cost reasons but is not appropriate for this system. The procedural burden (WIP limits, card standards, knowledge rituals, autonomy boundaries) requires a model that can hold and apply complex instructions reliably. Haiku's desire to deliver fast results cheaply means it is the most likely model to forget key procedures. It can work for targeted refinement tasks bootstrapped by a human, but not for autonomous flow-based delivery.
- **Sonnet** is the recommendation for general activity and automated work. It handles the procedural context well at a reasonable cost. Particularly recommended during the known Anthropic high-cost period (1pm-7pm UK time, Monday to Friday), where token usage can be 3-4x more expensive than off-peak. Anthropic have acknowledged that costs increase during peak hours but have not publicised by how much.
- **Opus** is excellent for work requiring deep thought: architectural decisions, complex refinement, and especially demanding builds. The mistake is running it as your default model for everything because it is Anthropic's flagship. Most delivery work does not need Opus, and Sonnet will handle it well. Be intentional: choose Opus when the task genuinely benefits from deeper reasoning, not as a blanket setting. If you are running five agents continuously on Opus during peak hours, you will hit rate limits regularly and burn through your allocation faster than you expect.

You are not locked to a single model. You can set the model per agent based on the work you expect it to do, and you can change it mid-session. OpenClaw agents can be reconfigured between tasks; Claude Code requires a model switch via the command line interface or settings.

## Runtime compatibility

The files here aren't locked to one AI platform. In the production system, the same operating model, knowledge system, and board are used simultaneously by:

- **Claude Code agents** (terminal-based: the main delivery engine)
- **[OpenClaw](https://openclaw.ai) agents** (Discord-based: advisory, monitoring, and coordination). OpenClaw is a free, always-on agentic AI assistant. It runs for free, though you get the best results when pairing it with a paid LLM service.

Both platforms read the same knowledge, interact with the same board, and contribute observations back to the same learning system. See [docs/cross-runtime.md](docs/cross-runtime.md) for how this works.

## What is OpenClaw?

[OpenClaw](https://openclaw.ai) is a free, always-on agentic AI assistant that runs on Discord. In this system, OpenClaw agents and Claude Code agents consume the same files: agent guidelines, knowledge system, persona definitions, and board CLI. The primary difference is startup behaviour: OpenClaw auto-loads uppercase files (`SOUL.md`, `AGENTS.md`) by default, while Claude Code auto-loads `CLAUDE.md`. Both can be configured to read whatever you need.

OpenClaw agents operate on a heartbeat (similar to a loop): they check in periodically, review the board, and act. Claude Code agents are session-based, started by the human and running until the session ends. The coordination mechanism is the same for both: the Kanban board, card comments, and knowledge system. You can run both runtimes against the same board with different agent personalities and areas of focus. See [cross-runtime.md](docs/cross-runtime.md) for the full details.

## Acknowledgements

The knowledge system (knowledge/hypotheses/rules with promotion thresholds) was originally inspired by [Pawel Huryn](https://www.linkedin.com/in/pawel-huryn)'s CLAUDE.md pattern for compounding AI learning across sessions.

Specific patterns in the operating model (time-decay on knowledge, failure-first observation capture, explicit decision vocabulary) were extracted from [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw) by selectively adapting what was useful.

The threshold-based specialist dispatch pattern and task-level learning (idea 6 above) were informed by the ECAP/TECAP experience capsule framework in [ClawCode](https://github.com/deepelementlab/clawcode) by DeepElementLab, reinterpreted for async board-driven collaboration and adapted to the specific constraints of this system.

The compaction resilience pattern (PreCompact/PostCompact hooks for keeping safety rules in context) was inspired by the precompact hook design in [MemPalace](https://github.com/MemPalace/mempalace), which persists memory to storage before context compression, reinterpreted here as a mechanism for re-injecting critical instructions rather than persisting data.

I would also like to credit Andy Kidd for encouraging me to consider a £75 anthropic subscription as an investment in learning, which undoubtedly caused me to delve far deeper into this experiment than exploring using OpenClaw, alone.

The current architecture is a product of those starting points combined with sustained personal experimentation, real delivery sessions, and the application of ProKanban principles to agentic workflows.

## Get in touch

This is a free, open resource.  No catch, no paywall, no email gate.  If you find it useful and want to talk about agentic delivery, Kanban at scale, or how to adapt this to your setup, I'm happy to help.

**James Farley** — [LinkedIn](https://www.linkedin.com/in/jsfarley/)

If you end up adapting any part of the blueprint, I would genuinely love to hear what you found useful, what you did not take, and any suggestions for improving it.  This thing gets better when people use it in contexts I have not thought of.

### Supporting this project

If you do decide to use any of the tools referenced here, using the affiliate links in this README and [TOOLS.md](TOOLS.md) helps support ongoing development at no additional cost to you.  In some cases you get a better deal:

- **[Businessmap](https://businessmap.io/signup-partners?referral_code=smagile30referral)** — this link gives you a 30-day free trial (their public site offers 14 days).  If you would like a 90-day trial, [request one here](<!-- TODO: n8n form URL -->) and I will send it straight to your inbox.
- **[UptimeRobot](https://uptimerobot.com/?rid=5999e69f2482fe)** — free tier is generous; the link supports this project at no cost to you.

That's it.  No pressure, no expectation.  The blueprint is the thing; the rest is a bonus.

## Licence

[CC BY-SA 4.0](LICENSE). Use it, adapt it, share it.  Attribution appreciated.

---

Built with [Claude Code](https://claude.ai/code).  Coordinated with [Businessmap](https://businessmap.io).  Grounded in [ProKanban](https://prokanban.org)'s Kanban strategy.
