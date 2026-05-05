# Release Notes

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
