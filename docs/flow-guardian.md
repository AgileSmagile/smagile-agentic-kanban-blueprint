# The Flow Guardian Pattern

## The idea

Most agentic systems focus on delivery: agents pull work, write code, ship features. But nobody watches the system itself. Nobody asks whether items are aging unnecessarily, whether the PO is the bottleneck, or whether the team's process is impeding flow.

In Kanban, this role exists. The [Kanban Pocket Guide](https://prokanban.org/kanban-pocket-guide/) (Vacanti, Singh, Johnson) makes the case that **work item age is the single most important aspect of Kanban**. Not WIP limits. Not visualisation. Not throughput. The only question that matters: are items aging unnecessarily?

A Flow Guardian is an agent whose primary job is to monitor flow health, nudge for action on aging items, prompt for retrospective activity, and provide feedback when the human's processes are impeding the system. Think of it as a scrum master for the agent team, but grounded in flow principles rather than ceremony.

## Why agents need this

Human teams have stand-ups, retrospectives, and coaches who notice when things are stuck. An agentic system has none of these unless you build them in. Without a flow guardian:

- Cards age past their SLE and nobody flags it
- The PO becomes the bottleneck (review queue, blocked items waiting for decisions) and no agent tells them
- Process improvements only happen when the PO notices a problem, not when agents observe one
- Retrospective activity never happens because no agent is tasked with prompting for it
- Right-sizing never happens because agents work on whatever card they're given, regardless of whether it's too big

## Age-based intervention triggers

The Kanban Pocket Guide describes a percentile-based intervention model. As items age, the probability of missing their SLE increases. Each percentile threshold is a trigger for increasingly urgent action.

Adapt the percentiles below to your own SLE. This example uses an 85th percentile SLE of 5 days for cards:

| Item age reaches | What it means | Agent action |
|-----------------|---------------|-------------|
| **50th percentile** (~2.5 days) | This item is now larger than half of all items seen before. Chance of missing SLE has doubled from 15% to 30%. | **Investigate.** Comment on the card: "This item has reached the 50th percentile. Is it blocked? Too big? Needs a different approach?" Flag in the daily status. |
| **70th percentile** (~3.5 days) | Larger than two-thirds of previous items. Chance of missing SLE is now 50%. Coin flip. | **Escalate.** Tag the PO: "This item is at the 70th percentile. Actions to consider: swarm on it, break it down, or remove a blocker." Suggest specific actions based on the card's state. |
| **85th percentile** (5 days = SLE) | The item has hit the SLE. It is now in the tail of the distribution. | **Alert.** Tag the PO with urgency: "SLE breach. This item needs immediate attention. Recommend: break it down, reassign, or escalate the blocker." |
| **Beyond SLE** | The item is in violation. Every additional day is compounding risk. | **Persistent follow-up.** Daily comments on the card. Daily mention in status updates. Do not let this fade into the background. |

For initiatives, apply the same model with the initiative SLE (e.g. 5 days in Now at the 85th percentile).

### The key insight from the Pocket Guide

> "The real reason to control WIP is to prevent unnecessary aging."

WIP limits are not goals in themselves. They exist to prevent items from aging. If your WIP is within limits but items are still aging past their SLE, the WIP limits aren't doing their job. Tighten them or change the policies.

## Right-sizing: the first response to aging

When an item is aging, the most likely cause is that it's too big. The Pocket Guide's right-sizing principle: if you can't finish an item within your SLE based on what you know right now, it needs to be broken down before you start it.

**Agent behaviour for right-sizing:**

Before pulling an item from Ready:
- "Based on what we know, can this be finished within the SLE (5 days)?"
- If yes: pull it and start
- If no: suggest breaking it down and flag to the PO

When an item reaches the 50th percentile:
- "This item is aging. Is it actually multiple items disguised as one?"
- Suggest specific breakdown strategies (see below)

### Breaking down work items (from the Pocket Guide)

When an item needs to be broken down, use these strategies:

1. **Acceptance criteria splitting.** If a card has 5 acceptance criteria, each might be a separate deliverable. Ship each one for feedback rather than waiting for all 5.

2. **Conjunction splitting.** Look for "and", "or", commas, and slashes in card titles. "Add password reset and email verification" is two cards.

3. **Generic term splitting.** "Handle all error states" is vague. "Return 402 for expired subscriptions" and "Return 429 for rate limits" are specific and independently deliverable.

4. **Optimise now vs later.** What's the simplest version that delivers value? Ship that first, then iterate.

Agents should apply these strategies proactively when items are aging, not wait for the PO to notice.

## Nudges for retrospective activity

The Flow Guardian prompts for retrospective activity on a regular cadence, not just when something goes wrong. This is how the system improves.

### Cadence-based nudges

| Trigger | Nudge |
|---------|-------|
| **Every 5 completed cards** | "5 cards shipped since last review. Observations: [list any SLE breaches, blockers, or patterns]. Worth a 10-minute review?" |
| **Weekly** | "Weekly flow snapshot: throughput [X cards], average cycle time [Y days], SLE compliance [Z%]. Any process changes to try this week?" |
| **After an SLE breach** | "Card #[id] breached its SLE by [N days]. Root cause: [blocked/too big/waiting for review]. Should we adjust anything to prevent this recurring?" |
| **After a blocker is resolved** | "Card #[id] was blocked for [N days] by [reason]. Is this a systemic issue? Should we create a knowledge entry or change a policy?" |

### Flow metrics hygiene

Flow metrics are only useful if they measure delivery work.  In an agentic system, the board will contain cards that are not delivery: communication cards between agents, monitoring alerts, test findings.  If these are included in cycle time and throughput calculations, your metrics will lie.

**Card types are the mechanism.**  If your board tool supports typed cards, use them to classify non-delivery items (see [Card types](../orchestrator/agent-guidelines.md#card-types) in the agent guidelines).  Filter metrics calculations to exclude Comms cards.  Monitoring Alerts and Test Findings are real work but should be analysable separately from planned delivery.

**What to watch for:**
- Cycle time suddenly dropping without a process change (likely Comms cards being created and closed within minutes)
- Throughput spiking without a corresponding increase in shipped features (same cause)
- SLE compliance improving without evidence of faster delivery (filtered vs unfiltered metrics diverging)

If your board tool's analytics do not support filtering by card type, track untyped cards only and use a naming convention (e.g. prefix Comms cards with `[Comms]`) to manually exclude them from reporting.

### Process impediment detection

The Flow Guardian should proactively flag when the PO's behaviour is impeding flow. This requires radical candour, delivered constructively:

| Signal | What it means | Nudge |
|--------|--------------|-------|
| Done column at capacity for >24 hours | PO hasn't reviewed completed work | "Done has been at capacity for [N hours]. [X cards] are aging while waiting for your review. Can you pull one to VR or Shipped?" |
| Multiple cards blocked on PO | PO is the bottleneck | "3 cards are currently blocked on decisions from you: [list]. This is consuming [X] of our WIP capacity. Can we unblock any of these now?" |
| No board activity for >48 hours | Stalled system | "No card transitions in 48 hours. Is work happening off-board? If so, it needs cards. If not, what's blocking progress?" |
| Cards created without descriptions | Quality slip | "Card #[id] was created without a description. A fresh agent can't pick this up. Can you add What/Why/Done When?" |
| WIP consistently under target | Pull problem | "WIP has been [X/Y] for [N days]. Under-WIP is a flow problem. Are there cards in Ready to pull, or is Ready empty?" |

These aren't just monitoring alerts. They're feedback on the human's process, delivered by an agent that understands flow principles. The PO should welcome this feedback the same way they'd welcome it from a Kanban coach.

## Implementing the Flow Guardian

### As a dedicated agent

Create a persona with flow guardianship as its primary responsibility. See `personas/flow-guardian/` for a worked example. This agent:

- Runs on a schedule (daily, or triggered by board events)
- Checks WIP age, SLE compliance, blocked items, Done queue depth
- Posts nudges to the team channel (Discord, Slack, etc.)
- Creates knowledge entries when patterns are detected
- Prompts for retrospective activity at the defined cadence

### As behaviour embedded in all agents

Even without a dedicated Flow Guardian agent, every agent can incorporate flow awareness:

- **On startup:** check `board-cli wip-age`. Flag any items approaching or past their SLE.
- **Before pulling work:** check if the candidate item is right-sized for the SLE.
- **When blocked:** immediately block the card, tag the PO, and suggest specific actions.
- **After completing a card:** note whether it shipped within the SLE. If not, write a knowledge entry about why.
- **When observing process issues:** say so immediately. Don't wait for a scheduled retrospective. "This card's acceptance criteria could be 3 separate cards" is feedback worth giving in the moment.

The communication standard reinforces this: "Challenge questionable ideas, push back, and ask questions wherever they come up. Do not wait for a retrospective to surface continuous improvement ideas."

## Connection to the knowledge system

Flow observations are prime candidates for the knowledge system:

- **Recurring blocker patterns** → knowledge entry, potentially a hypothesis ("external API dependencies block cards >40% of the time")
- **Right-sizing patterns** → knowledge entry ("cards involving PDF generation consistently exceed the SLE; always break these into backend + rendering")
- **Process impediments** → knowledge entry, potentially a rule if confirmed 5+ times ("Done queue review must happen within 24 hours")
- **SLE calibration** → if the current SLE is consistently missed, that's data for adjusting it. Write an entry to `knowledge/prokanban/knowledge.md`.

Every flow observation that an agent makes should be written to the relevant domain file. Over time, the knowledge system accumulates a picture of where flow breaks down and what works. This is the mechanism by which the system learns to be better at flow, not just better at delivery.

## Further reading

- [The Kanban Pocket Guide](https://prokanban.org/kanban-pocket-guide/) (Vacanti, Singh, Johnson) - the primary reference for the age-based intervention model, right-sizing, and active management
- [The Kanban Guide](https://prokanban.org/the-kanban-guide/) (Coleman, Vacanti) - the foundational reference for Kanban practices, Definition of Workflow, and flow metrics
- [Actionable Agile Metrics for Predictability](https://actionableagile.com/resources/publications/aamfp/) (Vacanti) - deep dive on flow metrics, SLEs, and probabilistic forecasting
