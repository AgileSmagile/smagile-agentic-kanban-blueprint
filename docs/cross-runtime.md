# Cross-Runtime Compatibility

## The problem with single-runtime systems

Most agentic AI setups are tightly coupled to one runtime. Your operating model lives in a CLAUDE.md that only Claude Code reads. Your persona definitions are formatted for one specific framework. Your knowledge system only works if the agent can access the local filesystem.

This creates a fragile system: if you add an agent on a different platform (a Discord bot, a scheduled cron agent, a different LLM provider), it can't access the institutional knowledge, doesn't follow the operating model, and has no connection to the board. You end up maintaining parallel systems that drift apart.

## The approach: runtime-agnostic files, shared infrastructure

In the production system this blueprint was extracted from, two different agent runtimes share the same operating model:

| Runtime | Where it runs | How agents interact | Example roles |
|---------|--------------|-------------------|---------------|
| **Claude Code** | Terminal (local machine) | File read/write, bash, tool use | Orchestrator, product sub-agents, research agents |
| **OpenClaw** | Raspberry Pi via Discord | Discord messages, bash via gateway | Lead advisor, monitoring sentinel, accountant |

Both runtimes read the same files. Both interact with the same Kanban board. Both contribute to the same knowledge system. The files don't care which runtime is reading them.

## What's shared vs. what's runtime-specific

### Shared (runtime-agnostic)

| Component | Used by | How |
|-----------|---------|-----|
| **Knowledge system** (knowledge/) | Both | Read rules/hypotheses before work; write to domain files after |
| **Board CLI** (bin/board-cli) | Both | Any agent with bash access can run it |
| **Operating model** (agent-guidelines.md) | Both | Loaded into context at startup, regardless of runtime |
| **Persona files** (soul.md, instructions.md) | Both | Loaded as system context; format is plain markdown |

### Runtime-specific

| Component | Runtime | Why |
|-----------|---------|-----|
| **CLAUDE.md** | Claude Code | Claude Code reads this file automatically on startup. OpenClaw agents load their context differently. |
| **File naming conventions** | Both (differently) | Claude Code auto-loads `CLAUDE.md` (uppercase). OpenClaw auto-loads uppercase files like `SOUL.md` and `AGENTS.md`. See naming note below. |
| **Tool permissions** | Claude Code | Claude Code has its own permission model (allow/deny tools). OpenClaw uses a different access control layer. |
| **Discord integration** | OpenClaw | Channel bindings, bot tokens, message formatting are Discord-specific. |
| **File system access** | Claude Code | Direct read/write. OpenClaw agents access files through their gateway. |

### File naming: uppercase matters for auto-loading

Both Claude Code and OpenClaw auto-load specific files on startup, but each has its own conventions:

- **Claude Code** auto-loads `CLAUDE.md` (must be uppercase) from the project root and parent directories.
- **OpenClaw** auto-loads uppercase files from the agent workspace: `SOUL.md`, `AGENTS.md`, and similar uppercase-named config files. Lowercase variants (`soul.md`, `instructions.md`) are **not** auto-loaded; they must be explicitly referenced in the agent configuration.

If you want a persona file to be picked up automatically by OpenClaw, name it `SOUL.md` (uppercase). If you're loading it explicitly via config, the case doesn't matter. This repo uses lowercase filenames (`soul.md`, `instructions.md`) for readability and portability; rename to uppercase if your runtime requires it for auto-loading.

**Practical recommendation:** if you're running both runtimes against the same workspace, you can either:
- Use uppercase filenames and let both runtimes find what they need automatically
- Use lowercase filenames and explicitly configure paths in each runtime's config
- Use both: `CLAUDE.md` for Claude Code (it ignores `SOUL.md`), `SOUL.md` for OpenClaw (it ignores `CLAUDE.md`)

There's no conflict. Each runtime looks for its own files and ignores the others.

## How it works in practice

### Startup

**Claude Code agent:**
1. Reads `CLAUDE.md` (auto-loaded, must be uppercase)
2. Reads agent-guidelines.md (instructed in CLAUDE.md)
3. Reads knowledge/INDEX.md, then relevant domain rules
4. Checks the board via `board-cli`

**OpenClaw agent:**
1. Loads `SOUL.md` (auto-loaded if uppercase) or soul.md (if explicitly configured)
2. The soul file includes the operating model principles
3. Reads knowledge system files from the shared workspace
4. Checks the board via `board-cli` (same CLI, same board)

Both agents arrive at the same understanding of:
- What's in flight (board state)
- What rules apply (knowledge system)
- How to behave (operating model)
- Who they are and what they're responsible for (persona)

### During work

Both runtimes:
- Create and move cards via `board-cli`
- Add comments for progress updates
- Block/unblock cards when hitting obstacles
- Follow the same autonomy boundaries
- Reference the same WIP limits and SLE targets

### After work

Both runtimes write directly to the relevant domain files in the knowledge system:

```
knowledge/<domain>/knowledge.md    # New observations
knowledge/<domain>/hypotheses.md   # Patterns under test
knowledge/<domain>/rules.md        # Confirmed patterns
```

It doesn't matter which runtime wrote the entry. The domain files are the shared learning layer.

## Design principles that enable this

### 1. Plain markdown, no framework syntax

Every file in this system is plain markdown with optional YAML frontmatter. No framework-specific annotations, no custom DSLs, no config formats that only one tool can parse. Any LLM that can read text can use these files.

### 2. The board CLI is the only integration point

Agents don't interact with the board through runtime-specific APIs. They all use the same bash CLI wrapper. If your agent can run a shell command, it can manage the board.

### 3. The knowledge system uses the filesystem as the protocol

No database, no API, no message queue. Files in directories. Any agent that can read and write text files can participate in the knowledge system, regardless of runtime.

### 4. Persona files separate identity from capability

Soul files define who the agent is (values, character, communication style). Instruction files define what the agent does (responsibilities, constraints, tools). Neither depends on runtime features. A Claude Code agent and a Discord bot can share the same soul while having different instruction sets.

### 5. The operating model is descriptive, not prescriptive about tooling

"Create a card before starting work" doesn't say which tool to use. "Never display secrets" doesn't depend on a specific secrets manager. The policies are expressed as principles, with tool-specific commands as examples rather than requirements.

## Adding a new runtime

If you wanted to add a third agent runtime (say, a scheduled cron agent, or an agent on a different LLM provider):

1. **Give it access to the knowledge directory.** Read for rules/hypotheses, write for observations and learnings.
2. **Give it access to the board CLI.** Or implement the same API calls in whatever language/framework the runtime uses.
3. **Load the relevant persona files** into its system context.
4. **Load the operating model** (or a subset relevant to its role) into its system context.

That's it. The new agent immediately benefits from every rule, hypothesis, and observation that existing agents have accumulated. And its own contributions flow back to the domain files to benefit everyone else.

## Why this matters

The compound value of the knowledge system scales with the number of agents contributing to it. If that's limited to one runtime, you cap the learning rate. If every agent, regardless of runtime, reads rules before starting and writes observations after finishing, the system learns faster.

More practically: you probably won't run all your agents on one platform forever. Tools change. New frameworks appear. Having an operating model that survives a runtime migration means you keep institutional knowledge even when you swap the engine underneath.
