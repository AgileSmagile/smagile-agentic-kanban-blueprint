# Context-Aware Review Trigger Hook

## The Problem

The [cross-agent review triggers](quality-gates.md#cross-agent-review-triggers) define when agents must tag another agent before merging. But policy documentation is passive: agents have to remember to check it. When an agent is deep in implementation, the last thing on their mind is "should I have tagged someone?"

Periodic reminders (like [flow nudges](security.md#flow-nudges-silent-periodic-reminders)) don't solve this either. A generic "remember to tag TestSpecialist if you're touching auth" firing every 25 tool calls while an agent writes CSS is noise. It trains agents to ignore nudges.

## The Solution: Context-Aware Hook

A hook that fires periodically, checks what files the agent has actually modified (via `git diff`), and only outputs a review reminder when modified files match trigger patterns.

**Key properties:**
- **Context-aware:** only fires when relevant files are modified
- **Low overhead:** throttled to check every N tool calls (default: 50)
- **Non-blocking:** outputs to stderr as a reminder, not a gate
- **Specific:** tells the agent exactly which files triggered and which agent to tag

The sentinel tests catch the problem at commit time (blocking). This hook catches it during development (advising). Together they form defence in depth: the agent gets reminded while building, and blocked if they ignore the reminder.

## How It Works

```
PostToolUse fires
  → Increment counter
  → If counter % interval != 0: exit (throttle)
  → Run git diff --name-only (staged + unstaged)
  → If no modified files: exit
  → Match files against trigger patterns
  → If no matches: exit (no noise)
  → Determine which agent(s) to tag based on pattern category
  → Output contextual reminder to stderr
```

The agent sees something like:

```
[review-trigger] You are modifying files that require cross-agent review before merging:
  - src/lib/auth/session.ts
  - supabase/migrations/20260518_add_table.sql

Tag [TestSpecialist] on the card before merging. See agent_guidelines.md.
```

## Reference Implementation

```bash
#!/bin/bash
# review-trigger-check.sh — Context-aware cross-agent review reminder
# Fires on PostToolUse. Only outputs when modified files match trigger patterns.

COUNTER_FILE="$HOME/.claude/hooks/.review-trigger-count"
LOG_FILE="$HOME/.claude/audit/review-triggers.log"
INTERVAL="${REVIEW_TRIGGER_INTERVAL:-50}"

mkdir -p "$(dirname "$LOG_FILE")"

# Throttle: only check every N tool calls
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"
if [ $((COUNT % INTERVAL)) -ne 0 ]; then
  exit 0
fi

# Must be in a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

# Define trigger patterns by category
# Adapt these to your system's security-sensitive paths
AUTH_PATTERNS="auth|session|middleware"
MIGRATION_PATTERNS="migration|\.sql$"
CONTRACT_PATTERNS="contract|api-auth|entitlement"
BILLING_PATTERNS="billing|payment|subscription|gocardless|stripe"
PII_PATTERNS="gdpr|pii|encrypt|personal.data|retention"
WEBHOOK_PATTERNS="webhook|hmac|signature.verif"

ALL_PATTERNS="$AUTH_PATTERNS|$MIGRATION_PATTERNS|$CONTRACT_PATTERNS|$BILLING_PATTERNS|$PII_PATTERNS|$WEBHOOK_PATTERNS"

# Check staged and unstaged modifications
MODIFIED=$(git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null)
if [ -z "$MODIFIED" ]; then
  exit 0
fi

# Filter for triggerable files
TRIGGERED=$(echo "$MODIFIED" | grep -iE "$ALL_PATTERNS" | sort -u)
if [ -z "$TRIGGERED" ]; then
  exit 0
fi

# Determine which review is needed based on category
NEEDS_QUALITY=""
NEEDS_ORCHESTRATOR=""

if echo "$TRIGGERED" | grep -iqE "$AUTH_PATTERNS|$MIGRATION_PATTERNS|$BILLING_PATTERNS|$PII_PATTERNS|$WEBHOOK_PATTERNS"; then
  NEEDS_QUALITY="yes"
fi
if echo "$TRIGGERED" | grep -iqE "$CONTRACT_PATTERNS"; then
  NEEDS_ORCHESTRATOR="yes"
fi

# Build output
FILES=$(echo "$TRIGGERED" | head -5 | sed 's/^/  - /')
FILE_COUNT=$(echo "$TRIGGERED" | wc -l | tr -d ' ')
if [ "$FILE_COUNT" -gt 5 ]; then
  FILES="$FILES
  ... and $((FILE_COUNT - 5)) more"
fi

TAGS=""
if [ -n "$NEEDS_QUALITY" ]; then
  TAGS="[QualityGuardian]"
fi
if [ -n "$NEEDS_ORCHESTRATOR" ]; then
  [ -n "$TAGS" ] && TAGS="$TAGS and "
  TAGS="${TAGS}[Orchestrator]"
fi

# Log for audit
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | tool_call=$COUNT | files=$FILE_COUNT | tags=$TAGS" >> "$LOG_FILE"

# Output to agent
echo "" >&2
echo "[review-trigger] You are modifying files that require cross-agent review before merging:" >&2
echo "$FILES" >&2
echo "" >&2
echo "Tag $TAGS on the card before merging." >&2

exit 0
```

## Configuration

Register in your `settings.json` (or equivalent hook configuration):

```json
{
  "PostToolUse": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "bash \"$HOME/.claude/hooks/review-trigger-check.sh\"",
          "timeout": 10
        }
      ]
    }
  ]
}
```

## Tuning

**Interval (REVIEW_TRIGGER_INTERVAL):** Default 50. This means the check runs every 50 tool calls, roughly every 5-10 minutes of active work. Lower values catch modifications sooner but add git overhead. Higher values reduce overhead but might not catch triggers until the agent is nearly done.

**Patterns:** Adapt the grep patterns to your codebase. The reference patterns are generic; your system may have project-specific paths that should trigger review (e.g. `infrastructure/`, `deploy/`, `env.production`).

**Non-blocking vs blocking:** This hook is intentionally non-blocking (exit 0 always, output to stderr). The sentinel tests at commit time are the actual gate. This hook provides situational awareness; the sentinels provide enforcement.

## Relationship to Other Mechanisms

| Mechanism | When it fires | What it does | Blocking? |
|---|---|---|---|
| **Review trigger hook** | Every N tool calls during work | Reminds agent to tag reviewer | No |
| **Sentinel tests** | At commit time (pre-commit hook) | Blocks commit if invariant violated | Yes |
| **Agent guidelines** | Read at session start | Defines the policy | No |
| **Inbox routing** | After agent posts tag comment | Delivers notification to reviewer | No |

Defence in depth: policy (guidelines) → awareness (this hook) → enforcement (sentinels) → routing (inbox).

## Why This Matters for Agentic Systems

In a human team, a developer touching auth code would naturally mention it in standup or ping a security engineer on Slack. The social context provides the trigger. Agents don't have social context. They don't think "hmm, this feels like it should have another pair of eyes on it" unless you tell them to.

This hook provides the equivalent of that social sense. It observes what the agent is doing and surfaces the appropriate coordination action at the right time. Not before (noise), not after (too late), but during.
