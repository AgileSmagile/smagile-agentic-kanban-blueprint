# Session Boundaries

The hardest problem in agentic delivery is not getting an agent to do good work. It's making sure the *next* agent can continue that work without losing context. Every session ends. Every new session starts fresh. The gap between them is where intent gets lost.

This document covers the practical mechanics of surviving session boundaries: what to write, where to write it, and when.

## The last 60 seconds of a session

Before a session ends (whether you're wrapping up deliberately or hitting context limits), the agent should:

1. **Update the card.** Whatever card is in progress gets a comment capturing: what was done, what's remaining, and any decisions made during the session. This is not a full report; it's a handoff note. One paragraph is usually enough.

2. **Move the card if work is complete.** If the card is finished, move it to Shipped/Live or Done (depending on whether it needs review). If it's not finished, leave it in Doing with the comment explaining current state.

3. **Write to the knowledge inbox** if the session produced observations worth preserving. Not every session does. The test: did the agent learn something that would help a future agent working on a different card? If yes, write it. If it's card-specific, the card comment is sufficient.

4. **Flag blockers explicitly.** If work can't continue until something external happens (a credential is created, a decision is made, a dependency ships), block the card with a specific reason. Don't leave an unblocked card in Doing that nobody can actually progress.

## The first 60 seconds of a session

When a fresh session starts, the agent should:

1. **Read the CLAUDE.md.** This happens automatically in Claude Code. It gives the agent its operating model, secrets policy, communication standards, and key commands.

2. **Check the board.** What's in Doing? How old is it? What's blocked? What's in Done waiting for review? What's in Ready to be pulled? This is the agent's situational awareness. Without it, the agent is guessing what to work on.

3. **Read the card it's about to work on.** Not just the title and description, but the comments. The last comment from the previous session is the handoff note. It contains decisions, current state, and remaining work.

4. **Read relevant knowledge.** If the knowledge system has rules or observations for this domain, the agent should read them before starting. This prevents repeating mistakes that previous sessions already learned from.

5. **Brief the human** on what it found: what's in flight, what's blocked, what it intends to work on. This takes 30 seconds and prevents the human from having to ask "where are we?"

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

### Knowledge inbox

**What goes here:** Observations, patterns, and learnings that apply beyond the current card. Things a future agent working on a *different* card would benefit from knowing.

**Who reads it:** The orchestrator during inbox merge. Eventually becomes part of the domain's knowledge, hypotheses, or rules files.

**Lifespan:** Permanent (if promoted from inbox to domain files).

**Example:**
```
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
