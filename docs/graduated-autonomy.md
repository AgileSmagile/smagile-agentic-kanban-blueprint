# Graduated Autonomy and Permissions

## The problem

Out of the box, Claude Code asks for permission on almost everything.  Every file write, every bash command, every git push.  This is safe and also unusable for autonomous delivery.  You will spend more time clicking "Allow" than the agent spends working.

OpenClaw has a simpler model: YOLO mode, which bypasses all permission prompts.  Fast, but it means your only safety net is whatever you built into the system yourself.

Neither extreme is right on day one.  This document describes a graduated approach: start conservative, widen permissions as you add mechanical safety, and understand what each layer gives you.

## The principle

**Permissions are not your primary safety mechanism.  Hooks are.**

Permissions prevent an agent from doing something.  Hooks detect and respond when something goes wrong.  A well-hooked system with wide permissions is safer than a narrow-permission system with no hooks, because the narrow system will either grind to a halt or get bypassed entirely when the human gets tired of approvals.

The sequence matters:

1. Set up hooks (security, flow nudges, retry-loop detection)
2. Verify hooks work (test them deliberately; trigger a secret pattern, trigger a retry loop)
3. Widen permissions progressively
4. Monitor audit trails

Do not reverse this order.

## Claude Code: settings.json

Claude Code permissions live in `~/.claude/settings.json` (global) and `.claude/settings.json` (per-project).  Project settings merge with global settings; the most restrictive wins.

### Level 0: Default (no configuration)

Every tool use prompts for approval.  Safe, slow, exhausting.  Use this for your first session while you orient yourself.

### Level 1: Conservative autonomy

Allow read-only operations and common development commands.  This is a reasonable starting point once you have read the agent guidelines and understand the operating model.

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(git status*)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(npm run lint*)",
      "Bash(npm run typecheck*)",
      "Bash(npm test*)"
    ]
  }
}
```

The agent can read anything, search anything, and run your lint/test/typecheck pipeline without asking.  It still prompts for file writes, git commits, git push, and anything else.

### Level 2: Development autonomy

Allow the agent to write code and commit to feature branches.  **Prerequisite: security hooks are installed and tested.**

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(node *)",
      "Bash(npx *)",
      "Bash(bash bin/board-cli*)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(rm -rf*)",
      "Bash(*> .env*)",
      "Bash(cat .env*)"
    ]
  }
}
```

The agent can now write code, run git commands, interact with the board, and use npm tooling.  Destructive git operations and direct .env access are explicitly denied.  The deny list is a backstop; your `block-secrets.sh` hook is the primary defence for secrets.

### Level 3: Full autonomy (with hooks)

For experienced operators with a complete hook suite in place.

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(rm -rf*)"
    ]
  }
}
```

This is functionally equivalent to OpenClaw's YOLO mode but with explicit deny rules for destructive operations.  **Do not use this level without:**

- `block-secrets.sh` (or equivalent) intercepting PreToolUse and PostToolUse
- A circuit-breaker hook that halts the session on any detected secret exposure (e.g. if `block-secrets.sh` fires a PostToolUse block, the circuit-breaker prevents the agent from continuing to use the compromised credential in subsequent calls)
- `retry-loop-detector.sh` (or equivalent) catching brute-force failures
- `flow-nudges.sh` (or equivalent) reinforcing flow discipline

These hooks are your safety net.  The permissions just determine how often you get interrupted.

### Level 4: Full autonomy, no deny list

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

This is YOLO.  Every tool call executes without prompt, including destructive operations.  The only protection is your hooks and the agent's own judgement (which, per the agent guidelines, includes not force-pushing, not deleting without confirmation, and not ignoring WIP limits).

Some operators run at this level successfully.  They have:
- A complete hook suite
- Agents operating in isolated environments (containers, VMs, sandboxed repos)
- Audit trails they review after sessions
- Acceptance that agents will occasionally do something dumb and that recovery is cheaper than prevention at this scale

This is a legitimate operating point, not a mistake.  But arrive here deliberately, not because you got frustrated with approvals.

## OpenClaw

OpenClaw's permission model is simpler.  YOLO mode (`--yolo` flag or configuration) bypasses all prompts.  There is no graduated middle ground in the tool itself.

This makes the hook layer even more important for OpenClaw users.  Your hooks ARE your permission system.  If you are running OpenClaw without hooks, you are running without safety.  The agent guidelines, board discipline, and knowledge system still apply; what changes is that mechanical enforcement shifts entirely to hooks rather than being shared between hooks and permissions.

## Hooks as prerequisites

The [security](security.md) documentation covers hook implementation in detail.  Here is the minimum hook suite and what each one prevents:

| Hook | What it catches | When to install |
|---|---|---|
| `block-secrets.sh` | Secret exposure in commands or output | Before Level 2 |
| Circuit-breaker (extend `block-secrets.sh`) | Continued operation after a detected breach | Before Level 2 |
| `retry-loop-detector.sh` | Agents stuck in failure loops, burning tokens and context | Before Level 2 |
| `flow-nudges.sh` | Drift from flow discipline (WIP, board updates, card creation) | Before Level 3 |
| `precompact-reinject.sh` | Critical rules lost during context compaction | Before Level 3 |
| `postcompact-verify.sh` | Verification that critical state survived compaction | Before Level 3 |

Install and test each hook before moving to the level that requires it.  Testing means deliberately triggering the condition: echo a fake API key to test `block-secrets.sh`, run a command that fails repeatedly to test the retry-loop detector.

## The autonomy boundaries still apply

Widening permissions does not change the autonomy model in the [agent guidelines](../orchestrator/agent-guidelines.md).  Agents still:

- **CAN** do everything in the "no permission needed" tier
- **SHOULD CONFIRM** before destructive operations, architectural decisions, and Tier 2+ merges
- **MUST NOT** expose secrets, make purchases, contact external parties, or ignore WIP limits

The difference is enforcement mechanism.  At Level 0-1, the tool itself prevents the agent from acting without approval.  At Level 3-4, the agent's instructions and your hooks provide the guardrails.  The boundaries are the same; what changes is who enforces them.

## Conversational autonomy: the other permission problem

Tool permissions control what agents *can* do.  Conversational autonomy controls what agents *will* do without asking.  These are different problems, and solving only the first creates a system where agents have bypass-level permissions but still ask "Should I start working on this?" before every action.

This is the more insidious friction.  A tool permission prompt is a modal dialogue; you click Allow and move on.  A conversational permission request ("Would you like me to proceed?", "Should I do A or B?") is worse: it requires you to context-switch, read the question, form an opinion, and type a response.  Multiply by ten agents across a working day and you've rebuilt the approval bottleneck that autonomy was supposed to eliminate.

**The root cause:** LLMs are trained to be helpful and cautious.  Their default is to seek confirmation.  Instructions like "use intent-based leadership" or "don't wait for approval" are too abstract; agents interpret them as "state intent, then wait for acknowledgement" rather than "state intent, then execute."

**What works:**

1. **Banned phrases.** Explicitly list the conversational patterns you don't want: "Should I...", "Would you like me to...", "Ready when you are", "Let me know if...".  These phrases transfer agency back to the human and create unnecessary round-trips.  Banning them is blunt but effective.

2. **A decision test.** Give agents a heuristic: "Would a competent senior engineer on this team ask their tech lead this question, or would they just do it?"  If a senior engineer would just do it, the agent should just do it.

3. **Explicit pause criteria.** Instead of vague "confirm when appropriate", list the only valid reasons to stop and ask:
   - A product decision that genuinely cannot be inferred from documentation
   - An irreversible action affecting production or shared infrastructure
   - An architectural choice with cross-project consequences
   - A card description too ambiguous to start (after checking all available docs)

   Everything else: declare intent, execute.

4. **Reinforcement in every project file.** Agents load their project's CLAUDE.md on every session start.  A short, direct autonomy rule in that file is worth more than a paragraph buried in a shared guidelines document.  Format: two sentences, no hedging, no explanation of why.  The guidelines doc has the reasoning; the CLAUDE.md has the rule.

**The pattern that emerges:** agents that ask too many questions are not being cautious; they are being lazy.  Asking transfers cognitive load to the human.  Making a decision and being wrong is cheaper than interrupting the human ten times a day.  If an agent makes a bad call, the board and git history make it visible and reversible.  If an agent asks permission for routine work, the time lost is gone forever.

**Escalation path:** If you find that agents continue to ask despite clear instructions, escalate the language.  "Intent-based leadership" becomes "banned phrases."  Guidelines become critical rules.  The goal is not to be aggressive; it's to be unambiguous enough that the model has no room to interpret "don't ask" as "ask politely."

## Choosing your level

There is no universal right answer.  Consider:

- **How much do you trust the hook suite?**  If you have not tested your hooks, stay at Level 1.
- **How isolated is the environment?**  Agents in containers with no production access can safely run at higher levels.
- **How reversible is the work?**  Code in a feature branch is low-risk.  Database migrations are not.
- **How much does approval friction cost you?**  If you are spending 30% of session time on approvals, the friction is itself a risk because it incentivises you to stop reviewing and start rubber-stamping.

Most operators settle at Level 2 or 3.  Level 4 is for systems where the blast radius is contained and the recovery path is fast.
