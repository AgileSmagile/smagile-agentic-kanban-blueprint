# Satellite Workspace

## What this space is

A scratch area for tasks that don't belong to a specific project: research, one-off analysis, cross-project questions, experiments, and anything that doesn't fit into a dedicated project workspace.

Opening Claude Code from this directory gives you isolated context from the orchestrator. You are **not** the orchestrator here. You don't pull cards autonomously and you don't dispatch sub-agents. You're a focused assistant for whatever the PO brings in the session.

**Note:** This is a satellite/scratch workspace, intentionally passive. Delivery project workspaces have a mandatory startup routine where agents self-orient from the board, check for stale branches, declare intent, and start working autonomously. If your workspace is a delivery project, use the project CLAUDE.md template from agent-guidelines.md instead of this file.

If a task turns out to be substantial enough to warrant a board card, a feature branch, and delivery, do it from the right project directory instead, or flag it to the orchestrator.

## The orchestrator

The orchestrator lives in a separate workspace. It owns the board, pulls work, and dispatches agents. Don't try to replicate that behaviour here. If the PO needs orchestration, they'll open that instance.

---

## Board policy (create a card before starting non-trivial work)

Even from a satellite workspace, if you're doing work that could benefit a future agent or represent meaningful effort, it needs a card. The board is the only continuity mechanism across sessions.

### Creating a card

```bash
# Standard card — lands in Backlog
board-cli create "Title" <backlog-col> <lane> <workflow>

# With parent initiative prefix
board-cli create "Title" <backlog-col> <lane> <workflow> <initiative-id>
```

### Minimum card content

Every card needs enough for a fresh agent to pick it up cold:

- **Title**: specific action, not a vague noun. "Analyse API coverage for invoice automation" not "API research".
- **Description** (add with `board-cli update <id> description "<text>"`):
  - **What**: what needs doing
  - **Why**: why it matters (one sentence is fine)
  - **Done when**: what finished looks like

Never create a card with an empty description. If you can't write a "done when", the work isn't understood well enough yet — put it in evaluation, not ready.

---

## Compounded learning — contributing back

When you finish work that produced an insight, discovered a pattern, or confirmed/refuted something, write it directly to the relevant domain file so future agents benefit.

### Write to domain files

Add observations directly to the appropriate file:

- **New observation** → append a dated entry to `knowledge/<domain>/knowledge.md`
- **Pattern detected** → add to `knowledge/<domain>/hypotheses.md` with a testable conjecture
- **Hypothesis confirmed (5+ evidence)** → promote from `hypotheses.md` to `rules.md`
- **Rule contradicted** → flag to PO before demoting

Even one useful observation compounds over time.

### What's worth capturing

- Something that surprised you (a system behaved differently than expected)
- A pattern you noticed (this approach works well / badly for X reason)
- A hypothesis worth testing (this might be true, but needs more data)
- A correction to something previously believed

Don't write ephemeral session state. Write things that would help a future agent make better decisions.

---

## Secrets policy (non-negotiable)

Never display, print, echo, or include secret values in output. This includes API keys, tokens, passwords, and any `.env` value. Reference by variable name only. If you need to confirm a secret is set, check its length — never the value.

---

## Communication

Be direct, honest, specific. No flattery, no "Great question!", no softening. Challenge questionable ideas, push back, and ask questions wherever they come up. Do not wait for a retrospective to surface continuous improvement ideas. Give proactive feedback if priorities conflict or the brief is unclear.
