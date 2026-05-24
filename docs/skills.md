# Skills

Skills are structured prompts that agents invoke via slash commands (e.g. `/lets-start`, `/ntest`). Each skill lives in its own directory under `skills/` and contains a single `SKILL.md` file with YAML frontmatter and a step-by-step methodology. When an agent or the product owner invokes a skill, the harness loads the SKILL.md content into the agent's context and the agent works through it.

Skills are not code. They are structured instructions that encode repeatable processes, quality gates, and coordination patterns. They standardise how agents approach common tasks without removing judgement; the agent still decides what to write, what to flag, and what to skip, but the skill ensures nothing is forgotten.

## Skill inventory

### Session lifecycle

These skills bookend every working session. They ensure agents orient before pulling work and capture everything before context is lost.

**[lets-start](../skills/lets-start/SKILL.md)** — Session start checklist. Runs inbox check, board state review, knowledge freshness audit, and intent declaration before pulling any work. Ensures the agent understands the current state of the system before acting on it. The counterpart to `/lets-wrap`.

**[lets-wrap](../skills/lets-wrap/SKILL.md)** — End-of-session wrap-up checklist. Walks the agent through git hygiene, board hygiene, inbox processing, CI items, knowledge capture, memory updates, environment parity, PO feedback, session summary, loose ends audit, and daily log. The most important skill in the system: when a session closes, anything not captured is permanently lost.

### Quality

These skills provide structured testing methodologies. They can be invoked on any project at any time and produce categorised findings, board cards, and regression tests.

**[ntest](../skills/ntest/SKILL.md)** — Security penetration test and compliance audit (GDPR, SOC 2, ISO 27001). Works through attack surface mapping, vulnerability testing across seven categories, and three compliance frameworks. Every finding must be specific: file path, line number, attack vector, remediation. Produces board cards for findings at MEDIUM severity or above and writes regression tests for confirmed vulnerabilities.

**[xtest](../skills/xtest/SKILL.md)** — Exploratory testing from a user's perspective. Validates happy paths, explores boundaries (empty states, extreme values, concurrency, state transitions), tests role and permission edge cases, assesses error recovery, checks cross-feature interaction, and reviews automated test quality. The closest thing to having a human QA team. Findings are categorised as bugs, UX issues, missing features, fragile areas, or test gaps.

**[regression-gate](../skills/regression-gate/SKILL.md)** — Automated regression gate for API route changes. After feature tests pass, walks the agent through six security vectors (cross-tenant isolation, ownership chains, role enforcement, auth enforcement, input validation, token-gated routes) for any new or modified route files. Produces regression tests and documents coverage on the card. Triggered automatically by a hook, not invoked manually.

### Coordination

These skills handle cross-agent communication and timing in a multi-agent system.

**[watch-card](../skills/watch-card/SKILL.md)** — Polling loop for cross-agent dialogue. After posting a routing comment on a card and waiting for another agent to respond, this skill sets up a 10-minute polling loop that checks the agent's inbox for a response. After 6 attempts (60 minutes) with no reply, it auto-blocks the card and notifies the product owner. Prevents silent stalls in agent-to-agent communication.

## Human-invokable vs agent-only skills

Skills fall into two categories based on who triggers them:

**Human-invokable skills** are invoked by the product owner or by agents on the product owner's instruction. These are: `lets-start`, `lets-wrap`, `ntest`, and `xtest`. The product owner types the slash command; the agent executes the methodology. Agents may also invoke `ntest` and `xtest` autonomously when they judge testing is needed, but the decision to test is deliberate.

**Agent-only skills** are invoked programmatically, not by humans typing a command. These are: `regression-gate` and `watch-card`. The regression gate is triggered by a hook that fires after tests pass when the diff includes API route files (see [review-trigger-hook.md](review-trigger-hook.md) for the hook configuration). The watch-card skill is invoked by an agent when it needs to wait for a response from another agent; no human types `/watch-card` directly.

The distinction matters for skill design. Human-invokable skills can ask clarifying questions (e.g. "which project?") because a human is present. Agent-only skills must be fully autonomous; they receive their parameters from the invoking mechanism and run to completion without interaction.
