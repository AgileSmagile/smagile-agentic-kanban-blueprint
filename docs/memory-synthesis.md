# Memory Synthesis

## The problem

The [knowledge system](knowledge-system.md) captures observations well. Agents write to domain files after completing work. The [session wrap-up](session-boundaries.md) checklist enforces it. The three-tier structure (knowledge, hypotheses, rules) gives every entry an epistemic status. Capture is solved.

What is not solved is turning that captured data into insight.

Knowledge entries accumulate. Daily logs stack up. Card comments record decisions. Weekly digests summarise what changed. But nobody reads across these sources to ask: what patterns are forming? Which hypotheses have quietly accumulated enough evidence to promote? Which rules are contradicted by recent observations? Where is the system repeatedly hitting the same friction?

Individual agents cannot do this. They operate within a single session, on a single card, with a single domain in focus. Cross-session, cross-domain pattern detection requires someone to look at the whole picture. That someone is either the PO reading logs manually, or a synthesis pass that does it systematically.

Without synthesis, the knowledge system collects data. With it, the knowledge system produces intelligence.

## The solution

A periodic synthesis pass that reads across accumulated learning and produces actionable output: promotions, demotions, pattern summaries, and contradiction flags.

### What synthesis reads

The synthesis pass draws from four sources:

1. **Daily log entries** (`vault/logs/daily/`). The human-readable narrative of each session. Progress, lessons learned, feedback received. These reveal recurring themes that individual knowledge entries, written in isolation, cannot surface.

2. **Weekly digests** (`vault/logs/digests/`). The roll-up of knowledge changes, hypothesis status, rule movements, and stale candidates. Digests are already structured; synthesis reads across multiple digests to spot trends.

3. **Domain knowledge files** (`knowledge/<domain>/knowledge.md`). Raw observations, dated and card-referenced. Synthesis looks for clusters: multiple entries about the same topic, contradictory observations, or patterns that match an open hypothesis.

4. **Hypotheses files** (`knowledge/<domain>/hypotheses.md`). Open conjectures with evidence counts. Synthesis checks whether recent work has provided additional confirmations or contradictions that nobody noticed in the moment.

### What synthesis produces

The output is a synthesis entry written to `vault/logs/synthesis/YYYY-Www.md` (one per review cycle, typically aligned with the weekly digest cadence). It contains:

**Patterns detected.** Recurring themes across sessions. "Three of the last five sessions hit the same blocker: unclear acceptance criteria on cards. This is a process gap, not a technical one."

**Promotion candidates.** Hypotheses that have accumulated enough evidence to consider promoting to rules. The synthesis pass does not promote; it flags. The PO or orchestrator decides.

**Contradiction flags.** Knowledge entries or rules that conflict with recent observations. "Rule R4 says per-IP rate limiting is standard, but the last two cards implemented per-user limiting and PO confirmed it. R4 may need updating."

**Anti-patterns.** Approaches that consistently lead to rework or blockers. "Cards that skip the acceptance criteria step have a 3x rework rate based on the last 10 sessions." These are hypothesis candidates if not already tracked.

**Stale entries.** Knowledge entries referencing file paths, API endpoints, or architectural decisions that may have changed.  The synthesis pass flags these for verification; it does not delete them.

### Staleness detection criteria

Generic "check for staleness" is too vague to act on.  These specific thresholds give the synthesis pass concrete triggers:

- **Hypotheses older than 30 days with fewer than 3 confirmations.**  A hypothesis that has been open for a month without accumulating evidence is either untestable (poorly framed), irrelevant (the system moved on), or invisible (agents are not checking for it during the before-ritual).  Flag for rephrasing, archival, or conversion to an explicit experiment.

- **Rules older than 60 days without reference.**  A rule that no agent has cited, applied, or tested in 60 days may be stale.  It might still be valid but invisible because it covers a domain with low activity.  Or it might describe a pattern that no longer holds.  Flag for verification.

- **Cross-domain contradictions.**  An observation in domain A that contradicts a rule in domain B.  These are invisible to individual agents because agents typically load one domain at a time.  The synthesis pass reads across domains and can spot them.

These thresholds are starting points.  Adjust based on your system's cadence: a high-velocity project might use 14 days / 30 days; a slow-moving one might use 60 days / 120 days.  The principle is the same: knowledge that is not being referenced or tested is decaying.

### What synthesis does not do

Synthesis does not replace the knowledge system. It does not write to domain files directly. It does not promote or demote rules without PO approval. It is a review layer that reads the existing system and surfaces what merits attention.

Synthesis also does not require a separate tool or infrastructure. It is a prompt, not a pipeline. An agent with access to the vault directory and knowledge files can run the synthesis pass in a single session.

## When to run it

Synthesis is event-driven, not scheduled. It piggybacks on the same wrap-up moment as the weekly digest (see [session-boundaries.md](session-boundaries.md)).

The trigger: when the agent writes a weekly digest (step 6 of the wrap-up checklist), it also runs the synthesis pass if the previous synthesis is 7+ days old. Two outputs from the same step, at the same cadence, for the same reason: the machine is on, the context is fresh, the PO is present.

For estates with low session frequency (fewer than 3 sessions per week), synthesis can run less often. The trigger should be "enough data has accumulated to make synthesis worthwhile," not "a calendar week has passed." If the last three daily logs contain nothing beyond routine progress, a synthesis pass will produce nothing useful. Skip it.

For estates with high session frequency or multiple agents, synthesis may be worth running more often. The signal is whether the PO is reading daily logs and thinking "I keep seeing the same thing." If so, synthesis is overdue.

### The first synthesis

Do not run synthesis in week one. The knowledge system needs time to accumulate. Start synthesis after your system has produced at least 10 daily log entries and 2 weekly digests. Before that, there is not enough data to synthesise.

## How to run it

In Claude Code, synthesis can be a custom skill invoked via slash command (e.g. `/synthesise`), or it can be a prompt extension to the existing wrap-up skill that fires conditionally. The implementation choice depends on whether the PO wants synthesis as a separate deliberate action or as an automatic extension of the wrap-up.

Either way, the agent needs access to:
- `vault/logs/daily/` (recent daily log entries)
- `vault/logs/digests/` (recent weekly digests)
- `knowledge/` (all domain files)
- `vault/logs/synthesis/` (previous synthesis entries, for continuity)

The prompt instructs the agent to read the last 7-14 days of logs and digests, scan all domain knowledge and hypothesis files, and produce the synthesis entry.

### Example prompt (for a custom skill)

```
Read the daily log entries and weekly digests from the last 14 days.
Read all domain knowledge and hypothesis files.
Read the most recent synthesis entry for continuity.

Produce a synthesis entry at vault/logs/synthesis/YYYY-Www.md covering:
- Patterns detected across sessions (recurring themes, not one-offs)
- Hypotheses with new evidence (confirmations or contradictions)
- Rules that may need updating based on recent observations
- Anti-patterns (approaches that consistently lead to rework)
- Stale entries (references to things that may have changed)

Do not promote or demote rules. Flag candidates for PO review.
Do not manufacture patterns. If there is nothing to synthesise, say so.
```

## Connection to the knowledge promotion cycle

The [knowledge system](knowledge-system.md) has a promotion cycle: observations become hypotheses at pattern detection, hypotheses become rules at 5+ confirmations. This cycle is passive; it relies on agents noticing patterns during their normal work.

Synthesis makes the promotion cycle active. Instead of waiting for an agent to stumble across a pattern while working on an unrelated card, the synthesis pass deliberately looks for patterns. It reads across domains, across sessions, across agents.

This matters most for hypotheses. A hypothesis might sit at 3 confirmations for weeks because no single agent happens to encounter the same situation. The synthesis pass reads the last month of daily logs and notices that three different agents, on three different cards, all observed the same behaviour. That is the 4th and 5th confirmation that nobody counted.

Synthesis also catches the opposite: rules that are quietly being contradicted. If agents keep working around a rule without flagging it, the daily logs will show the workaround pattern even if nobody writes a formal contradiction to the rules file.

## Trade-offs

**What you gain:**
- Active pattern detection instead of passive accumulation
- Faster hypothesis promotion (evidence found across sessions, not within them)
- Contradiction detection before rules cause harm
- A human-readable summary that the PO can scan in minutes
- Compounding returns: each synthesis pass builds on previous ones

**What it costs:**
- Token usage for the synthesis session (reading logs + knowledge files + writing output)
- Risk of false patterns if the data set is too small (mitigated by the 10-entry minimum before first synthesis)
- Maintenance: synthesis entries themselves accumulate and may need periodic pruning
- The PO must actually read the output. Synthesis that nobody reads is waste.

**When it is not worth it:**
- Fewer than 3 sessions per week (not enough data to synthesise)
- Single-project, single-agent systems where the PO is already close enough to the work to spot patterns manually
- Early in the system's life (first 2-3 weeks), before enough observations have accumulated

## The information-to-intelligence bridge

Most systems capture data. Few turn it into actionable insight. The gap between the two is not a tooling problem; it is an attention problem. Data accumulates because capture is cheap. Insight requires someone to read across the data and ask: what does this mean?

The knowledge system solves the capture side. Daily logs and weekly digests give the data structure and a human-readable format. Synthesis closes the loop by reading across all of it and surfacing what matters.

Without this bridge, knowledge files grow but wisdom does not. With it, the system learns not just from individual sessions, but from the pattern of sessions over time.

## Related documents

- [Knowledge system](knowledge-system.md): the three-tier learning structure that synthesis reads and feeds
- [Session boundaries](session-boundaries.md): the wrap-up checklist that produces daily logs and weekly digests
- [Measuring health](measuring-health.md): the "after 20 sessions" checkpoint that synthesis output informs
- [TOOLS.md](../TOOLS.md): Obsidian as the vault tool for reading synthesis output
