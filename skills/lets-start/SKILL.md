---
name: lets-start
description: Session start checklist. Runs inbox check, board state review, knowledge freshness audit, and intent declaration before pulling any work. The session counterpart to /lets-wrap.
disable-model-invocation: true
---

# Session Start

Work through each step in order. **Do not pull work from the board until step 6 is complete.**

---

## 1. Agent orientation

Read your project's operating instructions (e.g. a root CLAUDE.md or equivalent config file) and execute any session-start instructions it contains. Skipping this means missing operational steps that live outside this skill.

If you are the orchestrator agent, read the orchestrator operating model file and run any startup routines (inbox cron setup, communication conventions, etc.).

---

## 2. Inbox check

Check for agent-to-agent escalations waiting for you:

```bash
# Use your board tool to check your agent inbox
board-tool inbox <YOUR_INBOX_PREFIX>
```

For each inbox card found:
- Read the source card it refers to
- Post a response comment using your prefix on the original card
- Close the inbox card by moving it to the Closed column

If inbox is empty, move on.

---

## 3. Open actions

Review your `open-actions.md` file (if one exists). For each entry:
- Is it done? Remove it.
- Still pending? Keep it; factor it into your intent declaration at step 5.

If the file has no entries or does not exist: move on.

---

## 4. Board state

```bash
# Use your board tool to check WIP and card aging
board-tool wip-age
```

Note:
- What is in the prioritised queue (Now/Next)? Does it match strategic priority?
- What is in progress (Doing), and for how long?
- Is the review/validation column backed up?
- Is the "needs PO review" column over limit?
- Is in-progress under target? (Under target = system instability.)

**Closed column purge check:** If your board tool has a hard limit on closed cards per cell, check the count and archive old cards before hitting the limit.

---

## 4b. Agent activity scan

Quick scan of project agent outputs since your last session. Purpose: catch coordination issues, conflicts, or shipped work that needs orchestrator attention.

Read the most recent daily log entry. For each project agent entry, check:

- **Shared resource conflicts**: did multiple agents touch the same database tables, schema files, or API endpoints?
- **Shipped without review**: were any cards shipped that had pending architecture reviews or orchestrator comments?
- **Cross-project dependencies**: did any agent's work create or resolve a dependency on another project?
- **Flags for orchestrator**: did any agent explicitly flag something for you?

If conflicts or concerns found: note them for your intent declaration. If clean: move on.

This is a 2-minute scan, not deep analysis. The goal is to catch what the product owner would otherwise have to flag.

---

## 5. Knowledge freshness

Check the age of each domain knowledge file against recent repository activity. For each stale domain (14+ days old, repository active):

- Read the current knowledge file
- Check recent git log in the corresponding repository for relevant changes
- Update the knowledge file if warranted
- If no update needed, note why explicitly ("no relevant changes" is valid; silence is not)

Maintain a domain-to-repository mapping table so this step is repeatable across sessions.

---

## 6. Declare intent

State what you intend to do this session and why, based on:
- Board state (what is prioritised, what is aging, what is blocked)
- Inbox items processed
- Any knowledge updates completed

Example format:
> "Intent: Pull [card title] (#NNN) from Ready; it is the highest-priority unblocked card under initiative #NNN. Also reviewing #NNN in Doing which has been there Xd without a comment."

Then proceed. Do not wait for the product owner to confirm.
