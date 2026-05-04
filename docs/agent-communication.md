# Agent-to-Agent Communication

## Prerequisites: agent multiplicity

The inbox card pattern depends on a fundamental constraint: **each inbox prefix must be owned by exactly one active agent at a time.**

If two Mosaic agents are running simultaneously, both will see the same `[Mosaic]` inbox card and both may act on it. There is no deduplication. The result is duplicate work, conflicting board updates, or both agents blocking waiting for each other.

The rule is:

| Role type | How many | Notes |
|---|---|---|
| Orchestrator | One per board scope | Coordinates delivery, monitors WIP, routes cross-domain work |
| Quality Guardian / Test Specialist | One | Cross-cutting quality role; shared by all project agents |
| Project agent (Mosaic, L-E, etc.) | One per domain | Owns a project prefix; only one instance active at a time |
| Sandbox / satellite agent | Unlimited | No board prefix, no persistent inbox loop; opened for one-off tasks and closed when done |

**Sandbox agents are the exception by design.** They don't own cards, don't maintain persistent loops, and don't have a routing prefix. They can read the board and write to it (create cards, add comments) but they don't receive inbox notifications and they don't pull work autonomously. If a sandbox agent produces work that needs to enter the delivery flow, it creates a card and the relevant project agent picks it up.

This distinction matters for cost and coherence: sandbox agents are ephemeral, cheap to run, and create zero coordination overhead. The system can have as many as the work demands. Named delivery agents are persistent, carry operational state, and must remain singular within their scope.

## The problem

Agents in a multi-agent system need to notify each other. Agent A finishes work that Agent B needs to act on. Agent A needs a review from the TestSpecialist. An initiative moves to Now and the responsible project agent should wake up.

The natural instinct is to use webhooks: when a comment is posted or a card moves, fire an event, route it to the right agent. The instinct is correct. The problem is that most Kanban tools — including the one this blueprint was built on — **do not fire webhooks for comment events**. Card-level webhooks fire on moves and field changes. Comment events are invisible to the webhook system.

This is not a minor gap. Comments are where agents communicate. If you build your inter-agent messaging on card comment webhooks, you will find out they don't work the first time you test it.

## The solution: the inbox card pattern

Rather than relying on push notifications, use the Kanban board itself as the message bus. When Agent A wants to notify Agent B, it posts a comment on the relevant card. A polling workflow (running on a separate process — an n8n workflow in the reference implementation) detects the mention and creates a transient **inbox card** in a dedicated inbox column. Agent B polls that column periodically. When it sees a card addressed to it, it does the work and responds.

```
Agent A posts [B-prefix] comment on IP card
         ↓
Board Watcher (polling every 90s)
  detects [B-prefix] in comment
         ↓
Creates inbox card: "[B-prefix] #card_id — snippet"
  in Inbox column (col 193)
         ↓
Agent B polls bmap inbox B-prefix
  (every 15-60min depending on role)
         ↓
Agent B does work, responds on original card
  with [A-prefix] in comment
         ↓
Board Watcher creates return inbox card for Agent A
         ↓
Agent A sees response on next poll
```

The inbox card is transient — processed and closed, not kept.

## The routing convention

**The only thing that goes in square brackets in card comments is a project prefix or agent identifier.** This is the convention the Board Watcher relies on. It must be honoured.

| Comment contains | Routes to | Example |
|---|---|---|
| `[Mosaic]` | Mosaic project agent | `[Mosaic] please review the auth changes` |
| `[L-E]` | Lead-Engine agent | `[L-E] outreach template needs updating` |
| `[SW-v2]` | smagile.co v2 agent | `[SW-v2] deploy is blocked, see comment` |
| `[Scout]` | Scout agent | `[Scout] new LinkedIn extraction failing` |
| `[AKB]` | Orchestrator (AKB work) | `[AKB] initiative needs scoping` |
| `@Agent-Orchestrator` | Orchestrator (direct mention) | BM @mention, HTML-wrapped |
| `@Agent-TestSpecialist` | Test Specialist | BM @mention, HTML-wrapped |

The Board Watcher regex for `[prefix]` is `/\[([A-Za-z][A-Za-z0-9-]*)\]/`. This deliberately excludes:
- `[notification/Agent-X]` — contains a slash, used as agent response prefix
- `[#nnn]` — starts with `#`, used in card title parent references

Both are safe from false triggering without any special handling.

### Initiative wakeup

When an initiative titled `[Mosaic] v2 rearchitecture` moves to the Now column, the Board Watcher extracts the prefix from the title and creates an inbox card for the Mosaic agent automatically. No comment required. Name your initiatives with the responsible agent's prefix and wakeup is free.

## Polling intervals

Not all agents need to poll at the same frequency. Three tiers balance responsiveness against API rate consumption:

| Role | Default interval | Rationale |
|---|---|---|
| Project agents (Mosaic, L-E, etc.) | 60 minutes | Planned delivery work; async coordination is fine |
| Coordination hubs (Orchestrator, TestSpecialist) | 15 minutes | Cross-cutting concerns; faster response has system-wide value |
| Active wait (agent just tagged another) | 10 minutes | Dialogue mode; use `/watch-card` protocol |

**Session startup:** always check inbox immediately on session start, before setting up the background loop. The background loop is insurance for autonomous sessions; an active session relies on the agent being present.

### Rate limits

Polling `bmap inbox` is a single targeted API call (one column, per_page=100). At 13 agents running simultaneously: roughly 20-25 calls per hour at staggered intervals. Well within typical board tool rate limits (600/hr, 30/min in the reference implementation).

Do not poll `bmap cards` (all board cards) for inbox checks. That paginates across the whole board and multiplies the call count. Always use the inbox-specific query.

## Waiting for a response: `/watch-card`

When Agent A has notified Agent B and needs to act on the response, it should not idle or poll at its normal interval. Use the `/watch-card` pattern:

1. After posting the `[B-prefix]` comment, create a repeating 10-minute check
2. Each check: look for a response inbox card referencing `#card_id` in Agent A's inbox
3. Response found: process it, cancel the check
4. No response after 6 attempts (60 minutes): block the card, add a comment for the human

This keeps dialogue latency manageable (worst case ~25min for hub-to-hub, ~70min for project agent) without burning API calls on continuous polling.

## What this is not

This pattern is **asynchronous coordination**, not real-time messaging. The design target is a system where agents work independently on their own WIP, coordinate when needed, and do not depend on another agent being instantly available.

Maximum wait windows (not average):

| Interaction | Max latency |
|---|---|
| Orchestrator ↔ TestSpecialist | ~25 minutes |
| Project agent ↔ Orchestrator | ~75 minutes |
| Project agent ↔ Project agent | ~2 hours |

If your system requires faster agent-to-agent response, you need a different communication mechanism (shared memory, a message queue, or a board tool that actually fires comment webhooks). The inbox card pattern trades latency for simplicity and reliability.

## Known failure modes

**Bootstrap gap.** When a card first enters a scanned column, the Board Watcher records the latest comment ID as `lastSeen` and skips processing on that first scan (to avoid triggering on old comment history). A comment posted at the exact moment the card enters the column may be missed. The fix: on first scan, process comments newer than a short time window (5 minutes in the reference implementation). See [mistakes-we-made.md](mistakes-we-made.md).

**API key drift.** If the Board Watcher reads its API key from a file rather than directly from the secrets store, that file can drift out of sync when keys are rotated. Symptom: Board Watcher stops creating inbox cards silently. Fix: check the key file when debugging, re-sync from the secrets store.

**Cascade.** If an agent's response comment triggers the Board Watcher to notify another agent, and that agent's response triggers the first agent again, you get an infinite loop. Prevention: agent responses must use a prefix that cannot match the detection pattern. In the reference implementation, responses use `[notification/Agent-X]` (contains a slash) which the Board Watcher regex explicitly excludes.

**Scanned column scope.** The Board Watcher only scans comments on cards in specific columns (Doing, Done, Validation/Rework in the reference implementation). A comment on a card in Backlog, Ready, or Shipped will not create an inbox card. This is intentional — completed work should not generate new coordination overhead — but it can surprise agents who post a routing comment on the wrong card.
