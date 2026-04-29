---
tags: [policy, dispatch, orchestration, quality-gates]
type: operating-model
status: active
date: 2026-04-28
---

# Dispatch Policy: Orchestrator and Quality Guardian Escalation

When a project agent hits a dispatch threshold mid-task (authentication touched, performance regression, low confidence in test coverage, etc.), it does not wait for a new session or a separate review column. It escalates in-place via card comment.

## Escalation flow

### 1. Tag and request

Add a **Businessmap comment on the current card**:
- Tag both **orchestrator** AND **James** (the product owner)
- Describe the specific issue, not a generic question
- Example: "Touching session auth middleware. Low confidence in token expiry edge cases. Need QG review before continuing."

The card stays in its current column. WIP is still consumed, making the blockage visible.

### 2. Non-blocking work

**Do not wait idly.** If there is available WIP capacity in your project:
- Pull the next Ready card
- Start work on it
- Continue polling the original card in the background

A waiting card occupies one WIP slot. A waiting agent pulling additional work requires that additional work to exist. If no Ready cards exist, then wait.

### 3. Polling for response

Set a loop to check the card for new comments:

```bash
# Poll the card every 10 minutes for up to 60 minutes
bash C:/Users/James/Projects/sonnet-agent/bin/bmap card <card_id>
```

After each poll:
- Check the latest comment author
- If it is still you (the agent), no response yet — continue your other work
- If it is orchestrator, James, or QG, read the latest comment and act on it

**Loop parameters:**
- Interval: 10 minutes
- Maximum duration: 60 minutes (6 consecutive polls)
- Action on response: read comment, act, continue or re-tag if further input is needed

### 4. Escalation after 60 minutes

If no response after 6 consecutive polls (60 minutes):

1. **Mark the card Blocked** in Businessmap (use native block functionality)
2. **Add a CLI notification** to James:
   ```
   [DISPATCH ESCALATION] Card #123 has been waiting 60 minutes for orchestrator/QG response. No response received. Card is now marked Blocked. Manual intervention required.
   ```
3. **Do not create a new card or context.** The card comment thread is the full context.

James will either:
- Respond to the card comment (agent resumes on next poll)
- Unblock the card with a decision or guidance
- Escalate to the relevant party

### 5. Resume

The moment the latest card comment is from someone other than you:
- Read the comment
- Act on it (implement the feedback, apply the guidance, etc.)
- Continue the original work or pull new work as appropriate

If the comment requires further input, re-tag and repeat the loop.

## Why this approach

**Keeping coordination in Businessmap:**
- Card comments are the real-time collaboration surface
- No separate contexts or handoff files needed
- Full history is visible on the card

**Non-blocking loops:**
- Agents don't sit idle waiting for responses
- Other work can progress while waiting
- Escalation is automatic if ignored, not reliant on remembering to follow up

**Clear accountability:**
- Thresholds that trigger dispatch are explicit (see `agent-guidelines.md`)
- The 60-minute window is predictable
- James gets a direct notification if the system response is slow

## Related

- **Thresholds that trigger dispatch:** see `agent-guidelines.md` section "Specialist and peer dispatch"
- **When to poll:** immediately after tagging, then every 10 minutes
- **When to escalate:** after 60 minutes with no response
- **WIP rules:** see `agent-guidelines.md` section on WIP limits and capacity
