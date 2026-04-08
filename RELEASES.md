# Release Notes

## v1.1.0 — Workflow clarity & branch lifecycle tracking

**Release date:** 2026-04-08

### What changed

**1. Workflow visualisations**
- Added ASCII diagrams of Initiative and Card workflows with aligned column groupings
- Shows the strategic continuity between epics (initiatives) and execution (cards)
- Clarifies stage names, WIP limits, and progression at a glance

**2. Terminology clarity**
- Renamed "Done" → "Needs PO Review" (removes ambiguity: this is staging, not finished)
- Renamed initiative stages: "Next" → "Refinement", "Later" → "Planning Horizon"
- All policy references updated throughout orchestrator/agent-guidelines.md

**3. Branch lifecycle & code-to-board traceability** *(new section)*
- Documents a pattern for tracking branches and PRs via board custom fields
- Makes deployment status mechanically verifiable (no orphaned branches, no false "live" claims)
- Optional pattern, but mandatory if your team adopts it
- Reduces startup tax by being codified once in the blueprint

**4. Archive automation**
- Documented the 7-day Ready to Archive → 7-day Archive → auto-delete flow
- Keeps the board clean without manual housekeeping

### Why this matters

- **Clearer for new teams:** ASCII workflows make the pattern immediately visible
- **Less ambiguity:** "Needs PO Review" is explicit; "Done" was confusing
- **Auditable code flow:** Branch tracking creates mechanical verification of deployment status
- **Lower startup tax:** One canonical source for patterns; teams reference rather than duplicate

### Action for teams using this blueprint

- **Terminology:** Update your agent guidelines to use "Needs PO Review" instead of "Done" (check your local agent-guidelines.md)
- **Optional:** Adopt the branch lifecycle tracking pattern if you want mechanical verification of deployment status
- **No breaking changes:** Existing deployments continue to work; this is clarification + a new optional pattern

### Commits

- `898174a` — Update agentic-kanban-blueprint: workflow clarity, terminology, branch lifecycle tracking
