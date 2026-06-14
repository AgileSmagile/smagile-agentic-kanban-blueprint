# The Knowledge System

## The Problem

AI agents don't remember between sessions. Each conversation starts fresh. Without a persistence mechanism, every session repeats the same mistakes, re-discovers the same patterns, and ignores hard-won lessons.

Memory files (flat facts) are the obvious solution, but they degrade. The same correction appears three times. Stale facts persist alongside current ones. There's no way to distinguish "we think this might be true" from "we've confirmed this 10 times." Everything has equal weight, which means nothing has reliable weight.

## The Design

Three tiers, each with a different epistemic status:

### Knowledge (observations)

Raw observations from real work. No status claim. Just "we saw this happen."

```markdown
## 2026-04-01 | card-742
Variant generation consistently takes 8-12 mins even with a complete base model.
Primary bottleneck is the AI synthesis step, not data retrieval.
```

Knowledge entries are cheap to create and never expire. They're the raw material that hypotheses and rules are built from.

### Hypotheses (things we think might be true)

Testable conjectures with explicit evidence tracking. Each needs 5+ independent confirmations before promotion to a rule.

```markdown
### H2: No authoritative trigger is needed for autonomous pull
Conjecture: WIP age + initiative priority + WIP targets give agents enough signal to pull correctly.
Status: partially supported
Confirmations: ~2-3
Test: Track next 5 sessions — did agent pull correctly without prompting?
```

Hypotheses are the learning edge. They're where the system develops new understanding. The explicit evidence count prevents premature generalisation.

### Rules (things we're confident enough to act on by default)

Confirmed patterns that agents apply without justification. These are the system's institutional knowledge.

```markdown
- **Limit WIP.** WIP limits are targets, not just ceilings. Being under WIP is as problematic as being over.
  - source: seeded
```

Rules have three source types:
- **Seeded**: axiomatic. Expert knowledge, legal constraints, foundational principles. No confirmation count needed.
- **Derived**: built from repeated observation. Earned empirically.
- **Promoted**: started as a hypothesis, earned rule status through 5+ independent confirmations.

## The Promotion Cycle

```
Observation → Knowledge entry → Hypothesis (if pattern detected)
                                     ↓
                              5+ confirmations
                                     ↓
                                   Rule
                                     ↓
                          (contradiction detected)
                                     ↓
                              Demote back to hypothesis
                              (requires PO approval)
```

This is deliberate. Rules earn their status. They can also lose it. The system self-corrects.

## How Learning Gets Captured

Agents capture learning where the work happens: in card comments and project documentation.

### During work: card comments

When an insight emerges mid-task, agents tag the orchestrator or relevant party in a card comment (see the dispatch policy for the full flow). The conversation happens on the card. When the discussion resolves, the learned knowledge is written directly to the appropriate file.

### After completing work: direct writes

When a card completes, the agent writes any observations directly to the domain's knowledge/hypothesis/rules files:

1. **New observation?** → Add to `knowledge/domain-name/knowledge.md`
2. **Pattern detected?** → Add to `knowledge/domain-name/hypotheses.md` with a testable conjecture
3. **Hypothesis confirmed (5+ evidence)?** → Promote in `knowledge/domain-name/hypotheses.md` and move entry to `rules.md`
4. **Rule contradicted?** → Flag to the PO before demoting (requires human review)

Example: an agent notices that variant generation takes 8-12 minutes even with a complete base model. It writes directly to `knowledge/your-product/knowledge.md`:

```markdown
## Variant generation performance | card-742 | 2026-04-01
Primary bottleneck is AI synthesis step (8-12 min), not data retrieval.
Observed across 3 runs with different input sizes.
```

### The orchestrator's role

The orchestrator reads the knowledge files at session start to understand what the system has learned. It flags contradictions, helps promote hypotheses that have earned enough evidence, and ensures demotions are human-reviewed. It does not write to the files; agents do, as part of their work.

This model eliminates the inbox altogether: learning is captured where work happens (card comments and knowledge files), not in a separate collection point.

## Domains

Knowledge is organised by domain, not chronologically. Each domain gets its own directory with the three files:

```
knowledge/
├── prokanban/
│   ├── rules.md
│   ├── hypotheses.md
│   └── knowledge.md
├── your-product/
│   ├── rules.md
│   ├── hypotheses.md
│   └── knowledge.md
└── infrastructure/
    ├── rules.md
    ├── hypotheses.md
    └── knowledge.md
```

The `INDEX.md` file maps domains to their scope and tells agents when to consult each one.

## The Before/After Ritual

### Before starting a card

1. Read `knowledge/INDEX.md` to identify which domains apply
2. Read `rules.md` for each relevant domain and apply by default
3. Scan `hypotheses.md` to note if today's work can test or refute any hypothesis

This takes an agent 30 seconds and prevents it from repeating known mistakes or ignoring confirmed patterns.

### After completing a card

1. Write any observations directly to `knowledge/domain-name/knowledge.md`
2. If a pattern was detected, add to `knowledge/domain-name/hypotheses.md`
3. If a hypothesis was confirmed (5+ evidence), promote it to `rules.md`
4. If a rule was contradicted, flag it to the PO for review (do not demote without approval)

This takes 60 seconds and makes the next agent on a similar task measurably better. Learning is written where agents read it: in the domain files themselves, not in a separate inbox.

## Why This Works for AI Agents

1. **Explicit epistemic status.** Agents don't guess whether something is a fact or a guess. The tier tells them.
2. **Promotion threshold.** 5 confirmations prevents a single lucky observation from becoming policy.
3. **Demotion with human review.** Rules don't disappear silently. The PO approves downgrades.
4. **Domain separation.** Agents only load knowledge relevant to their current card, not the entire system's memory.
5. **Direct writes, semantic domains.** Learning is captured where agents read it, organised by topic and easy to query.
6. **Card comments for in-progress discussion.** Observations and insights surface on the card first, then get written to domain files when the work completes.

## Lifecycle Enforcement

The promotion cycle looks clean on paper. In practice, without mechanical enforcement, hypotheses accumulate indefinitely at zero evidence and the digest becomes a growing guilt list that nobody acts on. We ran this system for 8 weeks before adding the following guards. Without them, capture worked but lifecycle did not.

### Hypothesis WIP limit (max 5 per domain)

Same principle as board WIP limits. You cannot create a new hypothesis without promoting or archiving an existing one. This forces completion over accumulation. Add the limit as a header in each `hypotheses.md` file with the current count.

### Two-strike auto-archive

If a hypothesis appears in the stale candidates section of two consecutive weekly digests with no new evidence, the third digest archives it mechanically. Not a recommendation — a rule. Change its status to `archived` and move it under an `## Archived` heading. The only way to prevent archival is to add evidence or convert the hypothesis into a concrete, time-bound experiment.

### Explicit evidence check at session wrap

The after-ritual asks vaguely "did you learn anything?" This is too easy to skip. Instead, pull the actual hypothesis list for the domain and ask specifically: "Did this session produce evidence for or against any of these?" The hypothesis text is right there — no memory required, no aspirational "track over next 5 sessions." This is the single most impactful change: it turns hypotheses from write-once artifacts into living questions that get revisited every session.

## Shared Infrastructure Knowledge

The knowledge system described above handles *product knowledge*: observations, hypotheses, and rules about the work itself.  There is a second class of knowledge that does not fit neatly into any single domain: infrastructure knowledge.

Infrastructure knowledge is cross-cutting.  Which secrets store to use.  Which deploy path works.  Which accounts belong to which service.  Which board columns map to which IDs.  This information is critical for agents but irrelevant to the three-tier promotion cycle.  It does not start as an observation and get promoted to a rule.  It is either correct or it is not.

Without a home for infrastructure knowledge, three failure modes emerge:

1. **Rediscovery waste.**  Agents spend time finding things that have already been found by other agents in prior sessions.
2. **Incorrect assumptions.**  An agent uses the wrong secrets store because nothing in its mandatory reading told it two stores existed.
3. **Orchestrator as lookup table.**  Infrastructure questions route through the orchestrator or the PO, neither of whom should be serving as an information desk.

### The estate knowledge model

Infrastructure knowledge lives in a three-tier hierarchy, separate from the domain knowledge system:

```
ESTATE.md                          # Global: applies to every agent
estate/
├── domain-a.md                    # Domain-specific: accounts, deploy targets, CI
├── domain-b.md                    #   board column IDs, third-party integrations
└── domain-c.md
Project CLAUDE.md files             # Leaf: inherits from global + relevant domain
```

- **ESTATE.md** (global parent): infrastructure, tooling, and practices that apply regardless of project.  The equivalent of a Maven parent POM.
- **Domain files** (`estate/<domain>.md`): account-specific state for a particular product or service area.  Secrets vault paths, deploy targets, CI status, board column IDs.
- **Project CLAUDE.md**: each project's instructions include an inheritance block pointing to the global parent and the relevant domain file.  An agent reads three files and has full infrastructure context.

### The write protocol

Agents discover infrastructure facts during normal work.  They should not edit the curated body directly.  Instead:

1. **Agent appends to a `## Pending` section** in the relevant domain's estate file.
2. **Agent posts a routing comment** on the card to notify the orchestrator (using the system's standard comment-routing convention).
3. **Orchestrator reviews Pending on session start**: verifies accuracy, promotes to curated sections, or rejects.

This is a pull-based knowledge flow.  Agents push raw observations; the orchestrator pulls them into the curated body on their own cadence.  The pattern mirrors the board itself: work enters a backlog (Pending), gets refined (curation), and is promoted (into curated sections).

### Why separate from domain knowledge?

Domain knowledge uses the observation → hypothesis → rule promotion cycle because product knowledge is *epistemic*: it starts uncertain and earns confidence through evidence.  Infrastructure knowledge is *factual*: the secrets store path either works or it does not.  Mixing the two dilutes the promotion cycle with entries that do not need 5 confirmations; they need one correct answer, verified once.

The orchestrator's curation role is the key distinction.  In the domain knowledge system, agents write directly and the orchestrator reviews for contradictions.  In the estate knowledge system, agents write to Pending and the orchestrator curates inbound entries before they join the canonical body.  This prevents drift, contradiction, and the wiki rot problem where anyone can edit and nobody owns accuracy.

## Common Failure Modes

- **Agents skip the before-ritual.** Fix: make it explicit in the startup instructions, not optional.
- **Rules go stale.** Consider adding `last_updated` timestamps so agents can detect staleness without a full review cycle.
- **Too many domains.** Start with 2-3. Add when you genuinely have enough observations to seed rules.
- **Hypotheses never get tested.** The before-ritual alone is insufficient. The explicit evidence check at wrap (see above) and two-strike auto-archive are the actual mechanisms. Without them, hypotheses sit at zero evidence indefinitely.
- **Knowledge entries are too vague.** "Things went wrong" is not knowledge. "Deploy failed because cloudflared resolves localhost to IPv6 and the container only bound IPv4" is knowledge.
- **Nobody reads across entries.** Knowledge accumulates but patterns go unnoticed because each agent only sees its own session. The [memory synthesis](memory-synthesis.md) pass addresses this: a periodic review that reads across daily logs, digests, and domain files to surface patterns, flag contradictions, and identify promotion candidates that individual sessions miss.
- **The digest becomes a report, not a trigger.** Flagging stale items is passive. The two-strike auto-archive makes the digest an active pruning mechanism. Without it, the stale candidates section grows every week and nothing happens.
