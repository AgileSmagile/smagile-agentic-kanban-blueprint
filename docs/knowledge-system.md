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

The orchestrator reads the knowledge files at session start to understand what the system has learned. It flags contradictions, helps promote hypotheses that have earned enough evidence, and ensures demotions are human-reviewed. It does not write to the files — agents do, as part of their work.

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

1. Read `knowledge/INDEX.md` — identify which domains apply
2. Read `rules.md` for each relevant domain — apply by default
3. Scan `hypotheses.md` — note if today's work can test or refute any hypothesis

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
5. **Inbox pattern.** No concurrent write conflicts. The orchestrator is the single merge agent.
6. **Chronological inbox, semantic domains.** Easy to process (sorted by time), easy to query (organised by topic).

## Common Failure Modes

- **Agents skip the before-ritual.** Fix: make it explicit in the startup instructions, not optional.
- **Rules go stale.** Hypothesis H5 in the prokanban domain addresses this. Consider adding `last_updated` timestamps.
- **Too many domains.** Start with 2-3. Add when you genuinely have enough observations to seed rules.
- **Hypotheses never get tested.** The before-ritual is the mechanism. If agents aren't scanning hypotheses before work, they're not testing them.
- **Knowledge entries are too vague.** "Things went wrong" is not knowledge. "Deploy failed because cloudflared resolves localhost to IPv6 and the container only bound IPv4" is knowledge.
