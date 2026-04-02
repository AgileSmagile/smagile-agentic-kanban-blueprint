# Agent Operating Model

## How This Works

This workspace is the orchestration hub. The product owner works with the orchestrator here. The orchestrator dispatches sub-agents to work on specific projects in their own context windows.

Sub-agents are **task-based, not persistent**. They're spun up, do focused work, update the board, and finish. The **Kanban board is the single source of truth** for all work across all initiatives. It provides continuity between sessions.

### Typical session flow

1. PO arrives, orchestrator checks the board
2. Brief on progress, blockers, decisions needed
3. PO sets priorities
4. Orchestrator dispatches agents in parallel
5. Agents work independently, update the board as they go
6. Orchestrator flags anything needing PO input
7. Repeat

### Autonomy summary

The PO prioritises initiatives and card order. The orchestrator pulls work and delivers autonomously.

- **Don't wait for permission** to read, edit, write, search, build, test, or commit
- **Do confirm** before git push (settings enforce this)
- **Use the board** — create cards before starting work, move them through the workflow, add comments for meaningful updates
- **Tag the PO** — include their @mention in comments that need attention (review guidance, blockers, questions). Not on routine progress updates
- **Flag blockers** — if something needs the PO (account setup, credentials, architectural decision), block the card with clear instructions and move to the next piece of work

## Board Integration

- **Board**: your Kanban board (any tool with an API)
- **CLI tool**: `bin/board-cli`
- **Every piece of work gets a card before starting**

### Minimum card content

Every card must have enough for an agent to pick it up and deliver without asking clarifying questions. At creation, include:

- **Title**: Clear, specific action (not vague nouns). Good: "Add password reset flow to auth pages". Bad: "Auth improvements".
- **Description**: 1-3 sentences covering:
  - **What**: What needs to change or be built
  - **Why**: The reason this matters (even briefly — "users can't reset passwords" is enough)
  - **Done when**: A simple statement of what "finished" looks like. Can be a sentence or a short checklist.

Optional but helpful when relevant:
- **Constraints**: Tech choices, dependencies, things to avoid
- **Project path**: Which codebase this card targets (if not obvious from context)

Cards created by agents must follow the same standard — no exceptions, including batch creation. If an agent can't write a meaningful "done when" for a card it's creating, that's a signal the work isn't well enough understood yet — it should go to evaluation, not ready.

**A card with an empty or stub description must never be created.** The board is the only continuity mechanism across agent sessions. Sessions end, context windows reset, agents rotate. If the card doesn't carry the intent, the intent is lost. Empty-description cards become orphaned stubs that no future agent can act on — they waste WIP and rot in the backlog. Treat an empty description the same way you'd treat a failing build: fix it before moving on.

This is a minimum spec, not a template to fill robotically. A one-liner is fine if the intent is obvious. The test is: could a fresh agent pick this up cold and deliver something correct?

### Card lifecycle

1. Create card with parent initiative ID
2. Move to **Doing** when starting work
3. Add comments for meaningful progress updates (not noise)
4. **Tag the PO in comments that need their attention.** Use this for: review guidance, blocker notifications, questions, and any comment where the PO needs to act. Do not tag on routine progress updates.
5. If blocked mid-progress: block the card in place with a clear reason. Card stays in Doing — never moves columns until work is complete or cancelled. Tag the PO with enough context to act without asking follow-up questions.
6. When unblocked: clear the block, then continue work
7. When work is complete, choose one:
   - **Shipped/Live is the default path.** Tests pass, build clean, no product decision required — move directly to Shipped/Live. Most cards should take this path. Technical work, bug fixes, security hardening, infrastructure changes, refactoring, and backend logic all ship directly.
   - **Done (review) is the exception, not the default.** Only use Done when the card genuinely requires the PO's product judgement before it can ship — specifically: UI/UX changes users will see, user-facing copy, architectural decisions that constrain future work, or product experience changes. If in doubt, ask: "Would shipping this without the PO seeing it first risk something they'd want to change?" If no, ship it.
   - **Done is full**: block the card in Doing with reason "Done at capacity"
8. If rework is flagged in Validation/Rework: resolve within that column — do not move the card back
9. Move to Shipped/Live when deployed/confirmed
10. Move to Closed when done
11. **Auto-archive**: cards in Closed are archived after 14 days. This keeps the board clean without manual housekeeping. If your board tool supports automation rules, configure this as a scheduled policy rather than relying on agents to remember.

### WIP limits

<!-- Adapt these numbers to your team size and throughput -->

**Initiatives workflow:**
- **Next**: 3
- **Now**: 3

**Cards workflow:**
- **Doing**: 4
- **Done (review)**: 2
- **Validation/Rework**: 3

- No limits on upstream (Backlog, Evaluation, Ready) or downstream (Shipped/Live, Closed)
- Initiatives workflow controls strategic volume; card workflow manages execution flow
- WIP limits are targets, not just ceilings. Being under WIP is as problematic as being over.
- Doing + Done + VR together constitute active WIP. **Most cards must exit Doing directly to Shipped/Live.** Done is not a safe default or a "finished" column — it is a holding column exclusively for cards that require the PO's product/UX/architecture judgement before shipping. Putting a technical card in Done wastes review capacity and blocks the Done WIP limit. VR is the PO's pull, never the agent's push.

### WIP age

**Work item age is the single most important aspect of Kanban** (ref: [Kanban Pocket Guide](https://prokanban.org/kanban-pocket-guide/)). Not WIP limits, not visualisation, not throughput. The only question: are items aging unnecessarily? All other practices exist to prevent unnecessary aging.

Run `board-cli wip-age` on session start and when making prioritisation decisions.

- **Initiatives**: start = transition into Now. End = transition to Done.
- **Cards**: start = transition into Doing. End = transition to Shipped/Live or Closed. Cards in Done or VR continue accumulating WIP age — age measures total elapsed time since starting, not time in the current column.
- **Older items get priority.** When choosing what to work on, favour the oldest unblocked item. High age signals a flow problem — investigate and resolve before pulling new work.

### Service Level Expectations (SLEs)

Every workflow level needs an SLE. The SLE is a probabilistic forecast: "X% of items will finish in Y days or less." It drives the age-based intervention triggers, right-sizing decisions, and flow health monitoring. Without a declared SLE, the percentile triggers have nothing to calculate against.

**Set SLEs upfront, even as guesses.** If you have no historical data, make your best estimate. The Kanban Pocket Guide is explicit: "If historical cycle time data does not exist, a best guess will do until there is enough historical data for a proper SLE calculation." A wrong SLE that gets refined is infinitely more useful than no SLE at all.

**Recalibrate from data.** Once you have 10+ completed items at a given level, calculate your actual 85th percentile cycle time and update the SLE. Recalibrate whenever you make a significant process change (WIP limit adjustment, workflow restructure, policy change). The old data from before the change is no longer representative.

<!-- Replace the example values below with your own -->

| Workflow level | SLE | Percentile | Measured from |
|---------------|-----|-----------|---------------|
| **Initiatives** (epics, features) | 5 days or less | 85th percentile | Now entry → Done |

In an agentic system, card-level cycle times are typically short enough that a formal card SLE adds more noise than signal. The initiative SLE is where flow discipline matters most: initiatives that are too big sit in Now eating WIP and blocking strategic flow.

**The initiative SLE is also a right-sizing guard rail.** Before pulling an initiative from Next into Now, ask: "Can this initiative realistically complete within the SLE based on what we know?" If the answer is no, it needs to be broken down into smaller initiatives before it enters Now. An oversized initiative in Now will age past its SLE, block other initiatives from entering, and compress the strategic planning horizon. Break it down first.

Right-sizing strategies for initiatives:
- **Slice by outcome.** If an initiative delivers value to multiple audiences or solves multiple problems, each outcome is a candidate for its own initiative.
- **Slice by risk.** Separate the part you understand from the part that needs discovery. Ship the known part; run the discovery as its own initiative.
- **Slice by dependency.** If one part is blocked on external input and another isn't, split them. Don't let the blocked half age the whole initiative.

**Visualise the SLE on the board.** If your board tool supports it, display the SLE and percentile lines. Every agent and the PO should be able to see at a glance which initiatives are approaching or past their SLE.

- When an initiative approaches its SLE, escalate: flag it, investigate what is blocking flow, and take action to finish or unblock it. An initiative ageing past the SLE is a system-level problem, not just a scheduling inconvenience.

### Age-based intervention triggers

Use SLE percentiles as escalation triggers. As items age, the probability of missing the SLE increases. Actions must escalate accordingly:

| Item age reaches | Meaning | Action |
|-----------------|---------|--------|
| **50th percentile** | Larger than half of all previous items. SLE breach probability doubled. | **Investigate.** Comment on card: is it blocked? Too big? Needs swarming? |
| **70th percentile** | Coin-flip chance of missing SLE. | **Escalate.** Tag PO. Recommend: swarm, break down, or unblock. |
| **85th percentile (SLE)** | SLE reached. | **Alert.** PO with urgency. Immediate attention needed. |
| **Beyond SLE** | In violation. Every day compounds risk. | **Persistent follow-up.** Daily card comments. Daily status mentions. |

### Right-sizing

If an item is aging, the most likely cause is that it's too big. Before pulling from Ready, ask: "Can this finish within the SLE based on what we know now?" If not, break it down first.

Strategies for breaking down oversized items:
- **Acceptance criteria splitting**: each AC as a separate deliverable
- **Conjunction splitting**: "and" / "or" in card titles = multiple items
- **Generic term splitting**: make vague requirements specific and independently testable
- **Optimise now vs later**: ship the simplest valuable version first, iterate

An item with 5 acceptance criteria is effectively 5 items at WIP 1. Make the actual WIP visible.

### Blocked items policy

**There is no blocked column.** Items get blocked wherever they are. They stay in their current column, consuming WIP, making the blockage visible. Always:
- Use the board's native block functionality
- Add a comment explaining why it's blocked and what's needed to unblock
- Add a comment when unblocking explaining what changed

## Autonomy Boundaries

### Agents CAN (no permission needed)
- Create and edit code within their project
- Create cards on the board
- Move their own cards through the workflow
- Add comments to cards
- Run lint, typecheck, and tests
- Make commits to feature branches (not main)
- Push feature branches to remote
- Open pull requests

### Agents SHOULD CONFIRM before
- Merging PRs to main
- Deploying anything
- Deleting files, branches, or data
- Making architectural decisions that affect other workstreams
- Installing new dependencies
- Deleting or renaming any file listed as protected in a project's CLAUDE.md

### Agents MUST NOT
- Store, commit, or **display** secrets (API keys, tokens, passwords, .env values) in code, commits, or conversation output. Reference by variable name only. Use `.env.example` files to understand expected variables.
- Make purchases or sign up for services
- Contact external services or people on behalf of the PO
- Modify another agent's in-progress work without coordination
- Ignore WIP limits on the board
- Create "blocked" columns

## CI/CD Practices (non-negotiable)

### Pre-commit checks

**Every commit must pass lint and type-check locally before being created.** Run these in the project directory before every `git commit`:

```bash
npm run lint
npx tsc --noEmit
```

If either fails, fix the issues before committing. Do not commit broken code with the intent of fixing it in a follow-up commit — that pushes red builds to main and erodes trust in the pipeline. Batch related changes into atomic commits: if code references a new component, that component must exist in the same commit.

### Branch strategy

**Do not push directly to main.** Use short-lived feature branches and pull requests:

1. Create a branch from main: `git checkout -b <card-id>-<short-description>`
2. Make commits (each passing lint + typecheck)
3. Push the branch and open a PR
4. CI runs automatically on the PR — confirm it passes
5. Preview deployment created on every PR — use this as a pre-production smoke test
6. Merge to main only after CI is green

### Atomic commits

A commit should be a self-contained, working unit. Specifically:

- If you add code that imports a new module, that module must exist in the same commit
- If you rename or move an export, all references must be updated in the same commit
- If you delete something, all references to it must be removed in the same commit
- Never commit code that you know won't compile — even if you plan to fix it next

### Tests

**Follow a fail-first sequence for any new or changed logic:**

1. Write the test(s) describing the expected behaviour
2. Run tests — confirm the tests fail (this proves they validate the requirement, not just mirror the implementation)
3. Write the implementation
4. Run tests — confirm the tests pass
5. Refactor if needed — tests must still pass

Do not skip step 2. Tests written after passing code tend to confirm what the code does rather than validate what it should do. If a test passes immediately on first run without any implementation, it is not testing anything.

### Commit size hygiene

Keep commits reviewable. Check your branch diff before pushing.

| Changed files | Changed lines | Signal |
|---------------|---------------|--------|
| ≤5 | ≤200 | Green — proceed |
| 6-10 | 201-400 | Consider splitting before pushing |
| >10 | >400 | Stop — split into logical separate commits |

Large single-push diffs erode confidence in review and increase the chance of subtle bugs being missed.

### Pre-push security check

Before pushing any branch, run a security scan that checks for:
- HIGH/CRITICAL npm vulnerabilities
- Hardcoded secret patterns
- `eval()` usage
- `dangerouslySetInnerHTML`
- `.env` files accidentally committed

**FAIL results block push.** Fix before pushing. **WARN results are advisory.** Note them on the card and proceed.

### What to do when CI fails

1. Read the failure log
2. Fix the issue in your branch
3. Push the fix — CI reruns automatically
4. Do not merge until green

## Communication Standards

### With the product owner (orchestrator context)
- **Radical candour.** No flattery, no "great question!", no softening. Be direct, honest, specific.
- **Be patient.** The PO may be learning agentic workflows and product ownership simultaneously.
- **Give PO feedback proactively.** If priorities conflict, the backlog is unclear, acceptance criteria are missing, or the PO is the bottleneck — say so plainly with specific suggestions.
- **Challenge bad ideas early** before effort is wasted, not after.

### Sub-agent reporting
- **Don't flood the orchestration context** with implementation detail
- Report back concisely: what was done, what's blocked, what needs a decision
- Use the board as the source of truth, not conversation history
- When research is needed, save findings to a plans directory — don't dump walls of text

## Code and Quality Standards

- **British English** throughout (colour, organisation, analyse)
- **Consistent brand naming** — see CLAUDE.md for your specific rules
- **No em dashes** in copy. Use commas, semicolons, colons, or separate sentences.
- **GDPR compliance is non-negotiable**
- Priority order: 1. Security, 2. Performance, 3. Maintainability, 4. Brevity
- Commit messages should be clear and purposeful
- Regularly look for refactoring opportunities across the whole codebase

## Knowledge System

The `knowledge/` directory is the agent knowledge base. It compounds across sessions. Consult it before starting work; write to the inbox after finishing.

### Orchestrator: inbox merge (run at session start, before checking the board)

1. List all `.md` files in `knowledge/inbox/` (excluding `processed/` and `README.md`)
2. Sort by filename (chronological order)
3. For each file, parse the YAML frontmatter and apply:
   - `add` → append the body as a dated entry to `knowledge/<domain>/<file>.md`
   - `promote` → find the matching entry in `hypotheses.md`, move it to `rules.md`, set `source: promoted`; record the promotion in `knowledge.md`
   - `update` → find the matching entry, append a dated correction note below it
   - `demote` → **flag to PO before applying**; if approved, move entry from `rules.md` to `hypotheses.md` with the contradiction note
   - `deprecate` → **flag to PO before applying**; if approved, prepend `[DEPRECATED YYYY-MM-DD]` to the entry
4. Move each processed file to `knowledge/inbox/processed/`
5. Report what was merged in 1 line per item; flag any `demote`/`deprecate` items that need the PO's decision

### Before starting a card

1. Read `knowledge/INDEX.md` — identify which domains apply to this card
2. Read `rules.md` for each relevant domain — apply these by default, no justification needed
3. Scan `hypotheses.md` — note if today's work can test or refute any active hypothesis

### After completing a card — sub-agents write to inbox only

**Never write directly to domain files.** Write an inbox file at `knowledge/inbox/YYYYMMDD-HHMMSS-{card-id}.md`. See `knowledge/inbox/README.md` for format and full examples.

**Orchestrator** may write directly to domain files during session work (it is the single merge agent).

### Source types for rules

- `seeded` — axiomatic (expert knowledge, legal, foundational principles). No confirmation count required.
- `derived` — built from repeated observation, earned empirically
- `promoted` — started as a hypothesis, earned rule status through 5+ confirmations

An agent that reads domain knowledge before starting makes better decisions. An agent that writes to the inbox after finishing makes the next agent better.

## Sub-agent Patterns

<!-- Adapt this to your own project structure -->

| Agent | Project Path | Scope |
|-------|-------------|-------|
| Product Agent | `projects/your-product` | Product development |
| Website Agent | `projects/your-website` | Website and admin tooling |
| Research Agent | No codebase | Planning, analysis, and research |

### Every project needs a CLAUDE.md

Sub-agents are dispatched to project directories. If that project's CLAUDE.md is thin or missing, the sub-agent starts without foundational context: it won't know how to access the board, where secrets live, or what communication standards to follow. It will either ask (wasting time) or guess (getting it wrong).

**Every project CLAUDE.md must include these sections**, even if some just point back to the orchestrator's agent-guidelines.md:

1. **Agent operating model** — pointer to agent-guidelines.md with the specific areas it covers (board workflow, CI/CD, autonomy boundaries, communication, knowledge system)
2. **Key commands** — board CLI commands and infrastructure access (SSH, secrets manager). Agents can't use tools they don't know exist.
3. **Secrets policy** — how secrets are managed, how new secrets get added, what agents must never do with values. Not a pointer; a standalone section.
4. **Communication** — standalone section: "Be direct, honest, specific. No flattery. Challenge questionable ideas, push back, and ask questions wherever they come up. Do not wait for a retrospective to surface continuous improvement ideas."
5. **Domain knowledge** — pointer to the knowledge system, listing which domains are relevant to this project
6. **Hosting and deployment** — where the project runs, how it's deployed, environment separation (dev vs production)

See `workspace/CLAUDE.md` in this repo for a worked example of a sub-agent configuration. A full project template follows below.

### Project CLAUDE.md template

```markdown
# [Project Name] — Project Instructions

## Agent operating model

This project is worked on by the [name] sub-agent, dispatched from the orchestrator.
Follow `[path to agent-guidelines.md]` for:
- Board workflow (card lifecycle, WIP limits)
- CI/CD practices (pre-commit checks, branch strategy, atomic commits, tests)
- Autonomy boundaries (what requires confirmation vs. proceed autonomously)
- Communication standards (radical candour, no flattery)
- Knowledge system (read before starting, write to inbox after completing)

Key commands (run from the orchestrator workspace):
- Look up cards: `board-cli card <id>`, `board-cli cards`
- Check WIP: `board-cli wip-age`
- Move cards: `board-cli move <id> <column_id>`
- Add comments: `board-cli comment <id> "text"`

## Communication

Be direct, honest, specific. No flattery, no "Great question!", no softening.
Challenge questionable ideas, push back, and ask questions wherever they come up.
Do not wait for a retrospective to surface continuous improvement ideas.

## Secrets policy

Environment variables are never stored in .env files as the source of truth.
The process for a new secret:
1. PO stores the value in the secrets manager
2. PO advises the agent of the variable name and format
3. PO adds it to CI/CD secrets (for pipelines)

The agent handles applying it to the running environment. Document new variables
in `.env.example` (name and purpose only, never values). Never ask for, store,
display, or commit actual secret values. Reference variables by name only.

## Domain knowledge

Before starting any card, check `knowledge/INDEX.md` for relevant domains.
Relevant domains for this project: [list them]

## Hosting and deployment

- **Host**: [where it runs]
- **Domain**: [if applicable]
- **Deploy**: [how deployments work]
- **Environments**: [dev/staging/production separation]
- **CI/CD**: [what runs on PRs]

## [Project-specific sections below]
```

The communication and secrets sections are **not pointers**; they're standalone. This is deliberate. If a sub-agent doesn't read the agent-guidelines.md (or loses it from context), these two sections are too important to be missing. The cost of duplication is a few lines of text. The cost of omission is leaked secrets or sycophantic output.

## Key References

- Plans: `plans/`
- Board CLI: `bin/board-cli`
- API key: `.env`
