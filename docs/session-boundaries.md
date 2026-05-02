# Session Boundaries

The hardest problem in agentic delivery is not getting an agent to do good work. It's making sure the *next* agent can continue that work without losing context. Every session ends. Every new session starts fresh. The gap between them is where intent gets lost.

This document covers the practical mechanics of surviving session boundaries: what to write, where to write it, and when.

## The last 60 seconds of a session

Before a session ends (whether you're wrapping up deliberately or hitting context limits), the agent should:

1. **Update the card.** Whatever card is in progress gets a comment capturing: what was done, what's remaining, and any decisions made during the session. This is not a full report; it's a handoff note. One paragraph is usually enough.

2. **Move the card if work is complete.** If the card is finished, move it to Shipped/Live or Done (depending on whether it needs review). If it's not finished, leave it in Doing with the comment explaining current state.

3. **Write to the relevant domain files** if the session produced observations worth preserving. Not every session does. The test: did the agent learn something that would help a future agent working on a different card? If yes, write it to `knowledge/<domain>/knowledge.md`. If it's card-specific, the card comment is sufficient.

4. **Flag blockers explicitly.** If work can't continue until something external happens (a credential is created, a decision is made, a dependency ships), block the card with a specific reason. Don't leave an unblocked card in Doing that nobody can actually progress.

## The first 60 seconds of a session

When a fresh session starts, the agent should self-orient and act. **The agent should never open with "ready when you are", "what do you need?", or "how can I help?"** The board and CLAUDE.md contain everything needed to determine what to do.

1. **Read the CLAUDE.md.** This happens automatically in Claude Code. It gives the agent its operating model, secrets policy, communication standards, and key commands.

2. **Check the board.** What's in Doing? How old is it? What's blocked? What's in Done waiting for review? What's in Ready to be pulled? This is the agent's situational awareness. Without it, the agent is guessing what to work on.

3. **Check for stale branches.** Run `git branch --no-merged main` and cross-reference with open PRs and card statuses. Branches older than 3 days without a merged PR are likely orphaned work from previous sessions. Flag them.

4. **Load domain-aware context.** Your cards link to parent initiatives via [#ID] prefix (e.g. `[#805]`). Use this to bootstrap relevant knowledge:
   - Extract the [#ID] from each card title
   - Look up that initiative in the project's MEMORY.md domain index
   - Load the matching domain file (e.g. `domains/MOSAIC.md`)
   - Load relevant feedback and reference files listed under that domain

   This prevents guessing what "relevant" means. The domain mapping is explicit. Example: card `[#805] Update CV template logic` → initiative 805 = Mosaic v2 → load `domains/MOSAIC.md`, `feedback_cv_output_quality.md`, `handoff_mosaic.md`.

   For independent cards (no [#ID] prefix), load your baseline context only: general policies, agent guidelines, and global memory.

5. **Read the card it's about to work on.** Not just the title and description, but the comments. The last comment from the previous session is the handoff note. It contains decisions, current state, and remaining work.

6. **Declare intent and start.** Don't just brief the human on what you found. State what you intend to do about it: "I intend to resume card #42 because it's the oldest unblocked item in Doing. Starting now." If there's a question that needs the human's input, ask it alongside your intent, not instead of it. The human can redirect if needed, but the default is that the agent acts.

This is the difference between an assistant and an autonomous agent. An assistant waits for instructions. An agent reads the situation, forms a plan, and declares its intent.

## Autonomy boundary: what you own

Once you've loaded domain context and identified cards in your project, the decision is made. You pull. You work. You ship. No approval needed.

### What this means

- **Any card tagged with your initiative is in scope.** It is not optional. It is not "please do this if you have time." It is work that needs delivering.
- **You pull with agency.** You read the card, you understand the context, you start. You do not open with "ready when you are" or "what should I prioritize." The board tells you what to prioritize.
- **You raise questions only when necessary:**
  - Scope ambiguity: "The card says build X. Should it also include Y?"
  - Multiple valid implementations: "I see three ways to do this. Here's the trade-off. I'm going with option B unless you advise otherwise."
  - Risk or architectural concern: "This touches the auth layer. Should I check with the orchestrator before shipping?"
  - Genuinely unclear requirements: not "is this okay?" but "I don't understand what done looks like here."
- **You do not ask permission to do work in your scope.** That is abdication, not collaboration.

### The initialization flow

Session starts → Load context from [#ID] mapping → Read your cards → Declare intent → Execute

You start warm because previous agents left context. You operate with autonomy because the board and domain artifacts tell you what to do. You raise questions only when clarity or judgment is actually needed, not as a courtesy check.

### Example: what this looks like

**Cold start (what NOT to do):**
> I've read the board. There are 3 cards in Mosaic. What would you like me to work on first?

**Warm start (what to do):**
> Loaded Mosaic domain context. Card #42 (update template logic) is oldest unblocked item in Doing. Resuming from previous session's note. Starting now.
> [Questions, if any, only about implementation trade-offs or scope clarification]

The difference: one asks permission. The other declares intent and acts.

## Where to write what

The system has multiple persistence layers. Each serves a different purpose. Writing the right thing in the wrong place is almost as bad as not writing it at all.

### Card comments

**What goes here:** Progress updates, decisions made, blockers, handoff context, review guidance. Anything specific to this piece of work.

**Who reads it:** The next agent that picks up this card. The human reviewing the card. Future agents checking the card's history for context on why something was done a certain way.

**Lifespan:** Lives as long as the card. Archived with it.

**Example:**
```
Implemented rate limiting on /api/generate and /api/parse.
Per-user limits (not per-IP) using the Supabase-persisted store from card #699.
Limits: free tier 10/hour, pro 50/hour, enterprise unlimited.
429 responses include Retry-After header.

Remaining: /api/coaching and /api/ai/rephrase still uncapped.
Will pick up in next session if card is still in Doing.
```

### Domain knowledge files

**What goes here:** Observations, patterns, and learnings that apply beyond the current card. Things a future agent working on a *different* card would benefit from knowing.

**Who reads it:** Any agent that starts work in the relevant domain. The orchestrator reviews for quality and staleness.

**Lifespan:** Permanent until pruned or superseded.

**Example** (written to `knowledge/your-product/knowledge.md`):
```
## Auth error codes | card-742 | 2026-04-01
The AI auth layer returns HTTP 402 (Payment Required) for expired
trials, not 403 (Forbidden). Use 402 for payment/subscription
blocks; 403 for permission denials; 429 for rate limits.
```

This isn't specific to any card. It's a pattern that any future agent touching auth or billing would benefit from knowing.

### CLAUDE.md

**What goes here:** Durable project-level context. How agents should behave in this project, where to find things, deployment details, secrets policy. Things that are true across all cards, all sessions, all time.

**Who reads it:** Every agent that starts a session in this project directory.

**Lifespan:** Permanent until deliberately changed.

**What does NOT go here:** Session-specific state, card-level progress, temporary workarounds. CLAUDE.md is not a scratch pad.

### Board description / card description

**What goes here:** The stable definition of the work: What, Why, Done When. Updated if the scope changes, but not for session-by-session progress (that goes in comments).

**Who reads it:** Any agent picking up this card for the first time.

**Lifespan:** Lives as long as the card.

## The context tax

Every piece of context an agent reads at session start costs tokens and attention. There's a practical limit to how much context a session can absorb before the important bits get diluted.

This means you should be deliberate about what persists and where:

- **Card comments accumulate.** A card with 30 comments from 15 sessions is expensive to read. Summarise periodically: add a "current state as of [date]" comment that consolidates earlier ones. Future agents can read just the latest summary.
- **Knowledge files grow.** Review domain knowledge periodically and prune entries that are no longer relevant. A knowledge file with 200 entries is a tax on every session, even if 180 entries are stale.
- **CLAUDE.md should stay lean.** If your CLAUDE.md is over 100 lines, some of it probably belongs in a referenced document (architecture.md, deployment.md) rather than inline. CLAUDE.md is loaded into every session; referenced documents are loaded only when relevant.

## The handoff test

After writing a card comment or knowledge entry, apply this test: if a completely fresh agent read this with zero prior context, could it continue the work or apply the learning correctly?

If yes, the handoff will survive.

If no, add the missing context. The 30 seconds you spend writing it now saves 10 minutes of confusion in the next session.

## The wrap-up checklist

The "last 60 seconds" section above describes what should happen. In practice, agents skip it. They move to the next card, or the session ends, and the housekeeping never happens. Knowledge capture is the worst offender: the system is well-designed, but agents rarely write observations to domain files after completing work.

This is the same pattern that kills retrospectives in human teams. The practice exists. The intent is good. The follow-through is inconsistent because there is no structural enforcement.

The fix is a session wrap-up checklist, invoked by the PO at the end of a working session. Not a template that demands filling. A forcing function that prompts reflection.

The PO types a command (in Claude Code, this is a custom skill invoked via slash command). The agent works through each item. Every step explicitly permits "nothing to update" as a valid outcome. The point is not to generate artefacts. The point is to pause and ask: did I learn something that the next agent needs?

### The checklist

1. **Git hygiene.** Check the working tree for uncommitted changes. Commit what is ready; note intentional WIP. Check for unmerged branches older than 24 hours with no open PR. Review open PRs for neglect. The next agent should not inherit a confusing state.

2. **Board hygiene.** Do card positions reflect reality? Are comments needed for context that would otherwise be lost? Cards moving to Done need review guidance so the PO knows what to look at.

3. **Knowledge system.** This is the step agents are most tempted to skip. It requires thinking about what was learned, not just what was done. The prompt: "If a fresh agent started this card tomorrow with no context from you, what would they get wrong?" That is what belongs in the domain knowledge files.

4. **Memory update.** Memory is the handoff. There is no separate handoff step. If memory is updated properly, the next session self-orients from memory, the board, and the code. One practice instead of three. Project-specific decisions go in project-level memory. Cross-project insights and user preferences go in global memory.

5. **Environment parity check (if applicable).** If your project has pre-prod and production deployments with different automation rules, check for divergence. If pre-prod auto-deploys on every push to main but production requires manual dispatch, list commits waiting for promotion. Flag if non-breaking changes are aging in a vetting column. This prevents pre-prod and prod from silently drifting out of sync.

6. **Weekly knowledge digest (if due).** Check whether 7 or more days have passed since the last digest. If so, compile a review of: knowledge added, hypotheses pending, rules promoted or demoted, memory changes, and stale candidates for pruning. If not due, skip.

7. **PO feedback.** The product owner is part of the system. Give them honest feedback on how they contributed to system performance this session, both positive and negative. Highlight what is working so they know what to keep doing. Do not shy away from what needs to improve.

   **What is working well?** Did the PO make a decision that unblocked work? Did the system design hold up? Did the PO stay out of the way when autonomy was the right call? Did card context set agents up for success? Reinforcement is signal.

   **What needs to improve?**
   - **Process gaps the PO owns.** Did housekeeping get deferred? Did knowledge go stale? Did a transition happen without a migration plan?
   - **Bottlenecks caused by the PO.** Were cards blocked waiting for a PO decision? Did work age unnecessarily in Done or review?
   - **Pattern hypocrisy.** Is the PO tolerating in their own system what they would diagnose as dysfunction in a client's?
   - **Fragmentation and prioritisation.** Did the PO context-switch away from important work? Did that cost the system?

   Tone: direct, no softening, no apology. State what happened, state the consequence, state what would be better. The PO has opted into this feedback loop. It is continuous improvement data applied to the whole system, not just the agents.

   If there is genuinely nothing to say: "No PO feedback" and move on. Do not manufacture feedback.

8. **Session summary.** Output to chat:
   - **Done this session**: what shipped, moved, or meaningfully progressed
   - **What could have gone better**: honest self-critique, not performative humility. Where did the agent waste time? What would it do differently? This is continuous improvement data.

9. **Confirmation.** List all nine steps. Each either acted on or explicitly skipped with a reason. "No updates needed" is fine. "Forgot" is not.

### What this replaces

Before the checklist, session wrap-up was three separate practices: write handoff notes, update memory, brief the PO. In reality these overlapped heavily. The checklist collapses them into a single pass. Memory IS the handoff. The board IS the status. The summary IS the brief.

### Implementation

In Claude Code, this is a personal-level custom skill (placed in the user's global skills directory, not a project-specific one). This means every agent in every project sees it. The PO invokes it at session end; agents cannot skip it by forgetting it exists.

The skill is invoked by typing `/lets-wrap` in the Claude Code prompt. The skill file is a markdown document with YAML frontmatter. It contains the checklist steps as instructions, not as automation. The agent reads the instructions and reflects on the session, writing only where there is genuine signal. Low-value noise degrades the systems it is written to.

**Checklist steps:**

1. **Git hygiene.** Uncommitted work, unmerged branches, open PRs. Commit what is ready; flag orphans.
2. **Board hygiene.** Card positions reflect reality? Comments needed? Cards moving to Done need review guidance.
3. **Knowledge system.** Did the session produce observations a fresh agent on a different card would benefit from? Write to the relevant domain files if yes.
4. **Memory update.** Memory IS the handoff. Update if anything about user preferences, project decisions, or cross-project insights changed.
5. **Environment parity check (if applicable).** Pre-prod/prod divergence. Flag non-breaking changes aging in vetting.
6. **Weekly knowledge digest (if due).** 7+ days since last digest? Compile one. If not due, skip.
7. **PO feedback.** Did the PO's actions or inactions contribute to system underperformance? Process gaps, bottlenecks, pattern hypocrisy, fragmentation. Direct, unapologetic, data not criticism.
8. **Session summary.** Done this session; what could have gone better.
9. **Confirmation.** All nine steps listed; each acted on or explicitly skipped with a reason.

The `/lets-wrap` skill is the forcing function that ensures this happens consistently. Without it, agents skip the knowledge system (most common) and memory updates (second most common). With it, reflection becomes part of the session boundary, not an optional extra.

## The weekly knowledge digest

Knowledge, hypotheses, and memory entries accumulate across sessions. Without periodic review, stale entries persist, hypotheses sit untested, and rules that were wrong months ago still guide decisions.

The obvious fix is a scheduled job. The problem: if the system runs on a local machine, any scheduled job silently fails when the machine is off. No retry, no catch-up.

The better fix is event-driven. The wrap-up checklist already runs at session end, when the machine is guaranteed to be on. Add a step that checks whether seven days have passed since the last digest. If so, compile one. If not, skip.

Zero infrastructure. No cron job. No new failure mode. The digest piggybacks on a moment where the PO is already in reflection mode.

### What the digest covers

- **Knowledge added** across all project repos since the last digest
- **Hypotheses pending**: unresolved hypotheses across domains
- **Rules promoted or demoted**: changes to the rule base
- **Memory changes**: what was added or updated in agent memory
- **Stale candidates**: anything that looks outdated or contradictory, flagged for the PO to prune

The digest is written to a dedicated reviews directory (e.g. in an Obsidian vault or docs folder), one file per week. The PO reads it, prunes what is outdated, promotes what has earned it. Fifteen minutes, once a week, closing the loop on accumulated intelligence.

### Why event-driven beats time-driven

This pattern generalises beyond the knowledge digest. Any periodic maintenance task that only matters when an agent is active is better triggered by agent activity than by a clock. The machine is on. The context is fresh. The PO is present. These are the preconditions for useful review, and they are guaranteed at session end but not at an arbitrary cron time.
