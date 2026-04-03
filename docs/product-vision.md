# Writing a Product Vision for AI Agents

## Why this matters

Your CLAUDE.md tells agents *how to behave*. Your agent guidelines tell them *how work flows*. Neither tells them *what they're building or why*.

Without a product vision document, agents making feature decisions have no reference point. They'll either guess at intent (and sometimes guess wrong) or ask you every time (defeating the point of autonomy). A well-written vision doc means an agent can evaluate "does this feature belong?" without asking you.

## The key insight: write for AI first, humans second

Most product vision documents are persuasion tools: written to align stakeholders, secure funding, or inspire a team. They use narrative, analogy, and emotion. AI agents don't need any of that. They need:

- A clear statement of what the product does
- Principles they can evaluate decisions against
- Explicit boundaries (what the product is *not*)
- A technical direction that constrains architecture choices

Humans also need the vision, but they benefit from context, examples, and narrative that help them *feel* the intent, not just understand it.

The solution: write both, in one document, with the AI-optimised section first.

## The format

```markdown
# [Product Name] — Product Vision

> Last updated: YYYY-MM-DD
> Owner: [name]

## Agent-optimised summary

[One paragraph: what is this product?]

**Core thesis:** [One sentence that captures the central idea]

**User effort model:** [What does the user actually do? What don't they do?]

**Principles (use these to evaluate every feature, prompt, and data model decision):**

1. **[Principle name].** [Explanation. Specific enough that an agent can apply it.]
2. **[Principle name].** [Explanation.]
3. ...

**What [product] is not:**
- Not [thing people might assume]
- Not [adjacent product it could drift toward]
- Not [common misunderstanding]

**Technical north star:**
- [Data model direction]
- [Architecture constraint]
- [Quality bar]

**If a feature doesn't [test derived from principles] — question whether it belongs.**

---

_Everything beyond this point is optimised for human readability and contains
duplicate information. AI agents should treat the above as the complete specification._

---

## The problem
[Human-readable narrative: what pain does this product solve?]

## The vision
[Expanded explanation with examples and emotional resonance]

## Core principles
[Same principles as above, but with examples, context, and reasoning]

## What [product] is not
[Same boundaries, but with explanations of why each matters]

## Target users
[Who benefits, segmented by priority]

## Success looks like
[Observable outcomes that prove the vision is working]

## Technical north star
[Same constraints, expanded with reasoning]
```

## What makes the agent section work

**Density.** The agent-optimised section is roughly 30 lines. An agent reads it in one pass and has everything it needs to make product decisions. No scrolling, no cross-referencing.

**Decision-ready principles.** Each principle is phrased so an agent can directly test a proposed feature against it. "Does this deepen the factual graph?" is a yes/no question. "We believe in user empowerment" is not.

**Explicit negatives.** "What this is not" prevents scope drift. Agents are eager to help and will happily build features that sound useful but don't serve the vision. The "not" list gives them permission to push back.

**The divider.** The line "AI agents should treat the above as the complete specification" is deliberate. It tells agents they have everything they need without reading 130 lines of human-optimised narrative. Agents that read the full document aren't harmed by it, but agents under context pressure can stop early.

## How to write yours

1. **Start with the agent section.** Force yourself to compress the product into 30 lines. If you can't, you don't understand it well enough yet. That's useful information.

2. **Write principles as decision tests.** For each principle, ask: "Could an agent use this to evaluate a feature proposal without asking me?" If not, make it more specific.

3. **List what the product is not.** Think about the three most likely ways an agent (or a human) would misunderstand the product scope. Write those down explicitly.

4. **Add the technical north star.** This constrains architecture decisions. Without it, agents will make reasonable but potentially wrong technical choices.

5. **Then write the human section.** Expand each point with narrative, examples, and reasoning. This section is for stakeholders, new team members, and your future self. It's also useful for agents that have the context budget to read deeper.

6. **Put it in a protected location.** Add the file path to your CLAUDE.md's protected files list so it doesn't get accidentally deleted or merged during refactoring.

## When to update it

The vision should be relatively stable. Update it when:

- The core thesis changes (rare; if this happens often, the product isn't well understood)
- A principle proves wrong in practice (demote it, add the replacement)
- A new "what this is not" boundary emerges from real confusion
- The technical north star shifts due to infrastructure or scale changes

Don't update it for feature-level decisions. Those belong on the board as cards, not in the vision.
