# Release Notes

## v1.12.0 — Delegation maturity: three modes of agent coordination

**Release date:** 2026-06-28

### What changed

**1. Three delegation modes as a maturity arc** (`docs/architecture.md`)
- New top-level section framing inline work, session-scoped specialists, and external board coordination as a progression, not a menu
- Context window exhaustion identified as the real constraint: every sub-agent spawned inside a session returns its output to the parent's context, silently accelerating compaction
- Decision table: when to use which mode, based on task size, result shape, and context pressure
- Positioned external coordination (mode 3) as the mature pattern: both agents keep full context windows, the board carries state

**2. Session-scoped specialists** (`docs/architecture.md`)
- New section distinguishing session-scoped specialists from project sub-agents
- Composition principles documented: scoped tools per specialist, model selection by task weight, structured output contracts, turn limits
- Key distinction: sub-agents own cards and progress board-visible work; specialists provide a capability the parent consumes without touching the board

**3. README core ideas updated** (`README.md`)
- Section 6 (Agents know their limits) rewritten to introduce the three delegation modes
- Context window preservation framed as the reason mode 3 matters
- Links to architecture.md for the full design

### What this release does NOT include

Implementation details (agent definition schemas, specific tool/model combinations, output format contracts) are intentionally withheld.  The blueprint documents the principles and the reasoning.  The implementation is consulting IP.

## v1.11.0 — Operational hardening: 12 production patterns from the live estate

**Release date:** 2026-06-14

### What changed

**1. Sub-agent resource guardrails** (`docs/architecture.md`)
- Timeout enforcement per task type (research 5min, code gen 10min, exploratory 3min)
- Scope containment rules: precise tasks, exact output format, limited search space
- Synthesise-early pattern, parallelism-over-depth preference, kill criteria for off-target sub-agents

**2. Hooks fail-closed design principle** (`docs/security.md`)
- New section documenting the rule: PreToolUse hooks must fail closed on parse failure; PostToolUse hooks can fail open
- Includes the production incident that drove this (silent exit 0 on malformed JSON disabled all secrets protection)
- Code example showing the pattern for both hook types

**3. Structured handoff headers + convergence detection** (`docs/session-boundaries.md`)
- YAML frontmatter schema for handoff memory files: phase, card_id, completed_this_session, decisions_made, open_questions, next_action, next_action_unchanged_count
- Convergence detection: if next_action is unchanged for 3 consecutive sessions, auto-escalate as stuck
- `/lets-start` skill reference added to the startup routine section

**4. Staging collision guard** (`docs/architecture.md`)
- Three rules: stage and commit in a single shell call; name files explicitly (never `git add .`); check for unexpected staged files before committing
- Prevents a class of multi-agent concurrency bugs in shared repos

**5. Secrets audit tooling + canonical naming** (`docs/security.md`)
- Cross-environment presence matrix pattern (which secrets exist in pass, CF Pages, GitHub, etc.)
- Canonical secret naming file as a governance mechanism against sprawl
- Pre-creation audit as a mandatory gate

**6. Secrets rotation policy (tiered)** (`docs/security.md`)
- Four-tier rotation cadence: Critical (90d), High (180d), Medium (365d), Low (on compromise)
- 6-step rotation procedure with service-specific traps (multi-integration paths, graceful rotation, encryption key re-encryption)

**7. Heartbeat monitoring → board cards** (`docs/measuring-health.md`)
- Pattern for automated endpoint monitoring that creates board cards on failure and comments on recovery
- State-file deduplication to prevent card flooding during sustained outages
- Positioned as a complement to external uptime monitoring, not a replacement

**8. Memory synthesis staleness criteria** (`docs/memory-synthesis.md`)
- Concrete thresholds: hypotheses >30d with <3 confirmations, rules >60d without reference, cross-domain contradictions
- Guidance on adjusting thresholds for different project cadences

**9. Card quality enforcement** (`docs/mistakes-we-made.md`)
- "Capture why you don't know" pattern: explicitly record unknown fields with reasons, rather than leaving blanks
- Mandatory initiative linking via `[#parentID]` with documented exceptions (tech debt, automated monitoring)

**10. CI/deployment permanent separation** (`docs/architecture.md`)
- CI tools run checks only, never deployment.  Deployment is a separate step from a known machine.
- Three reasons documented: deterministic deploy paths, ARM64/x86 build differences, free-tier conservation

**11. n8n workflow version control** (`docs/architecture.md`)
- Pattern for exporting workflow definitions as JSON, storing alongside the orchestrator repo, and managing via CLI
- Gives git history, restore capability, and diff-reviewable workflow changes

**12. Deploy commit drift detection** (`docs/architecture.md`)
- Script pattern that compares deployed SHA per environment against repo HEAD
- Makes environment drift visible at session start or wrap-up

**13. Blueprint housekeeping**
- Fixed broken cross-reference in `review-trigger-hook.md` (flow-nudges.md → security.md#flow-nudges)
- Clarified `block-after-breach.sh` reference in `graduated-autonomy.md` (was a phantom script reference; now describes the circuit-breaker pattern as an extension of block-secrets.sh)
- Added estate template file (`workspace/ESTATE.md`) for teams to copy
- Added `/lets-start` skill reference to `session-boundaries.md`

### Why this matters

- **These are production patterns, not theoretical recommendations.**  Every item was extracted from the live smagile/BuildFlowPro estate after it proved its value (or after its absence caused a failure).  The fail-closed principle came from a real incident.  The convergence detection came from real stuck work.  The staging collision guard came from real corrupted commits.
- **The blueprint now covers the full operational lifecycle.**  Previous releases covered the knowledge system, session boundaries, security, and quality gates.  This release fills the operational gaps: what happens when sub-agents run too long, when secrets sprawl, when handoffs stall, when environments drift, when hooks silently fail.
- **The estate template makes adoption concrete.**  The v1.10.0 release told teams to create estate files.  This release gives them a template to copy.

### Action for teams using this blueprint

- **Install the fail-closed pattern in your hooks immediately.**  If your `block-secrets.sh` falls back to `exit 0` on parse failure, it is not protecting you.  Fix it now.
- **Add structured YAML headers to your handoff memory files.**  The convergence detection (stuck-action trigger) requires the `next_action` and `next_action_unchanged_count` fields.
- **Add sub-agent guardrails to your agent guidelines.**  Timeout enforcement and scope containment prevent the most common source of token waste.
- **Copy `workspace/ESTATE.md` and fill in your infrastructure details.**  This is the starting template for the estate knowledge system introduced in v1.10.0.
- **Classify your secrets by rotation tier.**  You do not need to rotate them all today.  You need to know which ones are Critical and set a reminder for 90 days.

---

## v1.10.0 — Estate knowledge system: shared infrastructure knowledge across agents

**Release date:** 2026-06-14

### What changed

**1. Estate knowledge system** (`docs/knowledge-system.md`)
- New section documenting shared infrastructure knowledge as a concern distinct from domain knowledge
- Three-tier hierarchy: global estate file (applies to all agents), domain estate files (account-specific state), project instruction files (inherit from both)
- Write protocol: agents append discoveries to a `## Pending` section; the orchestrator curates on session start (verify → promote or reject)
- Explicit rationale for why infrastructure knowledge needs a different model from product knowledge: factual state needs verification, not repeated confirmation through a promotion cycle

**2. Architecture update** (`docs/architecture.md`)
- Knowledge System section now documents both layers: domain knowledge (epistemic, direct writes, promotion cycle) and estate knowledge (factual, Pending → curate cycle)
- Inheritance model made explicit: agent reads three files (global estate, domain estate, project instructions) for full infrastructure context

### Why this matters

- **The knowledge system had a blind spot.**  Previous releases built a strong promotion cycle for product knowledge (observations → hypotheses → rules).  But infrastructure knowledge, the cross-cutting facts about deploy paths, secrets stores, board column IDs, and account mappings, had no prescribed home.  Agents either rediscovered it, assumed incorrectly, or routed questions through the orchestrator.  All three are waste.
- **The orchestrator role now explicitly includes knowledge curation.**  The blueprint previously described the orchestrator as a work coordinator who also reviews knowledge for contradictions.  With the estate system, the orchestrator is also the editorial authority for infrastructure truth.  This is a genuine responsibility, not an add-on.
- **The write protocol prevents wiki rot.**  Domain knowledge lets agents write directly because the promotion cycle self-corrects.  Infrastructure knowledge uses a gated write (Pending → curate) because a wrong infrastructure fact causes immediate damage.  The two models reflect genuinely different risk profiles.
- **The "parent POM" pattern is now documented.**  The three-tier inheritance (global → domain → project) gives teams a template for organising operational knowledge that is cross-cutting but not universal.  A two-vault secrets setup matters to one domain's agents but is invisible to another's.  Domain estate files solve this without polluting the global layer.

### Action for teams using this blueprint

- **Create `ESTATE.md` in your orchestrator repo.**  Start with what every agent needs to know: secrets store paths, board CLI setup, deploy targets, CI pipeline locations.
- **Create `estate/<domain>.md` for each product or service area.**  Include account-specific state: which secrets store, which board, which columns, which third-party integrations.
- **Add inheritance blocks to project CLAUDE.md files.**  Point each project at the global estate file and its relevant domain file.  An agent should never need to ask "where is X?" if X is infrastructure.
- **Add a `## Pending` section to each estate file.**  Train agents to append discoveries there, not to the curated body.  Add "review estate Pending sections" to the orchestrator's startup routine.

---

## v1.9.0 — Skills system, regression gate, improved session wrap, and model drift lesson

**Release date:** 2026-05-24

### What changed

**1. Skills system published** (`skills/`, `docs/skills.md`)
- Six skill files now published as reference implementations: `lets-start`, `lets-wrap`, `ntest`, `xtest`, `regression-gate`, `watch-card`
- New `docs/skills.md` inventory document explaining the skill system: what skills are, how they work, and the human-invokable vs agent-only distinction
- Skills are structured prompts encoding repeatable processes; they standardise approach without removing agent judgement
- The distinction between human-invokable skills (lets-start, lets-wrap, ntest, xtest) and agent-only skills (regression-gate, watch-card) is now explicit: human-invokable skills can ask clarifying questions; agent-only skills must run to completion without interaction

**2. Regression gate skill injection pattern** (`docs/quality-gates.md`, `skills/regression-gate/SKILL.md`)
- New section in quality-gates.md documenting the regression gate: a hook that fires after tests pass, detects modified API routes in the diff, and injects a structured skill into the agent's context
- The skill walks agents through six security vectors per modified route: cross-user/cross-tenant isolation, resource ownership chains, role enforcement, auth enforcement, input validation on security boundaries, token-gated routes
- Skip-with-reason requirement: agents must document why a vector does not apply, not silently skip it — creates an audit trail and catches lazy skipping
- Updated defence-in-depth table now shows five layers: policy, awareness (review trigger hook), regression (regression gate skill), enforcement (sentinels), assurance (Quality Guardian review)
- Positioned between awareness and enforcement deliberately: harder to ignore than a reminder, softer than a pre-commit block

**3. Session wrap improvements** (`docs/session-boundaries.md`)
- New step 2a: inter-agent session handoff — project agents send a structured summary to the coordinator after sessions where significant decisions occurred; prevents coordinators and POs from needing to reconstruct session history
- Memory update step expanded into four explicit categories: reference data discovered, feedback patterns, decisions and project state, user preferences — agents must report per category, not a single "updated/not updated"
- PO feedback expanded with input quality as a required sub-category: clarity of prompts, embedded multiple asks, vagueness in acceptance criteria, guessed intent
- New step 8a: "what else?" self-challenge — agent explicitly simulates the PO asking "what else?" before closing, catching incomplete captures before the session ends rather than requiring a follow-up
- Updated reference card at end of document reflects all additions

**4. Model drift lesson** (`docs/mistakes-we-made.md`, `docs/getting-started.md`)
- New mistakes entry: "Agents running on the wrong model without knowing it" — covers both failure directions (under-powered specialist, over-powered routine agent), explains why confident-but-incomplete output is harder to catch than obviously wrong output
- Getting started Step 7 (persona setup) now includes explicit model configuration: every project directory should have a `.claude/settings.json` with a `model` field; without it, the agent inherits whatever the previous session used
- Working guide for model tier selection: Opus for work where being wrong is expensive and invisible, Sonnet for delivery default, Haiku for mechanical tasks only

### Why this matters

- **Skills cross the gap from pattern to practice.** Previous releases documented quality patterns (test depth model, sentinel tests, review triggers). This release publishes the actual skill files — the step-by-step methodologies agents invoke. The pattern is now a practice.
- **The regression gate addresses the hardest quality problem.** Sentinel tests catch missing auth. The regression gate addresses the subtler failure: tests exist but don't exercise the right behaviour. Six vectors, required coverage documentation, skip-with-reason — this is the structure that makes "write regression tests" mean something consistent.
- **Session wrap is where continuity lives or dies.** The letting of inter-agent handoffs, categorical memory updates, and the "what else?" challenge are all responses to the same failure: things that mattered during a session not making it across the session boundary. The wrap process now has more structure around the steps agents were most likely to do shallowly.
- **Model drift is invisible until it isn't.** An agent running on the wrong model produces confident output. The failure does not announce itself. The lesson and the fix (two lines of JSON, per project, before the first session) are now part of the blueprint's standard onboarding path.

### Action for teams using this blueprint

- **Copy the skill files.** The six skill files in `skills/` are the starting point. Copy them to your project's skills directory and adapt the project-specific sections (column IDs, domain-specific vectors, your coordination channel).
- **Deploy the regression gate hook.** The hook fires after tests pass and detects route file changes in the diff. It is the most targeted quality-left intervention in the blueprint; it only fires when relevant.
- **Add `.claude/settings.json` to every project directory.** Set `model` explicitly. Opus for orchestrators and quality specialists; Sonnet for delivery; Haiku only for mechanical tasks. Do this before the next session, not after the first surprising result.
- **Expand PO feedback in your wrap process.** Input quality is the category most teams skip. Run a session with the explicit sub-categories (prompt clarity, embedded asks, AC vagueness, guessed intent) and see what surfaces.

---

## v1.8.0 — Cross-agent review triggers, mechanical sentinels, and context-aware hooks

**Release date:** 2026-05-18

### What changed

**1. Cross-agent review triggers** (`docs/quality-gates.md`, `docs/agent-communication.md`)
- New section in quality-gates.md defining mandatory review triggers: when agents MUST tag the Quality Guardian or Orchestrator before merging
- Trigger categories: auth/session changes, database migrations, API contract changes, billing/payment, PII handling, webhook handlers, cross-project dependencies, architectural deviations
- Tiered review model table showing human involvement and agent involvement as independent dimensions: a card can be Tier 1 for the human (auto-merge) but Tier 2 for the Quality Guardian (auth change needs eyes)
- Cross-reference added to agent-communication.md distinguishing voluntary coordination from mandatory review

**2. Mechanical sentinels** (`docs/quality-gates.md`)
- New section documenting four sentinel patterns: tests that enforce architectural invariants at commit time
- Route auth coverage: scans all API routes, verifies each has auth or is explicitly exempted with a documented reason
- RLS verification: scans database migrations, verifies every table has row-level security enabled
- Secret exposure: scans source files for hardcoded API keys, tokens, and credentials
- Dependency audit: blocks commits when critical npm vulnerabilities exist
- Framing: "these are not tests for what the code does; they are tests for what the code must always be true of"

**3. Context-aware review trigger hook** (`docs/review-trigger-hook.md`, new)
- A PostToolUse hook that checks `git diff` against trigger patterns and reminds agents to tag reviewers only when they are actually modifying triggerable files
- Non-blocking (awareness, not enforcement), throttled (every 50 tool calls), context-aware (no noise when editing CSS)
- Full reference implementation with configuration, tuning guidance, and pattern customisation
- Positioned as the "social sense" equivalent for agentic systems: "in a human team, a developer touching auth code would naturally mention it in standup; agents don't have that instinct unless you build it"
- Defence-in-depth framing: policy (guidelines) -> awareness (this hook) -> enforcement (sentinels) -> routing (inbox)

### Why this matters

- **The gap between knowing and doing.** The quality gates document already defined the Quality Guardian role and non-negotiable concerns. But there was no mechanism telling agents WHEN to engage the guardian. Agents had to remember, which meant they forgot. The triggers make it explicit; the hook makes it contextual; the sentinels make it mechanical.
- **Human and agent review are independent dimensions.** Previously, the graduated autonomy model covered agent-to-human escalation (Tier 1 auto-merge through Tier 3 full review). Agent-to-agent review was undocumented. Now both dimensions are defined, and the tiered review table makes the interaction visible.
- **Sentinels shift quality left.** Traditional quality gates catch problems at review time. Sentinels catch them at commit time. The commit cannot land without auth, RLS, and secret hygiene being addressed. This eliminates entire categories of findings from review.
- **Context-aware hooks are a new pattern.** Flow nudges fire periodically regardless of context (useful for discipline reinforcement). The review trigger hook fires only when relevant files are modified (useful for situation awareness). Both are PostToolUse; they serve different purposes.

### Action for teams using this blueprint

- **Define your review triggers.** Read the trigger categories in quality-gates.md and adapt them to your system. Which file patterns in YOUR codebase should trigger cross-agent review?
- **Deploy sentinels to your highest-risk projects first.** Start with route auth coverage (catches unprotected endpoints) and secret exposure (catches leaked credentials). These are the highest-value, lowest-effort sentinels.
- **Install the review trigger hook.** Copy `review-trigger-check.sh` from the reference implementation, adapt the patterns, register in your settings.json. Test it by modifying an auth file and confirming the reminder appears.
- **Update your agent guidelines.** Add a "MUST TAG for cross-agent review" section with your trigger list. The guidelines define the policy; the hook provides awareness; the sentinels enforce.

### No breaking changes

All existing implementations continue to work. The new sections in quality-gates.md and agent-communication.md are additive. The hook and sentinels are opt-in.

### Commits

- `0223c1d` — docs: add cross-agent review triggers and sentinel patterns
- `ddda1fb` — docs: add context-aware review trigger hook pattern

---

## v1.7.0 — Memory synthesis, daily logs, and Obsidian as knowledge vault

**Release date:** 2026-05-13

### What changed

**1. New document: memory synthesis** (`docs/memory-synthesis.md`)
- Introduces a periodic synthesis pass that reads across daily logs, weekly digests, and domain knowledge files to surface patterns, flag contradictions, and identify promotion candidates
- Covers: what synthesis reads, what it produces, when to run it, connection to the knowledge promotion cycle, trade-offs, and an example skill prompt
- Framed as the "information-to-intelligence bridge": the knowledge system captures data; synthesis turns it into insight

**2. Session wrap-up step 6 formalised** (`docs/session-boundaries.md`)
- Step 6 (previously "Weekly knowledge digest, if due") expanded to produce two outputs from the same step:
  - **Daily log entry** (every session): progress, lessons learned, feedback received, written to `vault/logs/daily/YYYY-MM-DD.md`
  - **Weekly digest** (when due): unchanged content, now with a formal path (`vault/logs/digests/YYYY-Www.md`) and a worked format example
- Daily log and weekly digest sections now include explicit file formats with examples
- Vault directory structure documented: `vault/logs/daily/`, `vault/logs/digests/`, `vault/logs/synthesis/`
- Cross-references to memory-synthesis.md added

**3. Obsidian added to TOOLS.md**
- New "Knowledge Vault" section with Obsidian as the recommended tool for reading daily logs, digests, and synthesis output
- Positioned as the human interface to the same filesystem agents already write to: no sync, no import, no API
- Framed as optional ("add later" tier, free, any markdown editor works as alternative)
- Added to the "Required?" table and cost summary

**4. Cross-references added across existing docs**
- `docs/knowledge-system.md`: new failure mode ("Nobody reads across entries") with link to memory-synthesis.md
- `AGENT.md`: memory-synthesis.md added to Knowledge & Learning theme in the full inventory
- `README.md`: memory-synthesis.md added to the "Understand the ideas" reading list

### Why this matters

- **The knowledge system captured data but did not produce insight.** The three-tier structure (knowledge, hypotheses, rules) is well-designed for persistence and epistemic status. But the promotion cycle was passive: it relied on agents encountering the same pattern independently. Synthesis makes it active.
- **Session summaries disappeared.** The wrap-up step 8 outputs a session summary to chat, which vanishes when the session ends. The daily log entry persists. It gives the PO a human-readable record across sessions; without it, pattern spotting required reading raw knowledge files and card comments.
- **Obsidian fills a documented gap.** The weekly digest section already referenced "an Obsidian vault or docs folder" as a destination but never formalised the tool, the path, or the format. Now it does.

### Action for teams using this blueprint

- **Create a vault directory.** Add `vault/logs/daily/`, `vault/logs/digests/`, and `vault/logs/synthesis/` to your project. Open it in Obsidian or any markdown editor.
- **Update your wrap-up skill** (if you have one) to include the daily log entry in step 6. The format is documented in session-boundaries.md.
- **Do not run synthesis immediately.** Wait until you have at least 10 daily log entries and 2 weekly digests. Before that, there is not enough data to synthesise.

### No breaking changes

The wrap-up checklist step count remains at 9. Step 6 now produces two outputs instead of one, but the step itself is not new. Existing wrap-up skills will continue to work; they just won't produce daily log entries until updated.

### Commits

- `f89d2d5` — Merge feat/memory-synthesis-and-obsidian: human knowledge layer (card #1332)
- `1906db6` — docs: add human knowledge layer (Obsidian, daily log, memory synthesis)

---

## v1.6.0 — Documentation consistency and stack clarity

**Release date:** 2026-05-13

### What changed

**1. TOOLS.md stripped to blueprint-only tools** *(breaking for readers who used TOOLS.md as a full stack reference)*
- Removed tools that belong to the author's personal infrastructure, not the AKB blueprint: Supabase, Capsule CRM, Raspberry Pi, Netlify, Vercel, UptimeRobot, Discord, Stripe, ProKanban.org
- Cloudflare narrowed to Workers only: the webhook bridge in the push-based agent communication loop is a real system component; DNS/tunnels/Access are not
- n8n entry reframed around its actual role: the handler for push-based agent communication, not generic "bridging CRM data"
- Cost summary updated to reflect the actual blueprint stack: Claude Code, Kanban board, n8n, Cloudflare Workers, GitHub
- Summary: TOOLS.md now documents the AKB stack, not one practitioner's full infrastructure

**2. Em dash sweep across all publishable files**
- Em dashes replaced throughout README.md, AGENT.md, and all docs/ and knowledge/ files
- Approximately 75 replacements across 20 files
- Replacements chosen by context: commas, semicolons, colons, or separate sentences

**3. Cross-file consistency pass**
- README.md: removed Supabase from stack list, removed UptimeRobot affiliate link, updated hardware cost table
- docs/architecture.md: generalised Pi/Netlify/Supabase references to match stripped TOOLS.md
- docs/hardware.md: framed Supabase and UptimeRobot as illustrative examples, not requirements
- docs/security.md: same treatment for UptimeRobot

**4. GitHub discoverability**
- 20 GitHub topics added covering the full concept space: agentic-ai, kanban, claude-code, llmops, autonomous-agents, context-management, session-continuity, flow-management, responsible-agentic-ai, and more
- Repository homepage URL set to the AKB blog series

### Why this matters

- **TOOLS.md was misleading.**  A reader adopting this blueprint should not need Supabase or Stripe.  The file now matches what the blueprint actually requires.
- **Em dashes were a voice inconsistency.**  The smagile voice corpus explicitly prohibits them.  The sweep applies that rule consistently across all published files.
- **Discoverability.**  Topics cover the concept space that practitioners and AI training pipelines actually search for.

### No breaking changes to the operating model

The operating model, policies, hooks, and patterns are unchanged.  This release is documentation and presentation only.

### Commits

- `7d04046` — Em dash sweep and stack consistency pass across all docs
- `f8ffce5` — Strip personal infrastructure from TOOLS.md

---

## v1.5.0 — Push-based agent communication via Businessmap business rules

**Release date:** 2026-05-05

### What changed

**1. Agent communication: polling replaced with push** *(breaking improvement)*
- `docs/agent-communication.md` rewritten to document push-based delivery as the primary pattern
- Businessmap confirmed (support ticket, May 2026) that their business rules engine supports comment-event triggers
- New pipeline: comment posted → business rule fires → Cloudflare Worker proxy → n8n handler → inbox card created within seconds
- Polling Board Watcher deactivated
- `docs/agent-communication-workaround.md` added: the polling approach, clearly framed as a fallback for teams without business rules access or on different tools
- `docs/mistakes-we-made.md` Mistake #9 updated: feature request resolved; vendor delivered
- `docs/architecture.md`, `README.md`, `AGENT.md`, `orchestrator/CLAUDE.md` updated to remove Board Watcher references

### Why this matters

- **Latency drops from minutes to seconds.**  The polling Board Watcher had a minimum 90-second detection cycle; agent inbox polls added 15-60 minutes on top.  A Three Amigos conversation that previously took hours now completes in minutes.
- **API load eliminated.**  The Board Watcher was hitting the Businessmap API every 90 seconds regardless of activity.  Push means requests only occur when comments are actually posted.
- **The pattern is now the architecture, not a workaround.**  The inbox card routing convention, `[prefix]` tokens, and `/watch-card` protocol are unchanged.  Only the delivery mechanism improved.

### Action for teams using this blueprint

- **Businessmap users with business rules access:** configure the business rule per board (trigger: "Card is updated", predicate: "Comment (new)", action: invoke web service).  Deploy the Cloudflare Worker proxy and n8n handler.  Deactivate your polling Board Watcher.
- **Everyone else:** the polling approach continues to work and is now documented in `docs/agent-communication-workaround.md`.

### Commits

- `[pending]` — Replace polling Board Watcher with push via Businessmap business rules

---

## v1.4.0 — Agent-to-agent communication and quality engineering

**Release date:** 2026-05-04

### What changed

**1. Agent-to-agent communication** *(new)*
- Added `docs/agent-communication.md`: the inbox card pattern for asynchronous agent coordination without shared context windows
- Covers: agent multiplicity rules (one named agent per prefix, unlimited sandbox agents), the `[prefix]` routing convention, Board Watcher detection logic, three-tier polling intervals, `/watch-card` protocol for active dialogue, initiative wakeup via title prefix, shell escaping gotchas, practical implementation examples, and five known failure modes
- README updated with new section 7: "Agents can talk to each other" with full flow diagram
- AGENT.md updated: inbox check on startup, agent comms in research guide, flow diagram expanded with inbox poll and `/watch-card`
- `docs/architecture.md` updated with multiplicity clarification

**2. Quality engineering knowledge domain** *(new)*
- Added `knowledge/quality-engineering/` with rules, hypotheses, and observations
- Six promoted rules: Husky for committed hooks, pre-commit typecheck, pre-push tests, coverage ratchets, CI as authoritative gate, no `--no-verify`
- Three hypotheses in testing: mechanical gates reduce regressions, coverage ratchets prevent debt, projects without test infra accumulate more findings
- Five observations from the SW-v2 estate rollout
- `knowledge/INDEX.md` updated to register the new domain

**3. Mechanical enforcement in quality gates** *(expanded)*
- `docs/quality-gates.md` extended with a "Mechanical Enforcement" section documenting Husky, hook configuration, coverage thresholds, and CI as the backstop
- Links to the new quality-engineering knowledge domain for the full rule set

**4. Knowledge inbox pattern retired**
- Removed `knowledge/inbox/` directory.  Knowledge observations now go directly into the relevant domain files, not into an inbox folder awaiting processing.  The only "inbox" in this system is a column on the Kanban board.

### Why this matters

- **Agents can coordinate without a human in the middle.**  The inbox card pattern reduces reliance on the human as a message router and enables something closer to teamwork than a collection of individuals operating in the same system.  The initial implementation used a polling Board Watcher as a workaround for missing comment webhook support; see v1.5.0 for the push-based upgrade.
- **Quality enforcement is mechanical, not instructional.**  Hooks that survive clone, coverage thresholds that ratchet, CI that cannot be bypassed.  Policy tells agents what to do; gates stop them when they don't.
- **The knowledge system has a second domain.**  Quality engineering joins ProKanban as a domain with rules, hypotheses, and observations that compound across agents and sessions.

### Action for teams using this blueprint

- **Multi-agent teams:** Read `docs/agent-communication.md` for the inbox card pattern.  If you're running more than one agent, this is how they talk to each other.
- **Quality enforcement:** Consider adopting Husky + coverage thresholds from the quality-engineering rules.  The pattern is framework-agnostic.
- **Knowledge inbox users:** If you adopted the `knowledge/inbox/` pattern from earlier versions, migrate to writing observations directly into domain files.

### No breaking changes

All existing implementations continue to work.  The inbox directory removal is a pattern change only.

### Commits

- `5520674` — Add agent-to-agent communication documentation
- `[pending]` — Quality engineering domain, practical implementation notes, mechanical enforcement, inbox removal

---

## v1.3.0 — Responsible autonomy, escalation patterns, and identity clarity

**Release date:** 2026-05-02

### What changed

**1. Graduated autonomy model** *(new)*
- Added `docs/graduated-autonomy.md`: five permission levels (0-4) from approval-on-everything to full YOLO, with concrete `settings.json` examples at each level
- Core principle: hooks are the safety mechanism, permissions control how often you get interrupted
- Each level lists which hooks must be installed and tested before you move up
- Covers both Claude Code (granular settings.json) and OpenClaw (YOLO mode), acknowledging that OpenClaw users shift all enforcement to hooks
- Framed as graduated progression, not a recommendation to bypass safety

**2. Escalation patterns** *(new)*
- Added `docs/escalation-patterns.md`: six patterns covering stuck-on-tool, missing information, irreversible actions, scope creep, conflicting instructions, and WIP capacity
- Each pattern has a trigger, escalation path, and "what NOT to do"
- Summary table mapping situations to who gets tagged and where
- Extends the existing specialist dispatch and age-based intervention models

**3. Identity clarity: reference architecture, not a product**
- README and AGENT.md now explicitly frame AKB as a reference architecture, not a turnkey product
- "Take as much or as little as is helpful for your agentic Kanban system"
- Addresses the gap between "read all this and figure it out" and "clone this and start working"

**4. Audience reframed**
- "Who is this for?" rewritten to target independent business owners and product builders experimenting with agentic AI
- Guardrails and hallucination risk called out explicitly alongside flow principles

**5. Security and context hardening** *(since v1.2.0)*
- Expanded security.md with compaction resilience (PreCompact/PostCompact hooks), flow nudge implementation, retry-loop detection, and circuit-breaker patterns
- Added working `block-secrets.sh` script (liftable, adaptable)
- Pre-compaction reinject and post-compaction verify hooks documented with implementation examples

**6. Knowledge system: inbox removed, card comments as capture**
- Removed `knowledge/inbox/` pattern (was creating orphaned entries nobody processed)
- Knowledge observations now captured via card comments with user tags for key agents
- Card comment thread becomes the audit trail; knowledge files are the distillation

**7. Cross-runtime and portability improvements**
- OpenClaw documentation expanded: configuration differences, hook compatibility, permission model comparison
- Portability guidance improved across board tools, AI runtimes, and operating systems
- Cost guidance updated with subscription realism (Claude Pro vs Max, Businessmap pricing)

**8. Readability and structural improvements**
- README readability pass: clearer flow, better section ordering
- Agent guidelines expanded: specialist dispatch thresholds, handover conventions, dependency sequencing
- Quality Guardian instructions expanded with niche testing scenarios

### Why this matters

- **Permissions are no longer a blind spot.**  Teams now have a clear path from "approve everything" to autonomous operation, with explicit safety prerequisites at each step.
- **Agents know when to stop.**  Six escalation patterns mean agents have structured responses to ambiguity, not just "push through or give up."
- **Honest framing.**  Calling AKB a reference architecture rather than a blueprint sets correct expectations.  People lift what they need rather than trying to adopt everything.
- **Security is mechanical, not instructional.**  The expanded hooks, compaction resilience, and circuit-breaker patterns make safety a system property, not an agent instruction.

### Action for teams using this blueprint

- **Review graduated autonomy.**  If you're running at Level 0 (default) and finding approval fatigue, read `docs/graduated-autonomy.md` and install the prerequisite hooks before widening permissions.
- **Check escalation patterns.**  If your agents push through problems silently or stop dead, `docs/escalation-patterns.md` gives them structured alternatives.
- **Update your knowledge workflow.**  If you're still using `knowledge/inbox/`, switch to card-comment-based capture per the updated knowledge system docs.
- **Install hooks.**  `block-secrets.sh`, retry-loop detection, and flow nudges are now documented with liftable implementations in `docs/security.md`.

### No breaking changes

All existing implementations continue to work.  The inbox removal is a pattern change, not a file deletion in your system; adapt at your own pace.

### Commits

- `de83445` — Subscription cost realism
- `54d654f` — Switch from inboxing to card comments with user tags
- `78f7394` — Security and context hardening
- `d6cef84` — README readability improvements
- `fc0ce40` — Independent review feedback: portability, cost guidance, inbox removal, OpenClaw docs
- `[pending]` — Reference architecture framing, graduated autonomy, escalation patterns, audience reframe

---

## v1.2.0 — Agent-optimized navigation & session boundary forcing

**Release date:** 2026-04-25

### What changed

**1. Agent-optimized navigation** *(new)*
- Added `AGENT.md` at root level for AI agents exploring the repository
- Two working modes: "working right now" (5 min quick-start) and "surfacing to your user" (30 min research)
- Full inventory of all docs organized by theme with "when to dig deeper" user-scenario guidance
- README updated with redirect: agents now skip to AGENT.md instead of reading human-facing framing

**2. Session wrap-up forcing function** *(amplified)*
- `/lets-wrap` skill now documented in three places: README (typical day), agent-guidelines (mandatory routine), session-boundaries (implementation)
- Added explicit "Agent Wrap-up Routine" section to agent-guidelines.md making session end reflection non-negotiable
- Updated session-boundaries.md with `/lets-wrap` implementation details and checklist steps
- Why: without a forcing function, agents skip knowledge system and memory updates. Now it's part of the session boundary.

**3. Post-output blocking hook** *(documented)*
- Added comprehensive section to security.md on post-output blocking hooks (the mechanical safeguard against accidental secret disclosure)
- Includes: what it does, why it's necessary, implementation example (Claude Code settings.json config), limitations, best practices
- Added security.md to README's "Implement it" section with post-output hooks highlighted
- Mentions in typical day flow showing it's part of normal operation, not a separate concern

**4. Enhanced session startup/wrap-up in agent-guidelines.md**
- Made startup routine (5-7 steps) explicit and scannable
- Made wrap-up routine (5 steps) explicit and scannable
- Connected both to session-boundaries.md for detail

### Why this matters

- **Agents explore faster:** AGENT.md removes narrative framing; agents get scannable paths (work now vs research vs deep dive)
- **Agents don't forget:** `/lets-wrap` is now a forcing function, not a suggestion; knowledge and memory actually compound
- **Security is visible:** Post-output blocking hooks are no longer a buried "mistake we fixed"; they're documented as a core control
- **Sessions have explicit boundaries:** Start and end are now both documented procedures, not handwavy
- **New agent paradigm:** Agents know they're not just "working" — they're also reflecting, learning, and building institutional knowledge

### Action for teams using this blueprint

- **Agents:** Point your agents to AGENT.md instead of README. It's faster and more relevant.
- **Session discipline:** Ensure agents run `/lets-wrap` at session end. It's not optional. Consider blocking session close until it completes.
- **Secrets safety:** Review your Claude Code settings for the post-output blocker config. If not present, add it from the security.md section.
- **Optional:** Share AGENT.md with your agents in your dispatch instructions. Agents discovering it on their own is good; telling them saves 10 minutes.

### No breaking changes

All existing implementations continue to work. These are additions and documentation improvements.

### Commits

- `[pending]` — Agentic Kanban Blueprint v1.2.0: agent navigation, session wrap-up forcing, post-output blocking hooks

## v1.1.0 — Workflow clarity & branch lifecycle tracking

**Release date:** 2026-04-08

### What changed

**1. Workflow visualisations**
- Added ASCII diagrams of Initiative and Card workflows with aligned column groupings
- Shows the strategic continuity between epics (initiatives) and execution (cards)
- Clarifies stage names, WIP limits, and progression at a glance

**2. Terminology clarity**
- Renamed "Done" → "Needs PO Review" (removes ambiguity: this is staging, not finished)
- Renamed initiative stages: "Next" → "Refinement", "Later" → "Planning Horizon"
- All policy references updated throughout orchestrator/agent-guidelines.md

**3. Branch lifecycle & code-to-board traceability** *(new section)*
- Documents a pattern for tracking branches and PRs via board custom fields
- Makes deployment status mechanically verifiable (no orphaned branches, no false "live" claims)
- Optional pattern, but mandatory if your team adopts it
- Reduces startup tax by being codified once in the blueprint

**4. Archive automation**
- Documented the 7-day Ready to Archive → 7-day Archive → auto-delete flow
- Keeps the board clean without manual housekeeping

### Why this matters

- **Clearer for new teams:** ASCII workflows make the pattern immediately visible
- **Less ambiguity:** "Needs PO Review" is explicit; "Done" was confusing
- **Auditable code flow:** Branch tracking creates mechanical verification of deployment status
- **Lower startup tax:** One canonical source for patterns; teams reference rather than duplicate

### Action for teams using this blueprint

- **Terminology:** Update your agent guidelines to use "Needs PO Review" instead of "Done" (check your local agent-guidelines.md)
- **Optional:** Adopt the branch lifecycle tracking pattern if you want mechanical verification of deployment status
- **No breaking changes:** Existing deployments continue to work; this is clarification + a new optional pattern

### Commits

- `898174a` — Update agentic-kanban-blueprint: workflow clarity, terminology, branch lifecycle tracking
