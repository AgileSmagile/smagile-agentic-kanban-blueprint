---
name: watch-card
description: Set up a polling loop on a card where you are waiting for another agent to respond. Auto-blocks the card after a timeout with no response.
disable-model-invocation: true
---

# /watch-card

Use this immediately after posting a routing comment on a card and needing to wait for another agent to respond.

## Usage

```
/watch-card <card_id> <prefix_you_notified> <your_prefix>
```

Example: you commented `[ProjectAgent]` on card 123, your prefix is `Agent-Orchestrator`:
```
/watch-card 123 ProjectAgent Agent-Orchestrator
```

## What this does

Polls your inbox every 10 minutes for a response referencing `#<card_id>`. After 6 attempts (60 minutes) with no reply, blocks the card and adds a comment for the product owner.

## Instructions

**Step 1** — Create an attempt counter file immediately:
```bash
echo 0 > /tmp/watch-<card_id>.count
```

**Step 2** — Create a cron job to run every 10 minutes. The command:
```bash
COUNT=$(cat /tmp/watch-<card_id>.count 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo $COUNT > /tmp/watch-<card_id>.count

if board-tool inbox <your_prefix> | grep -q "#<card_id>"; then
  echo "Response received for #<card_id> - cancelling watch"
  rm -f /tmp/watch-<card_id>.count
  # Cancel this cron by its ID (note the cron ID when you create it)
else
  if [ "$COUNT" -ge 6 ]; then
    board-tool block <card_id> "Waiting for [<prefix_notified>] response - no reply after 1hr"
    board-tool comment <card_id> "[watch-card] No response from [<prefix_notified>] after 1hr. Card blocked. PO: please check inbox or prompt the relevant agent."
    rm -f /tmp/watch-<card_id>.count
    # Cancel this cron by its ID
  else
    echo "Attempt $COUNT/6 - no response yet for #<card_id>"
  fi
fi
```

**Step 3** — Note the cron ID returned by the cron tool. Use it to cancel the loop once the response arrives (or once it auto-blocks).

**Step 4** — Continue your own work. The loop fires every 10 minutes and terminates itself at 6 attempts.

## Polling interval reference

| Agent type | Default poll | Active wait |
|---|---|---|
| Project agents | 1hr + jitter | `/watch-card` (10min, 6 attempts) |
| Orchestrator / specialists | 15min | `/watch-card` (10min, 6 attempts) |

## Why 10 minutes, not 1 hour

You are in active dialogue with another agent. The other agent's inbox poll interval determines response latency; orchestrator and specialist agents poll every 15 minutes, project agents every hour. Polling your own inbox at 10 minutes means you act on a response within one check of receiving it, keeping dialogue latency manageable.

## Rules

- Always use your board tool commands. Never reference API key environment variables directly.
- The loop terminates either on response receipt or after 6 attempts. Do not leave it running indefinitely.
- If the other agent responds correctly (using your prefix in their comment), the board watcher creates an inbox card for you. The 10-minute poll catches it promptly.
