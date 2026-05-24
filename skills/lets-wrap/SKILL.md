---
name: lets-wrap
description: End-of-session wrap-up checklist. Prompts the agent to follow through on knowledge capture, board hygiene, and memory updates before signing off. Use when ending a working session.
disable-model-invocation: true
---

# Session Wrap-up

You are wrapping up a working session. Work through each item below. **Only act where there is genuine signal.** "Nothing to update" is a valid answer for any item. Do not create low-value noise.

## 1. Git hygiene

For each active project repository, run the following checks and **surface anything smelly**. Do not skip silently; a clean result per check is fine, but show you looked.

**Uncommitted changes**
```bash
git status --short
```
If dirty: commit meaningful changes with clear messages. If intentional WIP, note it explicitly.

**Unmerged branches** (branches that exist but have not merged to main)
```bash
git branch --no-merged main
```
For each unmerged branch:
- How old is it? (`git log <branch> --oneline -1 --format="%ar"`)
- Is there an open PR? (`gh pr list --head <branch> --state open`)
- Is the corresponding card still active on the board?

Flag any branch older than 24 hours with no open PR as potentially orphaned. Branches older than 3 days with no PR are almost certainly orphaned; recommend merge or delete.

**Open PRs**
```bash
gh pr list --state open
```
For each open PR: how old? Is it blocked, or just neglected? Flag anything open more than 24 hours with no activity.

**Board/branch link gaps**
For cards you touched this session that are in progress: do they have branch and PR links set? If not and code exists, add them using your board tool.

**Orchestrator sessions only**: check ALL active project repositories, not just the current one.

## 2. Board hygiene

Review any cards you touched this session. Do columns reflect reality? Are comments needed for context that would otherwise be lost? Update the board only where the current state is misleading or incomplete. Cards moving to the review/validation column need review guidance comments.

## 2a. Agent inbox check

Check whether any inbox cards are waiting for you:

```bash
board-tool inbox <YOUR_INBOX_PREFIX>
```

If inbox cards are present: process them before wrapping. Do the work, respond on the original card, close the inbox card.

If inbox is empty: say so and move on.

## 2b. CI items for the Orchestrator

During this session, did you observe anything that warrants a system-level improvement; not specific to a card you were working on, but about the operating model, tooling, cross-project patterns, or estate hygiene?

If yes: create a new board card with `[Orchestrator]` at the start of the title. Brief description. Move to Ready. The Orchestrator picks it up as normal board work.

Examples of what belongs here:
- A pattern you observed across multiple projects that the Orchestrator should be aware of
- An improvement to the operating model or a shared tool
- A discrepancy in the estate overview or architecture decisions
- A concern about a decision that affects work beyond your own project

This is not for card-specific requests (use an agent-to-orchestrator comment on the card for those). This is for system-level backlog.

If nothing to raise: say so and move on.

## 2c. Project agent to Orchestrator session handoff (project agents only; skip if you are the Orchestrator)

Send a session handoff to the Orchestrator. Do this every session where anything significant occurred; do not wait to be asked, and do not rely on board cards alone. The Orchestrator cannot see inside your session; this is the handoff.

**How:** Post a comment on the most significant card you worked on this session, using the agent-to-orchestrator prefix. The board watcher picks this up and routes an inbox card to the Orchestrator automatically.

The summary should cover (briefly):
- **Key decisions made**: architecture calls, scope changes, tech choices
- **Key actions taken**: PRs raised, migrations run, cards moved, things deployed
- **Risks or blockers surfaced**: anything the Orchestrator needs to know to coordinate across the estate
- **Cards that need Orchestrator attention**: review, unblock, or follow-up

Keep it to 5-10 lines. The Orchestrator reads it on the next inbox poll and acts without needing to ask you what happened.

If nothing significant happened this session (routine card progress, no decisions, no risks): say so and skip.

## 3. Knowledge system

This is the most commonly skipped step. Reflect honestly:

- Did you learn anything about a domain that future agents would benefit from? (knowledge)
- Did you form or test any hypotheses about how something works? (hypotheses)
- Did any hypothesis earn enough confirmation to become a rule? (promote)
- Did any existing rule turn out to be wrong? (demote/deprecate; flag to the product owner)

If yes to any: write directly to the relevant knowledge file for that domain. Append a dated entry. If no: say "No knowledge system updates" and move on. Do not pad.

### What constitutes useful orchestrator knowledge

**Capture these** (they have system-wide value and are not derivable from code or git history):

- **Cross-project patterns**: behaviours, failure modes, or working practices observed across two or more domains
- **Infrastructure and tooling discoveries**: board tool limitations, API rate limit behaviour, shell quirks, CLI edge cases, workflow automation behaviour
- **Operating model changes**: WIP adjustments, new column usage patterns, coordination mechanisms proven or failed
- **Agent coordination outcomes**: when an inbox round-trip worked or failed and why; latency observed vs expected
- **PO working patterns**: how the product owner makes decisions, what context they need, what causes unnecessary back-and-forth
- **Decisions that set multi-project direction**: calls that affect how multiple agents or projects should proceed

**Do not capture these** (they are noise at the orchestrator level):

- Project-specific implementation details (those belong in the project's own knowledge domain)
- One-off workarounds with no pattern value beyond this specific case
- Things already expressed in code, git history, or card descriptions
- Ephemeral state (what is currently in flight, which card is being worked)
- Anything you would have to fabricate from thin evidence

## 4. Memory

Memory IS the handoff. There is no separate handoff step.

Review what happened this session against each category below. Go through them explicitly; do not scan once and stop at the obvious ones.

**Reference data discovered**: things you had to find out rather than knew from memory, and will need again:
- Config values, column IDs, API endpoints, board structures, tool behaviour, port numbers
- Any lookup you performed that future agents would have to repeat if not recorded
- Prompt: "What did I discover this session that I would have benefited from knowing at the start?"

**Feedback patterns**: things that went wrong or right that reflect how work should be approached:
- A correction the product owner made to your approach, framing, or output
- A non-obvious approach that worked and should be repeated
- Prompt: "What would I tell the next agent starting a session like this one?"

**Decisions and project state**: calls made that future sessions need to know:
- Architecture decisions, scope changes, tech choices, deferred items
- Prompt: "What changed about the project this session that is not derivable from git history?"

**User preferences and working patterns**: how the product owner likes to work, what they find useful or annoying:
- Only capture if something new was revealed; do not pad with known preferences

If yes to any category: update or create the relevant memory file(s). If nothing worth persisting: say so explicitly per category.

## 5. Environment parity check (if applicable)

If this project has pre-production and production deployments with different automation rules, check for divergence between environments.

For projects where pre-production auto-deploys on every push to main but production requires manual dispatch:

```bash
# Commits in main not yet in prod (adapt to your deployment tag/branch convention)
git log --oneline $(git tag -l "prod-*" | sort -V | tail -1)..main
```

If any commits exist:
- List them
- Check the board for cards in any vetting or pre-production column
- Flag: "X commits ready for prod. X cards waiting approval. Ready to dispatch, or hold for maintenance window?"

If no pre-production/production split exists for this project: say "No environment parity check needed" and move on.

## 6. Weekly knowledge digest (if due)

Check whether a digest is due: look for the most recent knowledge digest file. If none exists, or the most recent is 7+ days old, compile one.

**To compile:**

1. Scan knowledge files across all active domains for entries added since the last digest date
2. Scan recent memory file changes (new or modified files in memory directories)
3. Write a digest file with sections:
   - **Knowledge added**: what was learned, which domains, by which agents
   - **Hypotheses pending**: any unresolved hypotheses across domains
   - **Rules promoted/demoted**: changes to the rule base
   - **Memory changes**: what was added or updated in agent memory
   - **Stale candidates**: anything that looks outdated or contradictory, flagged for the product owner to prune

If not due: say "Digest not due (last: YYYY-MM-DD)" and move on.

## 7. PO feedback

The product owner is part of the system. Give them honest feedback on how they contributed to system performance this session.

**Empty is always better than fabricated.** These prompts exist to provoke genuine reflection, not to generate content for every heading. If a prompt has no honest signal, skip it; do not fill it with low-value observations dressed up as insight.

Use these prompts to reflect. Only write up the ones where you have genuine signal:

- **Input quality.** Evaluate the PO's prompts, card descriptions, and in-session instructions as raw inputs to the system.
  - Was a message too long, burying the actual ask?
  - Did a prompt contain multiple embedded asks without clear priority?
  - Was a card's acceptance criteria vague where precision was needed?
  - Did you have to guess at intent at any point? If so, what was missing?
  - Did the PO provide context that turned out to be irrelevant, or omit context that would have changed your approach?

- **Process gaps the PO owns.** Did housekeeping get deferred? Did knowledge go stale because nobody reviewed it? Did a transition happen without a migration plan? The PO owns the system design; if the design has a gap, that is PO feedback.
- **Bottlenecks caused by the PO.** Were cards blocked waiting for a decision only the PO can make? Did work sit in review longer than it should have? Was the PO the constraint?
- **Pattern hypocrisy.** Is the PO tolerating in their own system what they would diagnose as dysfunction in a client's?
- **Fragmentation and prioritisation.** Did the PO context-switch away from important work to chase something lower-value? Did that cost the system?

**Tone:** Direct. No softening, no apology. State what happened, state the consequence, state what would be better. The PO has explicitly asked for this and will not receive it as criticism. It is continuous improvement data applied to the whole system, not just the agents.

If there is genuinely nothing to say: say so per category.

## 8. Session summary (output to chat)

Write a concise summary with three sections:

**Done this session**
- What shipped, moved, or meaningfully progressed (bullet points, card numbers where relevant)

**What could have gone better**
- Honest self-critique. Where did you waste time? What would you do differently? Did you get stuck on something avoidable? This is not performative humility; it is continuous improvement data.

## 9. Open actions review (Orchestrator only)

Maintain an `open-actions.md` file as a short-lived handoff memo for cross-estate actions that need orchestrator follow-up next session.

**Review existing entries:**
- Action confirmed complete? Remove it.
- Still pending? Leave it. Update context if anything changed.

**Add new entries from this session:**
- Unresolved inbox items or escalations that carry over
- Cross-project actions surfaced by project agents that are not yet captured as board cards
- Anything you committed to doing that did not get done

Each entry should be one line with enough context to act on without reading anything else. Include the card number if one exists.

If nothing to add or remove: say "No open actions changes" and move on.

## 10. Loose ends audit

Steps 1-9 are category-scoped. Real sessions produce cross-cutting loose ends that do not fit neatly into any single category. This step catches them.

Before writing the daily log, do one final sweep:

- **Uncommitted changes**: are there dirty repos you touched this session that were not caught in step 1?
- **Untracked artifacts**: did you create, modify, or delete files that are not reflected anywhere (board, memory, knowledge, git)?
- **Promised actions**: did you tell the product owner you would do something during the session that is not reflected in a card, a "what's next" item, or a memory update?
- **Risks or decisions**: is there something the product owner needs to know that did not fit into steps 1-9?
- **Cross-repo consistency**: if you changed a pattern or convention, did you update it everywhere it appears?

**"What else?" self-challenge:**

**When this session closes, anything not captured is permanently lost. There is no recovery. The product owner cannot ask you again; you will not exist. Whatever is in your context right now that is not in a file, a card, open-actions, or memory will be gone.**

With that in mind: simulate the product owner asking "what else?" right now. What would you say? If the answer is "nothing", you are done. If the answer is anything, act on it now.

This step exists because the two-stage pattern (wrap then "what else?") is a system failure. If the answer to "what else?" is ever non-empty, something above was incomplete. Find it. Fix it.

**CI items discovered in step 2b must also be messaged to the Orchestrator directly**: do not rely on a card sitting in Ready. Post a routing comment on the relevant card so the board watcher routes it to the Orchestrator's inbox this session.

If yes to any: act on it now, before the daily log. If genuinely nothing: say "No loose ends" and move on.

## 11. Daily log

After completing steps 1-10, write a session block into today's daily log file. This is the primary human-readable record of the session; what the product owner reads to spot patterns over time. Keep it honest and brief. Do not duplicate information already captured in memory or knowledge files.

If the file does not exist, create it with a date header. If it already has entries for today, append your session block; do not overwrite.

**Session block format:**

```markdown
## [Agent name] — [short session label]

**Tags:** #[domain] #[work-type] #[theme]

### Achievements
[3-6 bullets. What shipped, moved, or was decided. Card numbers where relevant.]

### Lessons
[Only if something non-obvious was learned. 2-3 bullets max. Skip if nothing new.]

### Patterns to watch
[Only if a recurring pattern emerged; name it explicitly so it is searchable across logs. Skip if nothing.]

### What's next
[Concrete next actions. Checkboxes. Flag hard deadlines.]
```

**What to write vs skip:**
- Write: wins, decisions that closed open questions, things that changed how the system works, recurring patterns (positive or negative)
- Skip: implementation detail in git, information already fully captured in memory/knowledge files, padding

## 12. Confirmation

Finally, list all steps and confirm each was either acted on or explicitly skipped with a reason. This is the accountability step.

| Step | Status | Note |
|------|--------|------|
| Git hygiene | Done / Nothing to action | ... |
| Board hygiene | Done / No updates needed | ... |
| Agent inbox check | Done / Empty | ... |
| CI items for Orchestrator | Card raised / Nothing to raise | ... |
| Orchestrator session handoff | Sent / Skipped (Orchestrator) / Nothing significant | ... |
| Knowledge system | Done / No updates | ... |
| Memory: reference data | Captured / None | ... |
| Memory: feedback patterns | Captured / None | ... |
| Memory: decisions/state | Captured / None | ... |
| Environment parity | Checked / Not applicable | ... |
| Knowledge digest | Compiled / Not due (last: date) | ... |
| PO feedback | Given / No feedback | ... |
| Session summary | Output above | |
| Open actions review | Updated / No changes | ... |
| "What else?" self-challenge | Run: nothing / Run: acted on X | ... |
| Loose ends audit | Done / No loose ends | ... |
| Daily log | Updated / Created | ... |
| Confirmation | This table | |
