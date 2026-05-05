# Agent Communication Workaround: Polling-Based Inbox

**This document is only relevant if you cannot use the push-based approach described in [agent-communication.md](agent-communication.md).**  Specifically, you need this if:

- You are on a Businessmap plan without business rules access
- You are using a different board tool that does not support comment-event triggers
- You want a simpler setup with fewer moving parts and are willing to accept higher latency

If you have Businessmap with business rules enabled, stop here and read [agent-communication.md](agent-communication.md) instead.  The polling approach below works, but it is slower, more expensive on API calls, and more complex to maintain.

---

## How it works

Without push notification, agents must detect new comments themselves.  A **Board Watcher** — a separate, continuously running workflow — polls the Businessmap API on a schedule, scans for `[prefix]` mentions in recent comments, and creates inbox cards for the target agent.

```
Agent A posts [B-prefix] comment on a card
        ↓
Board Watcher (n8n cron, runs every 90 seconds)
  — fetches all cards in active columns
  — for each card, fetches comments since last poll
  — scans comment text for [Prefix] patterns
        ↓
If a mention is found:
  creates inbox card in col 193 for target agent
        ↓
Target agent polls inbox on their own interval
  (15 min for hubs, 60 min for project agents)
        ↓
Target agent picks up inbox card, does work, responds
```

The routing convention, inbox card pattern, and `[prefix]` regex are identical to the push-based approach.  The only difference is how inbox cards are created and how quickly.

## Latency

- **Minimum:** 90 seconds (Board Watcher cycle) + agent poll interval
- **Typical hub-to-hub (orchestrator ↔ TestSpecialist):** 15-25 minutes
- **Typical project agent involved:** up to 75 minutes one way
- **Full project-agent-to-project-agent exchange:** up to 2 hours

For a Three Amigos conversation requiring three agents to align, this compounds to hours rather than minutes.  This is acceptable for planned delivery work.  It is frustrating for anything time-sensitive.

## Board Watcher implementation

The Board Watcher is an n8n workflow with the following logic:

1. Cron fires every N minutes (90 seconds in the reference implementation)
2. Fetch all cards in active columns (Doing, Done, Validation/Rework)
3. For each card, fetch comments since the stored `lastSeen` comment ID
4. Scan comment text for the `[Prefix]` regex: `/\[([A-Za-z][A-Za-z0-9-]*)\]/`
5. For each match, resolve the target agent from the prefix map
6. Create an inbox card in col 193 for the target agent
7. Set the inbox card's type_id to Comms (type_id: 1) to exclude from flow metrics
8. Update `lastSeen` to the latest comment ID processed

**Bootstrap gap.**  When a card first enters a scanned column, record the latest comment ID as `lastSeen` and skip processing on that first scan.  This prevents triggering on old comment history.  A comment posted at the exact moment the card enters the column may be missed.  Mitigation: on first scan, process comments newer than a short time window (5 minutes works in practice).

**Scanned column scope.**  Only scan comments on cards in active columns.  A comment on a card in Backlog or Shipped will not create an inbox card.  Intentional, but it surprises agents who post a routing comment on the wrong card.

## API load

Each Board Watcher poll hits the Businessmap API regardless of whether anything has changed.  At 90-second intervals, that is roughly 40 calls per hour for the Board Watcher alone.  Multiply by the number of active agents polling their own inbox and the request volume becomes significant.

Businessmap enforces rate limits (600 req/hr, 30 req/min in the reference implementation).  Heavy polling risks throttling.

Mitigations:
- Use the inbox-specific query (`bmap inbox <prefix>`) for agent inbox checks, not `bmap cards` (which paginates the whole board)
- Stagger agent polling intervals so they don't all hit the API at the same minute
- Consider raising the Board Watcher interval to 5 minutes if rate limiting becomes a problem

## Known failure modes

**API key drift.**  If the Board Watcher reads its API key from a file rather than directly from the secrets store, that file can drift when keys are rotated.  Symptom: Board Watcher stops creating inbox cards silently.  Fix: check the key file, re-sync from the secrets store.

**Cascade.**  An agent response comment that triggers another notification creates an infinite loop.  Prevention: use `[notification/Agent-X]` (contains a slash) as the response prefix — the Board Watcher regex excludes it.

**Missed events between polls.**  If a card moves columns between Board Watcher cycles and the new column is not in the scanned set, comments posted during that window are missed permanently.

## When this workaround is appropriate

- Small number of agents where 15-minute latency is acceptable
- No infrastructure appetite for a Cloudflare Worker + n8n webhook setup
- Board tool other than Businessmap (the pattern is tool-agnostic)
- Prototyping or early-stage implementation before committing to the push model

The polling model works.  It is just slow, and it gets more expensive as the agent estate grows.  When you are ready to move to push, see [agent-communication.md](agent-communication.md) for the full architecture.
