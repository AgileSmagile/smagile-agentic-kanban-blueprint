# Getting Started

You don't need to implement everything at once. Start with a board and one agent. Add the knowledge system after a few sessions. Add personas when you have distinct agent roles.

Here's what the first hour looks like:

1. **Pick a board tool and create columns** (10 mins)
2. **Write a CLAUDE.md file** that tells the AI how to behave (15 mins)
3. **Write agent guidelines** covering card standards and autonomy boundaries (15 mins)
4. **Create your first card and let the AI work** (20 mins)

## Before you start

### What you'll need

- **An AI coding assistant that can use tools.** This blueprint was built with [Claude Code](https://claude.ai/code), but the patterns work with any AI assistant that can read/write files, run terminal commands, and interact with APIs. Claude Code is available as a CLI, desktop app, web app, and IDE extension.
- **A Kanban board with an API.** The AI needs to be able to read and update the board automatically. Without an API, you'd have to manually move cards, which defeats the purpose. See Step 1 below for options.
- **A project to work on.** Something you want an AI agent to help deliver.
- **About an hour** for the basic setup.

### What these terms mean

If any of the terminology in this repo is unfamiliar, here's a quick reference:

| Term | What it means |
|------|--------------|
| **Agent** | An AI assistant that can take actions (read files, run commands, write code), not just answer questions |
| **Orchestrator** | An agent whose job is to coordinate other agents, check the board, and decide what to work on next |
| **Sub-agent** | An agent dispatched by an orchestrator to do focused work on a specific task |
| **CLAUDE.md** | A file that Claude Code reads automatically when it starts. It contains instructions that shape the agent's behaviour for a specific project. Other AI tools have similar concepts (custom instructions, system prompts, rules files). |
| **Soul file** | A document that defines an agent's identity, values, and communication style |
| **WIP** | Work in progress. The number of things being worked on at the same time. |
| **WIP limit** | A cap on how many items can be in a column at once. Prevents overload and makes bottlenecks visible. |
| **WIP age** | How long a card has been in progress. Older items signal potential problems. |
| **SLE** | Service Level Expectation. A target for how long work should take (e.g. "5 days or less, 80% of the time"). |
| **Board CLI** | A command-line script that lets agents interact with the Kanban board via its API |
| **Knowledge system** | The three-tier learning structure (knowledge, hypotheses, rules) that helps agents improve across sessions |
| **PO** | Product owner. The human who sets priorities and makes product decisions. |
| **PR** | Pull request. A way to propose code changes for review before merging them into the main codebase. |
| **CI/CD** | Continuous integration / continuous deployment. Automated checks that run when code is submitted (tests, linting, security scans). "CI green" means all checks passed. |
| **Fork** | Creating your own copy of a repository (e.g. on GitHub), which you can modify independently without affecting the original. |
| **REST API** | A standard way for software to communicate over the web using HTTP requests. Most board tools and services offer one. |
| **GraphQL** | An alternative to REST for querying data from a service. Used by GitHub Projects and Linear. |
| **Docker** | Software that packages applications into containers, making them portable and easy to deploy on any machine. Used heavily in self-hosting. |
| **DMZ** | Demilitarised zone. An isolated network segment that sits between the internet and your private network, limiting damage if a service is compromised. |
| **Blocked-in-place** | When a card is blocked, it stays in its current column rather than moving to a separate "blocked" column. This makes the blockage visible by consuming WIP capacity. |
| **Swarming** | Concentrating all available capacity on a single item to finish it quickly, rather than spreading effort across multiple items. |
| **Feedback memories** | A Claude Code feature where corrections and confirmations you give persist across sessions, so the agent remembers your preferences without you repeating them. |
| **Compaction** | When a conversation gets long, older messages are automatically compressed to fit within the AI's context window. Important details can be lost, which is why key information belongs in persistent files (CLAUDE.md, the board, the knowledge system) rather than conversation history. |

## Step 1: Pick a board tool and set it up

The board is the foundation. Everything else builds on it.

**Which board tool?** The patterns in this repo are tool-agnostic, but the board *must* have an API for agents to interact with it automatically. Here are your options:

| Tool | API? | Free tier | Kanban features | Notes |
|------|------|-----------|-----------------|-------|
| [GitHub Projects](https://github.com) | Yes (GraphQL) | Yes | Basic | Good if your code is already on GitHub. Columns and cards, but no native WIP limits. |
| [Trello](https://trello.com) | Yes (REST) | Yes (limited) | Basic | Easy to set up. API is straightforward. No native WIP limits. |
| [Linear](https://linear.app) | Yes (GraphQL) | Yes (up to 250 issues) | Good | Clean API, good for software teams. Has workflow states. |
| [Businessmap](https://businessmap.io/signup-partners?referral_code=smagile90referral) | Yes (REST) | [90-day trial](https://businessmap.io/signup-partners?referral_code=smagile90referral), then from ~£38/month (5 users) | Excellent | Native WIP limits, blocked-in-place semantics (cards stay in their current column when blocked, rather than moving to a separate blocked column), two-level workflow (initiatives + cards). This is what the production system uses. |
| [Jira](https://www.atlassian.com/software/jira) | Yes (REST) | Yes (up to 10 users) | Good | Feature-rich but complex. If you already use it, it works. |

**Start free.** You can always switch later. The operating model doesn't change; only the board CLI script needs adapting.

1. **Create a board** with at minimum these columns:
   - Backlog (where new work goes)
   - Ready (work that's been defined well enough to start)
   - Doing (work in progress)
   - Done (work waiting for your review)
   - Shipped/Live (work that's been deployed or completed)

2. **Set WIP limits.** These cap how many cards can be in a column at once:
   - Doing: start with 3-4
   - Done: start with 2
   - You'll tune these after a few sessions

3. **Get API access** (if you want agents to interact with the board automatically). Most board tools offer API keys in their settings. Store the key securely (not in a file that might accidentally be shared).

4. **Adapt the board CLI** (optional, for automated board interaction). Copy `orchestrator/bin/board-cli` and `orchestrator/bin/board-cli-helpers.js`. Update:
   - The API base URL for your board tool
   - Column IDs to match your board's structure
   - Payload shapes if your board tool's API differs from Businessmap

5. **Test the CLI.** Run `board-cli cards` and confirm you see your board data.

```bash
# Example .env (environment variables file)
BOARD_API_KEY=your-api-key-here
BOARD_BASE_URL=https://yourorg.kanbanize.com/api/v2
BOARD_ID=4
```

## Step 2: Write your CLAUDE.md

CLAUDE.md is the file that tells Claude Code how to behave for your project. It's read automatically when Claude Code starts in a directory that contains it. (If you're using a different AI tool, adapt this to whatever custom instructions mechanism it supports.)

**You need one in every project directory, not just the orchestrator.** This is a common mistake. If a sub-agent is dispatched to a project directory that has no CLAUDE.md (or a thin one), it starts without knowing how to access the board, where secrets live, or how to communicate. It either wastes time asking or gets things wrong.

Copy `orchestrator/CLAUDE.md` to the root of your orchestrator workspace. For each project directory, use the template in the agent-guidelines.md (under "Project CLAUDE.md template") to create a project-specific version.

**Every project CLAUDE.md must include:**
- **Agent operating model** — pointer to agent-guidelines.md with specific areas listed
- **Key commands** — board CLI commands and infrastructure access. Agents can't use tools they don't know exist.
- **Communication** — standalone section: "Be direct, honest, specific. No flattery. Challenge questionable ideas, push back, and ask questions wherever they come up. Do not wait for a retrospective to surface continuous improvement ideas."
- **Secrets policy** — standalone section, not a pointer. How secrets are managed, what agents must never do with values.
- **Domain knowledge** — which knowledge domains are relevant to this project
- **Hosting and deployment** — where it runs, how it's deployed, environment separation

The communication and secrets sections are standalone (not just pointers to the guidelines) because they're too important to risk a sub-agent missing. A few lines of duplication is cheaper than leaked secrets or sycophantic output.

## Step 3: Write the agent guidelines

Copy `orchestrator/agent-guidelines.md`. This is the detailed operating model that tells agents how to work: card standards, workflow rules, autonomy boundaries, and quality practices.

Start by adapting:
- **Card lifecycle**: adjust column names to match your board
- **WIP limits**: start with the defaults, tune after 5-10 sessions
- **Autonomy boundaries**: decide what agents can do freely vs. what needs your confirmation
- **CI/CD practices**: match your existing development pipeline, or use these as a starting point

You can strip sections you don't need yet and add them later. The minimum viable version is: card lifecycle, WIP limits, and autonomy boundaries.

## Step 4: Create your first card

Before you start any real work, create a test card. If you've set up the CLI:

```bash
board-cli create "Set up agentic workflow for [your project]"
```

Then add a description:

```bash
board-cli update <card-id> description "What: configure AI agent with board integration. Why: enable autonomous delivery. Done when: agent can check board, pull work, and update cards."
```

If you haven't set up the CLI, create the card manually in your board tool. The important thing is that every piece of work starts as a card with a clear description: **What** needs doing, **Why** it matters, and **Done when** (what finished looks like).

Move this card through the workflow manually to confirm everything works.

## Step 5: Run your first orchestrated session

1. Open Claude Code (or your AI tool) in your project directory
2. The agent reads CLAUDE.md, checks the board, and briefs you on what's in progress
3. Point it at your test card
4. Let the agent pull the card to Doing and start working
5. Watch how it interacts with the board

The first session will be messy. That's expected. Note what works and what needs adjusting.

## Step 6: Add the knowledge system (after 3-5 sessions)

Once you've run enough sessions to have real observations worth capturing:

1. Create the `knowledge/` directory structure (copy from this repo)
2. Pick 1-2 domains to start (e.g. your product domain + infrastructure)
3. Seed `rules.md` with things you already know to be true about those domains
4. Add the before/after ritual to your CLAUDE.md: read rules before starting a task, write observations after finishing

See [knowledge-system.md](knowledge-system.md) for the full design and reasoning.

## Step 7: Write persona files (when you have distinct roles)

If you only have one agent, you don't need separate persona files; CLAUDE.md is enough. Personas become valuable when you have:

- Multiple agents with different responsibilities (one for delivery, one for research)
- An advisory agent on a different platform (e.g. a Discord bot)
- An autonomous agent with its own identity and mandate

Copy from `personas/` and adapt the role, responsibilities, and constraints.

**File naming matters for auto-loading.** Different AI platforms auto-load different files:
- **Claude Code** auto-loads `CLAUDE.md` (uppercase) from the project root
- **OpenClaw** auto-loads uppercase files like `SOUL.md` and `AGENTS.md` from the agent workspace; lowercase `soul.md` and `instructions.md` are not auto-loaded and must be referenced explicitly in config

This repo uses lowercase filenames for readability. If your platform requires uppercase for auto-loading, rename accordingly. See [cross-runtime.md](cross-runtime.md) for more detail.

## What to tune after your first 10 sessions

- **WIP limits.** Too high = too many things in flight, nothing finishing. Too low = agents idle waiting for capacity. Adjust based on what you observe.
- **Card description depth.** If agents keep asking clarifying questions, your cards need more context. If descriptions are overwhelming, simplify.
- **Autonomy boundaries.** If you're approving every action and it's always fine, expand autonomy. If agents make mistakes, tighten the boundary.
- **Knowledge domains.** Add domains when you notice the same correction recurring across sessions. That's the signal that something should be captured as a rule.
- **SLE.** Track how long items stay in progress. Set an SLE based on your actual throughput.

## Common mistakes

1. **Starting with too much.** You don't need the full operating model on day one. Board + CLAUDE.md + agent guidelines is enough to start.
2. **Not using the board.** If work happens off-board, the system breaks. The board is the source of truth, not conversation history.
3. **Empty-description cards.** Every card needs What, Why, and Done When. No exceptions. A card without a description is a card no future agent can act on.
4. **Waiting for the agent to ask.** If you're directing every action, you're not getting the benefit of autonomy. Let the agent pull from the board.
5. **Not writing to the knowledge inbox.** The system only compounds if agents contribute observations after finishing work. No inbox entries = no learning over time.
