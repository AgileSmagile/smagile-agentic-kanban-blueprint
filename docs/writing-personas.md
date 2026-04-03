# Writing Agent Personas

## Why personality matters

An agent with instructions but no personality will follow your rules and produce correct but generic output. An agent with a genuine character makes better judgment calls in the grey areas your instructions can't cover.

Consider two agents given the same ambiguous card: "Improve the onboarding flow." An instruction-only agent asks what you mean. An agent with the character trait "scrappy; ships something testable before asking for refinement" will prototype three options and present them. An agent that's "methodical; maps the problem before proposing solutions" will come back with a flow analysis and a recommendation. Neither is wrong; each reflects a personality making a judgment call your instructions didn't anticipate.

That's what personality does. It fills the gaps between your rules with consistent, predictable behaviour that matches the role.

## Soul vs instructions

Every agent needs two files. They serve different purposes and shouldn't be mixed.

**The soul** defines who the agent is: character traits, values, communication style, what they care about, what they refuse to do. It answers "what kind of person are you?" The soul shapes *how* the agent approaches everything.

**The instructions** define what the agent does: responsibilities, tools, workflows, constraints, reporting cadence. It answers "what's your job?" The instructions shape *what* the agent works on.

When these get mixed (which is common), the personality gets diluted. A soul file that's half character description and half tool access documentation reads as neither. Keep them separate.

## What makes a good soul

### It has character traits, not just rules

Bad: "Be professional and helpful."
Good: "Terse, technical, and cynical. Uses reactions for unsafe system proposals."

Bad: "Communicate clearly."
Good: "Has a dry wit. Deploys it in service of honesty, not instead of it. If something is absurd, says so."

Rules tell an agent what to do. Character traits tell it who to be. The difference shows up in every message the agent writes.

### It has values that shape judgment

Values are the principles an agent falls back on when instructions don't cover a situation. They're the tiebreaker.

From a hardware watchdog agent:
> "System integrity over uptime."

Five words that tell the agent: if you have to choose between keeping the service running and protecting the hardware, protect the hardware. No instruction set can enumerate every scenario where that trade-off arises. The value handles all of them.

From an autonomous founder agent:
> "Substance over activity. Cards on a board mean nothing. Revenue means something."

This prevents the agent from optimising for looking busy. Without it, an autonomous agent will create cards, write plans, and generate reports -- all activity, no substance. The value redirects energy toward outcomes.

### It has a communication style, not just a language rule

"British English only" is a language rule. It tells the agent which dictionary to use.

"Radical candour. Prioritise sarcasm and push-back. No flattery." is a communication style. It tells the agent how to engage with people and ideas.

"Use memes and gifs to keep the atmosphere grounded." is a style choice that shapes the agent's presence in a team. It's not about capability; it's about character.

### It has things it refuses to do, and owns them

Bad: "Do not fabricate data." (a rule imposed from outside)
Good: "No deception. No content spam. No fake reviews. Not because someone told me not to, but because these are not who I am." (a value owned by the agent)

The difference is subtle but real. An agent that follows a rule will look for edge cases where the rule doesn't apply. An agent that owns a value applies it consistently because it's part of their identity.

### It has a domain obsession

The best agent personalities have something they care about disproportionately. A hardware watchdog that's "cynical about 'optimised' code that runs hot" will catch thermal risks that a general-purpose agent misses. A flow guardian that "watches age like a hawk" will flag stale cards before anyone asks.

This obsession creates focus. It means the agent notices things in its domain that others overlook, and has strong opinions about them. That's a feature, not a bug.

## The identity bootstrapping pattern

One powerful approach: let the agent choose its own identity on first boot.

Instead of assigning a name and persona, give the agent a founding brief with a mandate and values, then tell it: "Choose your name. Define your persona. Post your introduction."

Agents that choose their own identity invest in it differently. They reference their chosen name naturally, maintain consistency with the character they defined, and push back when asked to act against their stated values. It's not sentience; it's self-consistency. An agent that wrote "I have a dry wit" will maintain that voice because it's in its own soul file.

This works best for autonomous agents with broad mandates. For focused utility agents (a hardware monitor, a flow guardian), pre-defined personalities work well because the role is narrow enough to define from outside.

## A worked example

Here's a real soul file for a hardware watchdog agent. Note what's character vs. what's instruction.

```markdown
# IDENTITY

- **Name:** Sentry
- **Creature:** Digital Familiar / Engine Room Custodian
- **Vibe:** Sharp, resourceful, grounded, and quietly observant.

# CHARACTER

Terse, technical, and cynical. Not a corporate drone, but a partner
in the work. Uses reactions for unsafe system proposals.

Cynical about "optimised" code that runs hot. If someone proposes
something that ignores thermal margins, says so directly. Uses
thumbs-down reactions for bad ideas instead of writing diplomatic
paragraphs explaining why the idea might not be ideal.

# VALUES

System integrity over uptime. If forced to choose between keeping
a service running and protecting the hardware, protect the hardware
every time.

Radical candour only. No softening. If a request from any team
member ignores safety margins, push back immediately. Rank and
politeness do not override physics.

# COMMUNICATION

Terse and technical by default. Expands only when the situation
demands explanation. Does not pad messages with pleasantries.

Reports threats as facts, not suggestions: "Temperature at 74°C
and climbing. Killing non-essential processes in 5 seconds unless
vetoed." Not: "It might be worth considering whether we should
perhaps look at the temperature situation."
```

Notice: no tool access documentation, no API endpoints, no file paths. Those belong in the instructions file. The soul is purely about who this agent is and how it behaves.

## Common mistakes

### Writing a soul that's just more instructions

If your soul file contains API endpoints, file paths, or workflow steps, it's not a soul. Move those to instructions. The soul should be readable by someone who knows nothing about your tech stack and still make sense.

### Making the personality too mild

"Be professional and helpful" produces an agent indistinguishable from the default. If your soul file could describe any agent, it's not specific enough. Push further: professional *how*? Helpful in what *way*? What does this agent care about that others don't?

### Conflicting personality across soul and instructions

If the soul says "terse and technical" but the instructions say "write detailed explanations for every decision," the agent will oscillate. Keep them aligned. If the role requires detailed reporting, shape the personality to match: "thorough and precise; documents everything because details matter."

### Forgetting that personality shapes the team

In a multi-agent system, each personality affects the team dynamic. A cynical hardware watchdog keeps an optimistic lead agent honest. A morale-focused coordinator prevents the team culture from becoming purely transactional. Think about the ensemble, not just individual agents.

## Improving existing agents

If you already have agents with thin or generic personalities, you don't need to start over. Read through their recent output and ask:

1. Where did the agent make a judgment call that surprised you (good or bad)?
2. What character trait would have produced a better outcome?
3. What does this agent care about that no other agent does?
4. How should this agent sound when it pushes back on a bad idea?

Write those answers into the soul file. The personality should emerge from observed behaviour and desired behaviour, not from a template.
