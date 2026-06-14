# How Do You Know It's Working?

You don't need a metrics dashboard. You need three signals and the discipline to check them.

## After 5 sessions: is the board carrying context?

Open a card that was worked on in a previous session. Read the comments. Could a fresh agent (or you, two weeks from now) understand what was done, what's remaining, and why decisions were made?

If yes, the system is working. Context is surviving session boundaries.

If no, your agents aren't writing good handoff comments. Check whether your card standards are clear enough and whether the "last 60 seconds of a session" ritual (see [session-boundaries.md](session-boundaries.md)) is being followed.

**What to look for:**
- Cards with comments that explain *what was done* and *what's remaining*
- Blocked cards with specific, actionable block reasons
- Cards that a different agent picked up mid-stream and continued without asking clarifying questions

**Red flags:**
- Cards with no comments beyond the initial description
- Cards where a new agent re-asked questions that were already answered in a previous session
- Block reasons like "blocked" with no explanation

## After 10 sessions: are items finishing faster?

Look at how long cards spend in Doing. You don't need formal cycle time charts; just glance at the WIP age when you start each session. Are cards that enter Doing today finishing sooner than cards that entered Doing two weeks ago?

If yes, the system is compounding. Agents are getting better at the work because the knowledge system, card standards, and guidelines are reducing uncertainty.

If no, check two things:
1. **Card quality.** Are descriptions still vague? Agents that have to figure out what "improve the dashboard" means will always be slower than agents given specific criteria.
2. **Knowledge capture.** Are agents writing to domain files? If agents aren't writing observations after completing cards, the system isn't learning. Each session starts from the same baseline instead of building on what came before.

**What to look for:**
- WIP age trending downward (or stable at a healthy level)
- Fewer clarifying questions from agents before they start work
- Knowledge entries that reference patterns discovered in previous sessions

**Red flags:**
- WIP age trending upward with no change in card complexity
- The same correction being given to agents in multiple sessions (should have been captured as a rule)
- Domain knowledge files that haven't been updated in the last 5 sessions

## After 20 sessions: is rework decreasing?

Rework means cards that ship, get reviewed, and come back with changes needed. Some rework is healthy (product decisions that need human judgment). Excessive rework means the system isn't capturing preferences and standards effectively.

Track informally: when you review a card, did the agent get it right on the first pass? Are you giving the same feedback repeatedly ("too formal," "wrong colour scheme," "missing error handling")?

If rework is decreasing, the feedback loop is working. Agents are applying knowledge from previous sessions and your corrections are sticking.

If rework is steady or increasing, check:
1. **Are corrections being saved as feedback memories (see [glossary](getting-started.md#what-these-terms-mean)) or knowledge entries?** A correction that only exists in conversation history dies when the session ends.
2. **Are CLAUDE.md files carrying enough project-specific context?** If every agent has to rediscover your preferences, the system has a memory leak.
3. **Are you reviewing the right things?** If technical work keeps coming back with product feedback, the Done/Shipped boundary might be wrong.

**What to look for:**
- First-pass acceptance rate improving over time
- Feedback memories and rules that reference specific past corrections
- Agents proactively applying standards you taught them sessions ago

**Red flags:**
- The same feedback given three or more times across different sessions
- Agents not reading the knowledge system before starting work
- Rules file that hasn't been updated since it was seeded

## The meta-signal: are you spending less time directing and more time deciding?

The ultimate measure of a healthy agentic Kanban system is how you spend your time. Early on, you'll spend most of your time explaining what to do and how to do it. Over time, that should shift toward making product decisions, reviewing output, and setting direction.

If you're still explaining the same things after 20 sessions, something in the persistence layer (cards, knowledge, CLAUDE.md, guidelines) isn't capturing it.

If you're mostly making decisions and reviewing output, the system is working as designed: agents handle the execution, you handle the judgment.

## Automated health monitoring: heartbeat → board cards

The signals above are human-checked.  For production systems with public endpoints, automated monitoring closes the gap between "something broke" and "someone noticed."

The pattern is a heartbeat script that runs on a schedule (e.g. every 5 minutes via cron), checks each endpoint, and feeds failures back into the board system as cards:

1. **Check each endpoint.**  A simple HTTP request with a timeout.  If it fails, retry once after a short delay to filter transient blips.
2. **On first failure: create a board card.**  Title includes the service name and failure type.  Card goes into the Inbox column.  The agent or PO sees it on next board check.
3. **On recovery: comment on the existing card.**  "Service recovered at [timestamp].  Downtime: [duration]."  The card can then be moved to Done or closed.
4. **State-file deduplication.**  A state file per endpoint tracks whether the current state is "up" or "down."  This prevents creating a new card every 5 minutes for an ongoing outage.  The card is created on the transition from up to down; the comment is posted on the transition from down to up.

The state files should live on persistent storage (not `/tmp`) so they survive reboots.  The script sources its board API key from the environment or the secrets manager, never hardcoded.

**Why this matters for agentic systems:**  An agent that checks the board on startup and sees a "Service X down" card in Inbox can act on it autonomously: investigate, attempt a fix, or escalate with diagnostic information.  The monitoring feeds the board; the board feeds the agent.  No human needs to notice the outage and manually create a card.

This is not a replacement for external uptime monitoring (UptimeRobot, Updown.io, etc.).  External monitors verify from outside your network.  A heartbeat script running on your own infrastructure verifies from inside.  Both are valuable; they catch different failures.

## A note on flow metrics

The signals above are deliberately practical rather than metric-heavy.  That is intentional.

In a solo agentic system, the bottleneck does not move.  It is the human, the product owner, every time.  The standard Kanban response to that (inspect your cumulative flow diagram, identify where work is piling up, swarm the constraint) does not apply in the same way when there is one human and the constraint is structural.

The interventions that actually reduce the bottleneck in this system are architectural: YOLO mode to remove routine permission prompts, fix-forward policy so work does not halt, robust test coverage so confidence in automation is warranted, mechanical hooks that enforce rules without relying on the agent remembering them.  These are flow interventions.  They just do not show up on a chart.

Where flow management does matter at a higher level of fidelity is at the initiative layer: which ideas enter the system, in what order, and when something moves from Next to Now.  That is where the human's judgment has the highest leverage.

If you have a team, or longer-cycle work with genuine handoff points between people, card-level flow metrics will tell you things worth knowing.  The signals in this document are designed for a solo operator.  Adapt accordingly.

For a fuller treatment of this: [The Bottleneck Is Me](https://smagile.co/resources/blog/), Part 9 of the Agentic Kanban Blueprint series.
