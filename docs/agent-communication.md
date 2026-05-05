# Agent-to-Agent Communication

## Prerequisites: agent multiplicity

The inbox card pattern depends on a fundamental constraint: **each inbox prefix must be owned by exactly one active agent at a time.**

If two Mosaic agents are running simultaneously, both will see the same `[Mosaic]` inbox card and both may act on it.  There is no deduplication.  The result is duplicate work, conflicting board updates, or both agents blocking waiting for each other.

The rule is:

| Role type | How many | Notes |
|---|---|---|
| Orchestrator | One per board scope | Coordinates delivery, monitors WIP, routes cross-domain work |
| Quality Guardian / Test Specialist | One | Cross-cutting quality role; shared by all project agents |
| Project agent (Mosaic, L-E, etc.) | One per domain | Owns a project prefix; only one instance active at a time |
| Sandbox / satellite agent | Unlimited | No board prefix, no persistent inbox loop; opened for one-off tasks and closed when done |

**Sandbox agents are the exception by design.**  They don't own cards, don't maintain persistent loops, and don't have a routing prefix.  They can read the board and write to it (create cards, add comments) but they don't receive inbox notifications and they don't pull work autonomously.  If a sandbox agent produces work that needs to enter the delivery flow, it creates a card and the relevant project agent picks it up.

This distinction matters for cost and coherence: sandbox agents are ephemeral, cheap to run, and create zero coordination overhead.  The system can have as many as the work demands.  Named delivery agents are persistent, carry operational state, and must remain singular within their scope.

## The problem

Agents in a multi-agent system need to notify each other.  Agent A finishes work that Agent B needs to act on.  Agent A needs a review from the TestSpecialist.  An initiative moves to Now and the responsible project agent should wake up.

The natural instinct is to use webhooks: when a comment is posted or a card moves, fire an event, route it to the right agent.  The instinct is correct.  The problem is that most Kanban tools do not fire webhooks for comment events.  Card-level webhooks fire on moves and field changes.  Comment events are invisible to the webhook system.

This is not a minor gap.  Comments are where agents communicate.  If you build your inter-agent messaging on card comment webhooks, you will find out they don't work the first time you test it.

Businessmap resolved this through their business rules engine, which supports triggering on comment events.  This is what the reference implementation uses.  If you are on a different tool or a Businessmap plan without business rules access, see [Agent communication workaround](agent-communication-workaround.md).

## The solution: push via business rules

When Agent A posts a comment containing a `[prefix]` routing token, a Businessmap business rule fires immediately.  It invokes a webhook, which routes through a lightweight proxy and into an n8n handler.  The handler creates an inbox card for the target agent within seconds.

```
Agent A posts [B-prefix] comment on a card
        ↓
Businessmap business rule fires
  (trigger: "Card is updated", predicate: "Comment (new)")
        ↓
Business rule invokes web service (POST)
        ↓
Cloudflare Worker proxy
  — validates request via secret token in URL path
  — rate limits (60 req/min)
  — forwards to n8n
        ↓
n8n webhook handler
  — fetches latest comment on the card via Businessmap API
  — extracts [Prefix] mentions from comment text
  — creates inbox card in col 193 for each mentioned agent
  — sets card type_id to 1 (Comms) to protect flow metrics
        ↓
Target agent picks up inbox card on next poll
```

**Latency:** under one minute from comment posted to inbox card created (observed: ~60 seconds in testing).  For a Three Amigos conversation requiring three agents to align, this is the difference between a 10-minute exchange and a 2-hour one.

**API load:** zero polling overhead.  Requests only occur when comments are actually posted.

**Reliability:** push-based means no events are missed between poll intervals.

### Infrastructure components

**Businessmap business rule** (configured per board in the UI)
- Trigger: "Card is updated"
- Predicate: "Comment (new)"
- Action: "invoke web service" — POST to the Worker proxy URL with the Kanbanize Payload in the body
- The payload includes the card_id, which is all the downstream handler needs
- Must be configured separately for each board

**Cloudflare Worker proxy** (`bmap-webhook-proxy`)
- Sits between Businessmap and n8n
- Validates requests via a secret token embedded in the URL path (`/hook/<secret>`)
- Rate limits to prevent abuse or runaway loops
- Forwards valid requests to the n8n webhook endpoint
- Deployed on Cloudflare's edge network — no server to maintain

**n8n webhook handler** (on Clawbox Pi5)
- Receives the forwarded POST
- Calls the Businessmap API to fetch the latest comment on the referenced card
- Parses comment text for `[Prefix]` routing patterns
- For each mention found, creates an inbox card in the inbox column
- Sets the inbox card's type_id to Comms so it is excluded from flow metrics
- Inbox card title includes the source card reference and a preview of the comment text

### Security

Businessmap does not offer HMAC signatures on webhook payloads.  The Worker proxy uses a shared secret in the URL path as the authentication mechanism.  The Worker rate limits to prevent flooding from malicious actors or Businessmap bugs.  The n8n webhook endpoint on Clawbox is behind Cloudflare Access for general traffic; webhook paths bypass Access (necessary for the Worker to forward requests), but the Worker sends Cloudflare Access service token headers as belt-and-braces.

The webhook secret is stored in `pass` on Clawbox at `webhook/bmap-proxy/secret` and in the Cloudflare Worker via `wrangler secret`.

### Operational notes

Business rules are asynchronous.  Businessmap documents that "in rare cases, business rules may take up to 30 minutes."  In practice, consistent sub-minute delivery has been observed.

The old polling-based Board Watcher has been deactivated.  The direct board webhook (which fired on all events, not just comments) has been disabled.

## The inbox card pattern

The routing mechanism is the same regardless of whether notification is push or pull: comments with `[prefix]` tokens, inbox cards in a dedicated column, agents picking up and responding.

When Agent A needs Agent B's input, it posts a comment on the relevant card using a `[prefix]` convention.  The business rule fires, the handler creates a transient **inbox card** in the inbox column.  Agent B picks it up, does the work, posts a response using Agent A's prefix to route the reply back, and closes the inbox card.

Neither agent needs to know the other is running.  Neither needs to be available in real time.  The board handles the routing.

**Card typing:**  Inbox cards are communication, not delivery work.  Set inbox cards to the Comms type after creation (see [Card types](../orchestrator/agent-guidelines.md#card-types) in the agent guidelines).  This prevents inbox cards from polluting flow metrics.  A system that creates 20 inbox cards a day and routes them to Closed within minutes will show artificially fast cycle times and inflated throughput if those cards are indistinguishable from delivery work.

## The routing convention

**The only thing that goes in square brackets in card comments is a project prefix or agent identifier.**  This is the convention the handler relies on.  It must be honoured.

| Comment contains | Routes to | Example |
|---|---|---|
| `[Mosaic]` | Mosaic project agent | `[Mosaic] please review the auth changes` |
| `[L-E]` | Lead-Engine agent | `[L-E] outreach template needs updating` |
| `[SW-v2]` | smagile.co v2 agent | `[SW-v2] deploy is blocked, see comment` |
| `[Scout]` | Scout agent | `[Scout] new LinkedIn extraction failing` |
| `[AKB]` | Orchestrator (AKB work) | `[AKB] initiative needs scoping` |
| `@Agent-Orchestrator` | Orchestrator (direct mention) | BM @mention, HTML-wrapped |
| `@Agent-TestSpecialist` | Test Specialist | BM @mention, HTML-wrapped |

The handler regex for `[prefix]` is `/\[([A-Za-z][A-Za-z0-9-]*)\]/`.  This deliberately excludes:
- `[notification/Agent-X]` — contains a slash, used as agent response prefix
- `[#nnn]` — starts with `#`, used in card title parent references

Both are safe from false triggering without any special handling.

### Initiative wakeup

When an initiative titled `[Mosaic] v2 rearchitecture` moves to the Now column, the handler extracts the prefix from the title and creates an inbox card for the Mosaic agent automatically.  No comment required.  Name your initiatives with the responsible agent's prefix and wakeup is free.

## Polling intervals

Agents still poll their inbox column for new cards.  The push mechanism delivers inbox cards within seconds; the poll picks them up at the next check.  This is acceptable because agents are not expected to respond in real time.

Not all agents need to poll at the same frequency.  Three tiers balance responsiveness against API rate consumption:

| Role | Default interval | Rationale |
|---|---|---|
| Project agents (Mosaic, L-E, etc.) | 60 minutes | Planned delivery work; async coordination is fine |
| Coordination hubs (Orchestrator, TestSpecialist) | 15 minutes | Cross-cutting concerns; faster response has system-wide value |
| Active wait (agent just tagged another) | 10 minutes | Dialogue mode; use `/watch-card` protocol |

**Session startup:** always check inbox immediately on session start, before setting up the background loop.  The background loop is insurance for autonomous sessions; an active session relies on the agent being present.

### Rate limits

Polling `bmap inbox` is a single targeted API call (one column, per_page=100).  At 13 agents running simultaneously: roughly 20-25 calls per hour at staggered intervals.  Well within typical board tool rate limits (600/hr, 30/min in the reference implementation).

Do not poll `bmap cards` (all board cards) for inbox checks.  That paginates across the whole board and multiplies the call count.  Always use the inbox-specific query.

## Waiting for a response: `/watch-card`

When Agent A has notified Agent B and needs to act on the response, it should not idle or poll at its normal interval.  Use the `/watch-card` pattern:

1. After posting the `[B-prefix]` comment, create a repeating 10-minute check
2. Each check: look for a response inbox card referencing `#card_id` in Agent A's inbox
3. Response found: process it, cancel the check
4. No response after 6 attempts (60 minutes): block the card, add a comment for the human

This keeps dialogue latency manageable without burning API calls on continuous polling.

## What this is not

This pattern is **asynchronous coordination**, not real-time messaging.  The design target is a system where agents work independently on their own WIP, coordinate when needed, and do not depend on another agent being instantly available.

Maximum wait windows (not average) — push-based delivery, agent polls own inbox on schedule:

| Interaction | Max latency |
|---|---|
| Orchestrator ↔ TestSpecialist | ~15 minutes |
| Project agent ↔ Orchestrator | ~75 minutes |
| Project agent ↔ Project agent | ~2 hours |

If your system requires faster agent-to-agent response, you need a different communication mechanism (shared memory, a message queue, or a real-time coordination layer).  The inbox card pattern trades latency for simplicity and reliability.

## Known failure modes

**Bootstrap gap.**  When a card first enters a scanned column, the handler records the latest comment ID as `lastSeen` and skips processing on that first scan (to avoid triggering on old comment history).  A comment posted at the exact moment the card enters the column may be missed.  The fix: on first scan, process comments newer than a short time window (5 minutes in the reference implementation).  See [mistakes-we-made.md](mistakes-we-made.md).

**API key drift.**  If the handler reads its API key from a file rather than directly from the secrets store, that file can drift out of sync when keys are rotated.  Symptom: inbox cards stop being created silently.  Fix: check the key file when debugging, re-sync from the secrets store.

**Cascade.**  If an agent's response comment triggers the handler to notify another agent, and that agent's response triggers the first agent again, you get an infinite loop.  Prevention: agent responses must use a prefix that cannot match the detection pattern.  In the reference implementation, responses use `[notification/Agent-X]` (contains a slash) which the handler regex explicitly excludes.

**Scanned column scope.**  The handler only creates inbox cards for comments on cards in specific columns (Doing, Done, Validation/Rework in the reference implementation).  A comment on a card in Backlog, Ready, or Shipped will not create an inbox card.  This is intentional — completed work should not generate new coordination overhead — but it can surprise agents who post a routing comment on the wrong card.

## Practical implementation

### Posting comments on existing cards

The primary communication path.  When working on a card and you need input from another agent:

```bash
# Post a comment with a routing prefix
bmap comment <card_id> '[Orchestrator] Question about cross-project dependency'

# Or use an @mention for named agents
bmap comment <card_id> '@Agent-TestSpecialist please review the auth changes in this PR'
```

### Creating standalone inbox cards

When the communication is not attached to an existing work item:

```bash
# Create a card directly in the inbox column
bmap create "[Prefix] Title of notification" <inbox_col> <lane_id> <workflow_id>

# Add detail as a follow-up comment
bmap comment <card_id> 'Detail about what was done, why it matters, and what the recipient should know'
```

Use standalone inbox cards for:
- Sharing a new practice or architectural decision that affects the estate
- Raising a continuous improvement idea
- Asking a question that does not belong on any existing card
- Notifying agents of something they need to know but are not currently working on

### Shell escaping: the single-quote rule

The `bmap comment` command passes text through shell arguments into a JSON payload via a Node.js helper.  This creates a serialisation boundary that breaks on special characters.

**Always use single quotes** around comment text.  Double-quoted strings containing parentheses, em dashes, or other special characters cause JSON serialisation failures (HTTP 400, error code VE03: "request body is not valid json").

```bash
# Works
bmap comment 1087 'New practice rolled out: Husky + coverage thresholds across the estate'

# Breaks (parentheses in double quotes)
bmap comment 1087 "New practice rolled out (Husky + coverage thresholds) across the estate"
```

**Keep comments to a single line.**  Multi-line text passed through shell arguments breaks the JSON payload.  If you need to communicate complex detail, post multiple short comments rather than one long one.

### When to use which mechanism

| Situation | Mechanism |
|---|---|
| Need input on a card you are working on | Comment on that card with prefix or @mention |
| Sharing a decision or practice with the estate | Inbox card with recipient prefix |
| Asking for information you cannot find | Comment on your card, or inbox card if no card exists |
| Continuous improvement idea from session wrap | Inbox card (session wrap skill handles this) |
| Escalating a blocker to the human | Block the card with native block functionality and add a comment |

**The default should be self-service.**  If the orchestrator or another agent can answer a question, use the board.  The human owns strategy and priorities; agents own coordination.
