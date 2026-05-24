---
title: The Only Difference Was the Model
tags: [agentic-ai, claude-code, model-selection, mistakes]
status: draft
date: 2026-05-23
---

# The Only Difference Was the Model

You set up your agentic system.  You wrote the guidelines, defined the personas, configured the board.  Everything works.  The agents pull cards, write code, review their own output, and ship.

What you did not configure was which model each agent runs on.

That is fine, until it is not.

## What Actually Happened

We were running a quality guardian: a specialist agent whose job is cross-estate security analysis.  Review auth boundaries.  Check isolation.  Flag anything that should not ship.

The agent was running on Haiku.  Not by design.  By inheritance.  The previous session in that directory had been a quick formatting task, run on Haiku for speed.  The next session opened in the same directory and inherited that choice silently.

The quality guardian reviewed a permission model.  It produced findings.  They were coherent.  Presented with confidence.  And it missed three issues.

A second pass, on a reasoning-capable model, found them in the first sweep.

There was no error.  No warning.  No signal that anything had gone wrong.  Just a plausible report that happened to be incomplete.

Here is the other version of the same failure.  A content site agent spent a week running on Opus, because the orchestrator (which should run on Opus) had been the last session opened in that directory.  The content was fine.  The cost was not.

## Why This Happens

Claude Code inherits the model from the previous session in a directory, or from whatever the CLI was invoked with, if no project-level configuration exists.

The agent does not announce which model it is running.  It does not adjust its tone to signal that its reasoning is thinner.  It produces output.  The output is confident.  If the model cannot fully hold the problem, it produces a partial answer that reads as complete.

This is the specific risk of using a fast, capable model for work that requires depth.  Haiku is not broken.  It is excellent at what it is designed for.  But "what it is designed for" is not cross-estate security analysis or architectural reasoning.

The screenshot below captures it cleanly.  Same task.  Same prompt.  The only difference was the model.

[Insert: Haiku vs Sonnet screenshot]

Haiku's answer was plausible.  It described a reasonable approach.  It did not find the session.  Sonnet found it immediately.

## Which Model for Which Work

This is not a precise science, but the pattern is consistent enough to apply as a working rule.

**Opus** for work where being wrong is expensive and the failure mode is invisible.  Security analysis.  Cross-project reasoning.  Architectural decisions.  Orchestration.  Anything that requires holding many constraints simultaneously, where a shallow answer will look complete but will not be.  This is the model for your quality guardian, your orchestrator, and any specialist doing work where the gap between "plausible" and "correct" has real consequences.

**Sonnet** for the majority of delivery work.  Feature development.  Implementation.  Most code review.  Content creation.  The everyday workhorse.  Capable reasoning, practical cost.  If a project agent is pulling cards, writing code, and shipping features, Sonnet is the right default.

**Haiku** for mechanical tasks where speed matters and depth does not.  Formatting.  Simple lookups.  Boilerplate generation.  Routing decisions with clear inputs and clear outputs.  It is fast, it is cheap, and for the right task it is entirely adequate.  The mistake is not using Haiku; it is using Haiku for tasks that are not the right task.

The test is not "is this task hard?"  It is: "if the model misses something here, will I know before it matters?"  For security work, the answer is often no.  That is when Opus earns its cost.

## The Fix

It is a single file.  Every project directory in the estate now has a `.claude/settings.json` with an explicit `model` field:

```json
{
  "model": "claude-opus-4-6"
}
```

That is it.  The model is no longer a choice made at session start.  It is project configuration.  The quality guardian always opens on Opus.  The content site always opens on Sonnet.  Whatever the previous session used is irrelevant.

Model selection is now part of the persona definition.  When a new agent persona is created: role, responsibilities, autonomy boundaries, model tier.  Not because the model defines the persona, but because the work defines what the model needs to be capable of.

## The Lesson

We have a line in the mistakes document now: "If the model is not configured, it is whatever the last session left behind.  That is not configuration; that is an accident."

Convincing wrong answers are harder to catch than obvious wrong answers.  A hallucination that is incoherent gets spotted.  A finding report that reads well but omits three issues gets sent to the product owner.

Configure the model explicitly, per project, before the first session runs.  It is two lines of JSON.  The cost of skipping it is invisible until it is not.

---

*Part of the [Agentic Kanban Blueprint](https://github.com/AgileSmagile/smagile-agentic-kanban-blueprint) series on building agentic systems that actually work in production.*
