# Security Model

AI agents that can execute shell commands, read and write files, access APIs, and interact with external services are a fundamentally different security surface from a chatbot that answers questions. This document covers the security posture for an agentic delivery system: network isolation, secrets management, agent-specific threat modelling, compliance alignment, and code quality practices that reduce risk.

Parts of this model were informed by the [OpenClaw security documentation](https://docs.openclaw.ai/gateway/security), which is worth reading in full if you're running agents via that gateway.

## Threat model: what agents can do

Before anything else, be honest about the attack surface. An AI agent in this system can:

- Execute arbitrary shell commands
- Read and write files on the local filesystem
- Make HTTP requests to internal and external services
- Interact with APIs using stored credentials
- Create and push git commits
- Send messages via Discord or other communication channels
- Interact with the Kanban board (create cards, move cards, add comments)

This is powerful. It's also dangerous if the boundaries are wrong. The security model exists to make autonomous operation safe by default, not to prevent agents from being useful.

## Core principle: access control before intelligence

This framing comes from the [OpenClaw security model](https://docs.openclaw.ai/gateway/security) and is worth internalising:

> Most failures here are not fancy exploits; they're "someone messaged the bot and the bot did what they asked."

The defence layers, in priority order:

1. **Identity**: who (or what) can talk to the agent?
2. **Scope**: what is the agent allowed to do?
3. **Model**: assume the model can be manipulated; design so manipulation has limited blast radius.

Prompt-level instructions ("never reveal secrets") are the weakest layer. They help, but they're not a security boundary. The real boundaries are network isolation, filesystem permissions, tool restrictions, and the secrets architecture.

## Network isolation

### The DMZ pattern for self-hosted agents

If you're running agents on self-hosted hardware (Raspberry Pi, home server, VPS), network isolation is your first line of defence.

The production system this blueprint was extracted from runs agent infrastructure on a Raspberry Pi 5, isolated on a **guest network** with the following configuration:

- **Guest network segment**: the Pi sits on the guest WiFi/VLAN, separated from the primary home/office network. Devices on the guest network cannot reach devices on the primary network.
- **Access point disabled**: the Pi's onboard WiFi AP is disabled to prevent it from being used as a bridge between network segments.
- **Inbound access via tunnel only**: no ports are opened on the router. All inbound traffic reaches the Pi through [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), which terminate TLS at Cloudflare's edge and forward to the Pi over an outbound-only connection.
- **Firewall (ufw)**: the Pi's firewall allows only SSH from the local network segment and outbound HTTPS. Everything else is denied by default.

This creates a DMZ: the Pi can reach the internet (for API calls, git push, tunnel connectivity) but is isolated from the internal network. If the Pi is compromised, the blast radius is limited to the Pi itself and the services it can reach over the internet.

```
Internet
   │
   ├── Cloudflare Tunnel (TLS terminated at edge)
   │        │
   │   ┌────┴────┐
   │   │  Pi 5   │  ← Guest network (isolated VLAN)
   │   │  (DMZ)  │  ← No access to primary network
   │   └─────────┘  ← ufw: SSH local only, outbound HTTPS only
   │
   ├── Primary network (laptops, phones, NAS)
   │        ↑
   │        └── Cannot reach guest network
```

### Docker port publishing and firewall bypass

A common gotcha: Docker's port publishing (`-p HOST:CONTAINER`) bypasses host firewall rules (including `ufw`). Published ports are routed through Docker's own iptables chains, which are evaluated before `INPUT` rules.

**Fix**: enforce allowlist rules in the `DOCKER-USER` chain, which is evaluated before Docker's accept rules. See the [OpenClaw security docs](https://docs.openclaw.ai/gateway/security) for a worked example.

### Recommendations

- Self-hosted agent infrastructure belongs on an isolated network segment
- Prefer tunnel-based ingress (Cloudflare Tunnels, Tailscale Serve) over opening firewall ports
- Disable any unnecessary network interfaces (WiFi AP, Bluetooth)
- Test your firewall rules from outside the segment, not just from the host itself
- If using Docker, audit your `DOCKER-USER` chain

## Secrets management

### Why `pass` over scattered `.env` files

The production system uses [pass](https://www.passwordstore.org/) (the standard Unix password manager) as the single secrets store, rather than `.env` files per project.

**The problem with `.env` files:**

- Secrets are scattered across multiple directories, each with different ownership
- Every project has its own `.env` with its own copy of shared credentials
- Rotating a secret means updating N files across N projects
- A single `git add .` accident can commit secrets to version control
- Agents that can read files can read `.env` files; the more copies, the more exposure
- No encryption at rest; credentials sit in plaintext on disk

**Why `pass` is better:**

- **Single store, GPG-encrypted at rest.** One directory (`~/.password-store/`), encrypted per-entry with GPG. Even if the filesystem is accessed, secrets are cipherless without the GPG key.
- **Structured hierarchy.** `pass show businessmap/api-key` is self-documenting. No grepping through `.env` files to find which variable holds which credential.
- **One rotation point.** Update the secret once in `pass`; a sync script propagates to `.env` files where runtime tools require them.
- **Audit trail.** `pass` backs the store with git. Every secret change is a commit with a timestamp.
- **Agent-compatible.** Agents can run `pass show <path>` to retrieve a secret at runtime without the value ever appearing in a file the agent can `cat`.

**The pattern:**

```
pass (encrypted, single source of truth)
  │
  └── bin/sync-env (populates .env files for tools that need them)
        │
        ├── project-a/.env (gitignored, runtime only)
        ├── project-b/.env (gitignored, runtime only)
        └── ...
```

`.env` files are treated as runtime artefacts, not as the source of truth. They're gitignored, populated by a sync script, and can be regenerated at any time. The real secrets live in `pass`.

### Per-agent API key isolation

A single shared API key for all agents means any agent can act as any other agent on the board.  If one agent's key is compromised or rotated, every agent is affected.  Worse, audit trails cannot distinguish which agent performed an action.

The better pattern: **one API key per agent role**, scoped to the permissions that role needs.

```
pass/
├── boardtool/
│   ├── orchestrator/api-key      ← orchestrator only
│   ├── test-specialist/api-key   ← test specialist only
│   └── project-agent/api-key     ← shared by all project agents
```

Project agents share a key because they have identical board permissions.  The orchestrator and test specialist get their own keys because they have elevated or distinct permissions (cross-project visibility, quality gate authority).

**Sync targets map to roles, not projects:**

```
sync-env --target orchestrator       ← pulls orchestrator key
sync-env --target test-specialist    ← pulls test-specialist key
sync-env --target project-agents     ← pushes project-agent key to all project repos
```

The workflow for key rotation is: edit the key in `pass`, run `sync-env` for the affected target, done.  No manual `.env` editing.  No hunting across repos.

**The board CLI should respect the environment:**  If `BOARDTOOL_API_KEY` (or equivalent) is already set in the environment, the CLI should use it.  If not, it falls back to reading the project `.env`.  This means agents that source their `.env` on startup automatically get the right key for their role without hardcoding paths.

### Credential verification at startup

Agents should verify their board credentials work before pulling work.  A bad key (expired, rotated, wrong role) produces silent failures: cards not created, comments not posted, moves rejected.  The agent continues working, unaware that its board operations are failing.

Add a `verify` command to your board CLI:

```bash
board-cli verify
# Output: OK (never echoes the key itself)
# Or: FAILED — API returned 401 (key may need rotation; run sync-env)
```

Make this part of the agent startup routine.  If verify fails, the agent should stop and flag the issue rather than proceeding with broken board access.

### Agent secret disclosure prevention

AI agents are language models. Their natural behaviour is to be helpful, which includes outputting information when asked. This makes them a disclosure risk for any secret they can access.

**The layered approach:**

1. **Instruction-level** (weakest, but still valuable):
   - "Never display, print, echo, or include secret values in output"
   - "Reference by variable name only"
   - "If debugging requires confirming a value is set, check its length, never the full value"

2. **Architecture-level** (stronger):
   - Secrets live in `pass`, not in files agents routinely read
   - `.env.example` files document expected variables without values
   - Agents are instructed to read `.env.example` to understand variables, not `.env`
   - The sync script runs outside agent sessions; agents don't need to know how secrets get into `.env`

3. **Detection-level** (backstop):
   - **Pre-push security scan**: greps for hardcoded secret patterns (high-entropy strings, known key prefixes like `sk_`, `ghp_`, `supabase_`)
   - **Post-output blocking hook**: scans every agent output for secret-shaped strings and blocks display before the text reaches the user. This is the mechanical safeguard that catches accidental disclosures the instruction alone would miss.

4. **Blast radius reduction**:
   - Agents operate in project-scoped directories, not from the home directory
   - File access is bounded by the project scope; agents don't have reason to traverse to other projects' `.env` files
   - Sandbox mode (for OpenClaw agents) can restrict filesystem access to read-only or none

**The incident that drove this policy:** early in the system's development, an agent outputted credentials in conversation output. Rotating those credentials required updates across multiple services, agents, and CI/CD pipelines. The secrets policy is now the first non-negotiable in every CLAUDE.md and instructions file. It exists because the alternative is expensive.

### Post-output blocking hook

The strongest mechanical safeguard is a hook that intercepts agent output before it reaches the user and blocks any text matching secret patterns.

**What it does:**
- Scans every agent response for known secret prefixes: `sk_` (Stripe), `ghp_` (GitHub), `supabase_`, `pk_`, `rk_`, common AWS patterns, etc.
- Also scans for high-entropy string patterns that may be API keys
- Replaces or redacts matched text with `[REDACTED]` or blocks the line entirely
- Logs the incident (redaction happened, when, which pattern matched) for audit

**Why it's necessary:**
Instructions alone don't prevent accidental disclosure. An agent trying to debug a failing API call might output the full error message, which includes the auth header. An agent reviewing logs might copy a line containing an API key. The hook catches these before they reach the user.

**Implementation (Claude Code):**

Two hook events work together.  `PreToolUse` blocks commands before they execute.  `PostToolUse` scans output after execution.  Both are registered in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Read",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/block-secrets.sh\"",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/block-secrets.sh\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

The script receives JSON on stdin describing the tool call (for `PreToolUse`) or the tool result (for `PostToolUse`).  It returns a JSON deny decision to block pre-execution, or exits with code 2 to suppress post-execution output.

Here is a minimal, working `block-secrets.sh` you can adapt.  Save it to `~/.claude/hooks/block-secrets.sh`:

```bash
#!/bin/bash
# block-secrets.sh — Prevent agents from exposing secrets
# PreToolUse: exit 0 with deny JSON to block a command before execution.
# PostToolUse: exit 2 to suppress output containing secrets.

INPUT=$(cat)

# Parse the hook payload.  Uses node because jq is not always available.
{ read -r -d '' EVENT
  read -r -d '' TOOL
  read -r -d '' COMMAND
  read -r -d '' STDOUT
} < <(echo "$INPUT" | node -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
process.stdout.write(
  (d.hook_event_name||'')+'\0'+
  (d.tool_name||'')+'\0'+
  ((d.tool_input||{}).command||'')+'\0'+
  (((d.tool_response||{}).stdout||''))+'\0'
);" 2>/dev/null) || true

# If parsing failed, allow (don't break the tool chain).
[ -z "$EVENT" ] && exit 0

# ── PreToolUse: block commands that reference secret variables ──
if [ "$EVENT" = "PreToolUse" ]; then
  if [ "$TOOL" = "Bash" ]; then
    # Block commands that inline secret env vars.
    # Replace these variable names with your own.
    if echo "$COMMAND" | grep -E \
      '\$(MY_API_KEY|DATABASE_URL|SECRET_TOKEN)' \
      >/dev/null 2>&1; then
      cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Cannot reference secret environment variables in commands.  Reference by name only."}}
JSON
      exit 0
    fi

    # Block reading .env files (except .env.example).
    if echo "$COMMAND" | grep -E '(cat|head|tail|less|more)\s+.*\.env' \
      | grep -v '\.env\.example' >/dev/null 2>&1; then
      cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Cannot read .env files.  Use .env.example for variable names."}}
JSON
      exit 0
    fi
  fi

  # Block Read tool on .env files.
  if [ "$TOOL" = "Read" ]; then
    FILEPATH=$(echo "$INPUT" | node -e "
      const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
      process.stdout.write((d.tool_input||{}).file_path||'');" 2>/dev/null)
    if echo "$FILEPATH" | grep -E '\.env' | grep -v '\.env\.example' \
      >/dev/null 2>&1; then
      cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Cannot read .env files.  Use .env.example for variable names."}}
JSON
      exit 0
    fi
  fi
fi

# ── PostToolUse: scan output for leaked secret patterns ──
if [ "$EVENT" = "PostToolUse" ] && [ -n "$STDOUT" ]; then
  if echo "$STDOUT" | grep -E \
    'sk-ant-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{36,}|AKIA[0-9A-Z]{16}' \
    >/dev/null 2>&1; then
    echo "SECURITY: Secret pattern detected in output.  Blocked." >&2
    exit 2
  fi
fi

# Allow by default.
exit 0
```

Both hooks run in the Claude Code harness, not in the agent's context window.  The agent cannot disable, override, or forget them.  This is the critical difference between instruction-level and mechanical enforcement.

**Why block, not redact?**

PostToolUse hooks in Claude Code can only allow (exit 0) or block (exit 2).  There is no mechanism to return modified output with secrets masked.  This means you cannot surgically replace a token with `[REDACTED]` and pass the rest through; it's all or nothing.

This sounds harsh, but it's actually safer.  Redaction trusts a regex to catch and mask the secret before it enters the conversation context.  If the regex misses, the secret is exposed.  Blocking means the secret never enters the conversation at all.  The agent gets an error message on stderr explaining what happened, and can retry the command without requesting the sensitive field.

The trade-off: the agent loses potentially useful non-secret information in the same output.  In practice this is rarely a problem.  If a Cloudflare API response contains both a tunnel secret and a status field, the agent can re-query for just the status.

**Expanding pattern coverage:**

The minimal example above catches three patterns.  In production, you'll need more.  External APIs (Cloudflare, AWS, Stripe, your board tool) return credentials in JSON responses that agents didn't explicitly request.  Common patterns to add:

- **Cloudflare API tokens**: `v1.0-` followed by 40+ hex characters
- **Cloudflare tunnel credentials**: JSON containing `"TunnelSecret"` with a value
- **Generic JSON secret fields**: keys named `secret`, `apiKey`, `api_key`, `password`, `access_token`, `client_secret`, `private_key`, `webhook_secret` with values longer than 20 characters
- **Bearer tokens**: `Bearer ` followed by 30+ alphanumeric characters
- **JWTs**: three dot-separated base64 segments starting with `eyJ`
- **Board/service API keys in JSON**: `"apikey"` fields with 40+ character values

Each pattern has a false-positive risk.  JWTs in particular appear in legitimate contexts (decoding a JWT to inspect claims is a valid debugging step).  Tune for your environment; start aggressive and relax if specific patterns cause too much friction.

**The inbound secret problem:**

A subtle case: you explicitly block agents from reading `.env` files, but an external API call can return secrets the agent didn't ask for.  Running `cloudflared tunnel info` might output tunnel credentials.  Querying your board API might return an API key in the response body.  The agent didn't do anything wrong; the external system volunteered the secret.

This is why PostToolUse scanning is essential even with perfect PreToolUse blocking.  PreToolUse prevents the agent from deliberately accessing secrets.  PostToolUse catches secrets that arrive uninvited.

**Limitations:**
- Won't catch every possible secret shape (tokens with irregular formats, custom enterprise credentials)
- Can produce false positives (valid output that happens to match a pattern)
- Requires maintenance as new services and secret formats emerge
- Cannot redact; can only block entirely (Claude Code hook architecture limitation)

**Best practice:** Combine the hook with the instruction ("never display secrets"), the architecture-level practice (secrets in `pass`, not in files), and the pre-push scan. Layers compound.  Accept that no single layer is perfect; the combination is what makes the system trustworthy.

### Secrets audit tooling

As the system grows, secrets sprawl.  The same credential exists in `pass`, in a Cloudflare Pages environment variable, in a GitHub Actions secret, and maybe in a second `pass` store for a different product.  Nobody can answer "which environments have this secret?" without checking each one manually.

The fix is a cross-environment presence matrix: a script that queries every secrets destination and reports which secrets exist where, without displaying values.

```
$ secrets-audit bfp
Secret                    pass-bfp  CF Pages  GH (app)  GH (mobile)
SUPABASE_URL              ✓         ✓         ✓         ✓
SUPABASE_ANON_KEY         ✓         ✓         ✓         ✓
SUPABASE_SERVICE_KEY      ✓         ✓         ✗         ✗
STRIPE_SECRET_KEY         ✓         ✓         ✗         ✗
RESEND_API_KEY            ✓         ✗         ✗         ✗
```

This tool should be run before creating or renaming any secret.  It prevents duplicate names, catches missing propagation, and makes rotation auditable.

**Canonical secret naming** reinforces this.  Maintain a single file (e.g. `knowledge/secrets-canonical.md`) that maps every secret to its canonical name, which environments it should exist in, and any naming conventions.  Agents must derive new names from this file, not invent them ad hoc.  The naming conventions are simple: `SERVICE_PURPOSE` format, uppercase with underscores, no project prefixes unless the same service is used by multiple products.

### Secrets rotation policy

Secrets that never rotate are secrets waiting to be compromised.  A tiered rotation policy balances security with operational overhead:

| Tier | Cadence | Examples |
|------|---------|---------|
| **Critical** | 90 days | PII encryption keys, payment provider secrets, database service keys with write access |
| **High** | 180 days | API keys with elevated permissions, OAuth client secrets, webhook signing keys |
| **Medium** | 365 days | Read-only API keys, monitoring tokens, CI/CD service accounts |
| **Low** | On compromise only | Public-facing identifiers, non-sensitive config values |

**Rotation procedure:**

1. Generate the new credential in the upstream service
2. Update `pass` (or your secrets manager) with the new value
3. Run `sync-env` to propagate to runtime environments
4. Verify each dependent service still works (not just the first one)
5. Revoke the old credential
6. Log the rotation with date and who performed it

**Service-specific traps to watch for:**
- Services with multiple integration points (e.g. a board tool used by n8n, a CLI, and a webhook) need all paths updated during rotation, not just the most obvious one
- Some services support graceful rotation via a "previous key" mechanism.  Use it: set the new key as primary, keep the old key as fallback for in-flight requests, revoke the old key after a grace period
- Encryption keys used for stored data cannot simply be rotated; the data must be re-encrypted.  These are the highest-risk rotations and should have a runbook

**Automation:**  Track rotation dates and set reminders.  A board card created 90 days after the last Critical-tier rotation is a simple, low-cost enforcement mechanism.

### Recommendations

- Use an encrypted secrets manager (`pass`, Vault, 1Password CLI) as the single source of truth
- Treat `.env` files as disposable runtime artefacts, not as secrets storage
- Include explicit "never display secrets" instructions in every agent's system prompt
- Run pre-push scans for secret patterns
- When a secret is exposed, rotate immediately; don't assume the exposure was limited
- Run a secrets audit before creating or renaming any secret
- Maintain a canonical secret naming file and enforce it
- Assign a rotation tier to every secret and track rotation dates

## Hook design principle: fail closed

A hook that silently exits 0 on parse failure is equivalent to no hook at all.  If the JSON payload is malformed, if `node` is not on PATH, if the script hits an unexpected edge case, and the hook returns exit 0, the action proceeds unblocked.  Every protection the hook was supposed to enforce is silently disabled.

This happened in production.  The `block-secrets.sh` script parsed JSON via `node` and fell back to `exit 0` on parse failure.  A malformed payload bypassed all secrets protection.  The fix was straightforward but the lesson is architectural:

**PreToolUse hooks must fail closed.**  If parsing fails, if the environment is unexpected, if anything goes wrong, block the action.  A false positive (blocking a safe action) is visible and fixable.  A false negative (allowing a dangerous action) is invisible until damage is done.

**PostToolUse hooks can fail open.**  These hooks process output after the action has already happened.  Blocking here means suppressing output, which is less damaging than allowing a dangerous command to execute.  A PostToolUse hook that fails and exits 0 means the output is shown to the agent unfiltered, which is the default behaviour anyway.

Apply this to every hook you write:

```bash
# PreToolUse — fail closed
{ read -r PARSED_DATA; } < <(parse_json "$INPUT") || {
  # Parse failed — block the action
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Hook parse failure — failing closed."}}'
  exit 0
}

# PostToolUse — fail open
{ read -r PARSED_DATA; } < <(parse_json "$INPUT") || {
  # Parse failed — allow output through
  exit 0
}
```

The distinction is simple: PreToolUse guards a gate (fail closed = gate stays shut).  PostToolUse observes traffic (fail open = observation stops, traffic continues).

## Retry loop detection

A different class of problem from secrets exposure: agents brute-forcing the same failing approach.  An agent that hits a build error will often retry the same command, tweak one character, retry again, and repeat until it exhausts the context window.  This burns tokens without progress and is the agentic equivalent of a developer staring at the same error for an hour without stepping back.

### The hook

A PostToolUse hook tracks consecutive tool failures and escalates through three stages:

1. **Nudge** (5 consecutive failures): gentle reminder to reconsider the approach
2. **Warning** (7 consecutive failures): explicit instruction to try something fundamentally different
3. **Hard stop** (9 consecutive failures): agent is told to stop, escalate to the orchestrator, and pull other work

The streak resets to zero on any successful tool call.  This prevents false escalation from interleaved successes and failures.

```bash
#!/bin/bash
# retry-loop-detector.sh — Detects agents brute-forcing the same problem
# Fires on PostToolUse.  Tracks consecutive failures and escalates.

STATE_FILE="$HOME/.claude/hooks/.retry-loop-state"
NUDGE_AT="${RETRY_NUDGE_THRESHOLD:-5}"
WARN_AT="${RETRY_WARN_THRESHOLD:-7}"
STOP_AT="${RETRY_STOP_THRESHOLD:-9}"

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  process.stdout.write(d.tool_name || 'unknown');
" 2>/dev/null)

IS_ERROR=$(echo "$INPUT" | node -e "
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const resp = d.tool_response || {};
  const out = JSON.stringify(resp.stdout || resp.stderr || resp.output || '');
  const hasError = /error|Error|ERROR|FAIL|fail|Permission denied|not found|timed out|exit code [1-9]/.test(out);
  process.stdout.write(hasError ? '1' : '0');
" 2>/dev/null)

if [ "$IS_ERROR" != "1" ]; then
  [ -f "$STATE_FILE" ] && echo "0|success|$(date +%s)" > "$STATE_FILE"
  exit 0
fi

STREAK=0
[ -f "$STATE_FILE" ] && STREAK=$(cut -d'|' -f1 "$STATE_FILE" 2>/dev/null || echo 0)
STREAK=$((STREAK + 1))
echo "${STREAK}|${TOOL_NAME}|$(date +%s)" > "$STATE_FILE"

if [ "$STREAK" -ge "$STOP_AT" ]; then
  echo "0|stopped|$(date +%s)" > "$STATE_FILE"
  echo "[RETRY LOOP DETECTED] $STREAK consecutive failures. STOP." >&2
  echo "Tag the orchestrator. Pull other work if capacity exists." >&2
elif [ "$STREAK" -ge "$WARN_AT" ]; then
  echo "[WARNING] $STREAK consecutive failures. Try a fundamentally different approach." >&2
elif [ "$STREAK" -ge "$NUDGE_AT" ]; then
  echo "[retry] $STREAK consecutive failures on $TOOL_NAME. Step back and reconsider." >&2
fi
exit 0
```

### Tuning

The thresholds (5/7/9) are calibrated for agents that occasionally hit transient failures (rate limits, network timeouts) without triggering false escalation.  Lower thresholds (3/5/7) are appropriate for systems where every tool call should succeed; higher thresholds for systems with unreliable external dependencies.

The error detection regex is intentionally broad.  It matches "error", "Error", "FAIL", "Permission denied", "not found", "timed out", and non-zero exit codes.  This can produce false positives on output like "0 errors found", but the high threshold absorbs this: five consecutive false positives without a single success is extremely unlikely during normal operation.

### Registration

Add the hook alongside `block-secrets.sh` in your `settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": { "tool_name": "Bash" },
        "hooks": [
          { "type": "command", "command": "bash \"$HOME/.claude/hooks/retry-loop-detector.sh\"" }
        ]
      }
    ]
  }
}
```

## Compaction resilience: keeping safety rules in context

AI agents operating under large instruction sets (700+ lines of operating model, project-specific rules, domain knowledge) face a structural risk: when the context window fills and the model compresses prior messages, safety instructions degrade first.  The model retains what seems most relevant to the current task and discards "background" constraints.  Secrets policy, GDPR requirements, and autonomy boundaries are exactly the kind of content that gets compressed away.

### The problem

Instructions like "never display secrets" are constraints on helpfulness.  Under context pressure, a probabilistic model will prioritise being helpful over obeying a constraint it can barely recall.  This is not a model failure; it is an architectural one.  The system relied on the agent remembering the rule instead of enforcing it mechanically.

Smaller, faster models (Haiku) are more susceptible because they compress context more aggressively.  But all models are affected over long sessions.

### The fix: structured instructions + compaction hooks

**1. Structure your instructions with critical rules at the top.**

Place non-negotiable rules (secrets policy, MUST NOT list, GDPR, security priority) in a clearly delimited section at the very beginning of your operating model document.  Use HTML comments as markers so hooks can extract the section programmatically:

```markdown
<!-- CRITICAL-RULES-START -->
## Critical Rules (non-negotiable, survives compaction)

These rules override everything else.  If context has been compressed
and you are unsure what you retained, re-read this document in full.

### Secrets policy
- Never display, print, echo, or log secret values...
- Reference secrets by variable name only...

### After compaction
If prior messages have been compressed, re-read this document in full
before continuing work.
<!-- CRITICAL-RULES-END -->
```

Later sections that repeat these rules should reference upward ("See Critical Rules at the top of this document") rather than duplicating the content.  Duplication creates drift; a single source within the document keeps the rules consistent.

**2. PreCompact hook: re-inject critical rules before compaction.**

Claude Code fires a `PreCompact` event before context compression.  A hook on this event can re-inject the critical rules into context via stderr, making them "recently mentioned" when the model builds its compaction summary.  Recently mentioned content is more likely to survive summarisation.

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/precompact-reinject.sh\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

The hook script extracts the delimited section and outputs it to stderr:

```bash
#!/bin/bash
# precompact-reinject.sh — Re-inject critical rules before compaction

GUIDELINES="/path/to/your/agent_guidelines.md"

[ ! -f "$GUIDELINES" ] && exit 0

CRITICAL=$(sed -n '/<!-- CRITICAL-RULES-START -->/,/<!-- CRITICAL-RULES-END -->/p' \
  "$GUIDELINES" 2>/dev/null)

[ -z "$CRITICAL" ] && exit 0

echo "PRE-COMPACTION: Critical rules re-injected." >&2
echo "$CRITICAL" >&2
echo "After compaction, re-read the full document if detail has been lost." >&2

exit 0
```

**3. PostCompact hook: verify retention and trigger re-read.**

After compaction, a `PostCompact` hook prompts the agent to self-assess what it retained.  The hook cannot inspect the agent's context directly, but it can output a verification prompt via stderr that the agent will see and act on:

```bash
#!/bin/bash
# postcompact-verify.sh — Prompt agent to verify guideline retention

GUIDELINES="/path/to/your/agent_guidelines.md"
[ ! -f "$GUIDELINES" ] && exit 0

SECTION_COUNT=$(grep -c '^## ' "$GUIDELINES" 2>/dev/null || echo "unknown")

cat >&2 <<EOF
POST-COMPACTION VERIFICATION REQUIRED

agent_guidelines.md contains ${SECTION_COUNT} top-level sections.

1. List the ## headings you can recall.
2. If you have lost more than 10%, re-read the document now.
3. If you cannot recall the Critical Rules section in detail,
   re-read immediately.
EOF

exit 0
```

### Why this works

- **PreCompact** influences what the model retains during summarisation by making critical content recent
- **PostCompact** triggers a mechanical re-read if the agent detects degradation
- **The instruction in the document itself** ("re-read after compaction") survives because it is in the critical section that was just re-injected
- **The hooks are harness-level**, not agent-level.  The agent cannot forget, disable, or skip them

This pattern was inspired by [MemPalace](https://github.com/MemPalace/mempalace)'s precompact hook design, which persists memory to storage before context compression.  The principle is the same: act before the window shrinks, not after.

## Flow nudges: silent periodic reminders

Security hooks block dangerous actions.  Compaction hooks preserve critical context.  Flow nudges solve a third problem: agents that know the rules but drift from them over long sessions.

An agent that read "under-WIP is as bad as over-WIP" at session start may, fifty tool calls later, ask the product owner which card to work on next.  It is not disobeying.  It has simply lost the nuance under the weight of the current task.

### The pattern

A `PostToolUse` hook counts tool calls and, every N calls, outputs a brief flow reminder to stderr.  The agent sees it as context.  The user sees nothing.  The reminders rotate through a set of flow principles that are important but not security-critical.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/flow-nudges.sh\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### A minimal implementation

```bash
#!/bin/bash
# flow-nudges.sh — Periodic silent reminders for flow discipline
# Outputs to stderr so the agent sees them; the user does not.

COUNTER_FILE="$HOME/.claude/hooks/.flow-nudge-count"
LOG_FILE="$HOME/.claude/audit/flow-nudges.log"
INTERVAL="${FLOW_NUDGE_INTERVAL:-25}"

mkdir -p "$(dirname "$LOG_FILE")"

COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

[ $((COUNT % INTERVAL)) -ne 0 ] && exit 0

NUDGE_INDEX=$(( (COUNT / INTERVAL) % 4 ))
NUDGE_TEXT=""

case $NUDGE_INDEX in
  0) NUDGE_TEXT="Under-WIP is as bad as over-WIP.  If IP is below target and there is a Ready card, pull it.  You own card-level sequencing." ;;
  1) NUDGE_TEXT="Is there a card on the board for this work?  If the task has grown beyond a quick question, create one now." ;;
  2) NUDGE_TEXT="Have you updated your card or written to memory recently?  Progress without a record is invisible to the next agent." ;;
  3) NUDGE_TEXT="Work on active initiatives does not need permission.  Priorities were set when initiatives entered the active column.  You decide card order." ;;
esac

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | tool_call=$COUNT | interval=$INTERVAL | nudge=$NUDGE_INDEX" >> "$LOG_FILE"
echo "[flow] $NUDGE_TEXT" >&2

exit 0
```

### Tuning the interval

The default interval of 25 tool calls is a starting point, not a prescription.  The right interval depends on your system:

- **Start high (40-50) and reduce** if agents still drift.  Nudge fatigue is real; too frequent and the agent treats them as background noise.
- **Set via environment variable** (`FLOW_NUDGE_INTERVAL`) so you can tune per project or globally without editing the script.
- **Review the log** at `~/.claude/audit/flow-nudges.log`.  Each nudge is timestamped with the tool call count and interval.  Correlate against agent behaviour: are nudges firing but being ignored?  Are agents drifting between nudges?  The log gives you data to tune with rather than guessing.
- **Adapt the nudge messages** to your system's specific failure modes.  The four nudges above reflect a system where agents ask unnecessary permission, forget to create cards, neglect card updates, and defer priority decisions to the product owner.  Your failure modes may be different.

The interval is a tuning parameter, not a constant.  Treat it like a WIP limit: set it, observe, adjust.

## Compliance alignment

This system was designed with awareness of three compliance frameworks. None are formally certified (certification requires organisational processes beyond an operating model), but the design choices are aligned with their principles.

### GDPR

GDPR compliance is treated as non-negotiable for anything that touches personal data.

**Design choices:**

- **Multi-tenant architecture with row-level security (RLS).** Every database table that contains user data has RLS policies enforced at the Postgres level. No cross-tenant data leakage is possible under any application code path, including bugs, because the database itself enforces isolation.
- **Data minimisation.** Only collect and store data needed for the feature. No speculative data hoarding.
- **Right to deletion.** Account deletion must be a complete operation: user data, generated content, analytics, and any derived data. This is tested, not assumed.
- **Right to export.** Users can export their data in a portable format.
- **Encryption in transit.** All external communication over TLS. Cloudflare Tunnels enforce this for self-hosted services.
- **Encryption at rest.** Secrets in `pass` (GPG-encrypted). Database credentials scoped to minimum required access.
- **Agent constraint.** Agents are explicitly instructed that GDPR compliance is non-negotiable. Any feature that touches personal data must account for consent, minimisation, and deletion from the design phase, not bolted on after.

### SOC 2 alignment

SOC 2 is organised around five trust service criteria. The operating model addresses several:

| Criteria | How this system aligns |
|----------|----------------------|
| **Security** | Network isolation (DMZ), encrypted secrets, pre-push security scans, autonomy boundaries preventing agents from deploying without approval |
| **Availability** | Health monitoring (free-tier tools such as UptimeRobot work well), blue-green deploys with health-check gates, zero-downtime deploy patterns |
| **Processing integrity** | Board as single source of truth, atomic commits, CI/CD pipeline as quality gate, fail-first TDD |
| **Confidentiality** | Secrets policy (never display), encrypted at rest, RLS at database level, agent scope boundaries |
| **Privacy** | GDPR alignment (see above), data minimisation, right to deletion |

**Gaps to be aware of:** SOC 2 requires formal policies, access reviews, incident response procedures, and audit logging beyond what an operating model alone provides. The technical controls here support SOC 2, but organisational processes are needed for actual compliance.

### ISO 27001 alignment

ISO 27001's Annex A controls that this system addresses:

- **A.5 (Organisational controls):** Autonomy boundaries define who can do what. The operating model is the documented policy.
- **A.7 (Human resource security):** Onboarding agents with persona files and explicit constraints is the AI equivalent of security awareness training.
- **A.8 (Asset management):** SAM (Software Asset Management) register tracks all software assets, subscriptions, and costs. Hardware reference tracks physical infrastructure.
- **A.9 (Access control):** Secrets managed centrally, agents scoped to project directories, deployment requires confirmation.
- **A.12 (Operations security):** Pre-push security scans, CI/CD pipeline, vulnerability management via code health workflows.
- **A.14 (System development):** Fail-first TDD, atomic commits, branch strategy, code review via PRs.

**Reality check:** ISO 27001 certification requires an ISMS (Information Security Management System), risk assessments, and regular audits. This operating model provides the technical foundation but not the management framework.

## Code quality as a security practice

### Test-driven development (TDD)

TDD is not just a development practice; it's a security practice. Untested code is unverified code. In an agentic system, where AI writes the code, TDD is the primary mechanism for ensuring the code does what was intended, not just what the model hallucinated.

**The fail-first sequence (non-negotiable):**

1. Write the test(s) describing the expected behaviour
2. Run tests; **confirm they fail.** This step is critical. If a test passes without implementation, it's testing nothing. In an agentic context, this is the difference between "the agent wrote a test that validates the requirement" and "the agent wrote a test that mirrors its own output."
3. Write the implementation
4. Run tests; confirm they pass
5. Refactor if needed; tests must still pass

**Why step 2 matters more for AI agents than humans:** A human developer knows when they're writing implementation before tests. An AI agent might generate tests after (or alongside) implementation and produce tests that merely confirm what the code does rather than validate what it should do. The fail-first requirement is the structural check against this.

**Coverage expectations:**

- All new logic gets tests
- All bug fixes get a regression test (proves the bug existed, proves it's fixed)
- Tests run before every commit (locally) and on every PR (CI)
- Failing tests block merge; they are never deleted to make CI green

### Refactoring

Refactoring is a continuous practice, not an event. Agents are instructed to "regularly look for refactoring opportunities across the whole codebase" as part of normal delivery.

**Refactoring in an agentic context:**

- Agents can spot patterns that humans miss (repeated code across files, inconsistent naming, dead code paths) because they read the entire codebase per session
- Refactoring cards go through the same workflow: card, branch, tests, PR, CI, merge
- Refactoring without tests is not refactoring; it's editing. The test suite must pass before and after.
- The `/simplify` skill (in Claude Code) reviews changed code for reuse, quality, and efficiency, then fixes issues found. This is a lightweight refactoring pass integrated into the delivery flow.

### Pen testing

Security testing is built into the delivery cycle, not treated as a periodic external activity.

**Continuous practices:**

- **Pre-push security scan**: every branch push checks for npm vulnerabilities (HIGH/CRITICAL), hardcoded secret patterns, `eval()` usage, `dangerouslySetInnerHTML`, and accidentally committed `.env` files. FAIL = blocked.
- **Dependency audit**: `npm audit` runs as part of the code health workflow (daily + on push). Vulnerabilities are surfaced as board cards and tracked through the normal workflow.
- **OWASP top 10 awareness**: agents are instructed to avoid introducing common web application vulnerabilities from the [OWASP](https://owasp.org) (Open Worldwide Application Security Project) list, including command injection, XSS (cross-site scripting, where malicious code is injected into web pages viewed by other users), and SQL injection. This is instruction-level defence, reinforced by code review in PRs.

**Periodic practices:**

- **Pen test reports**: produced as part of security-focused cards. These assess the full attack surface: public endpoints, authentication flows, authorisation boundaries, data exposure, infrastructure access.
- **Vulnerability resolution**: surfaced vulnerabilities get cards, go through the workflow, and have explicit acceptance criteria. "Vulnerability exists but no fix available" is documented and blocked, not ignored.

**What agents test:**

- Authentication and authorisation boundaries (can user A access user B's data?)
- API endpoints (are all routes behind appropriate auth middleware?)
- Input validation (are user inputs sanitised before database queries or rendering?)
- Secret exposure (does any code path, log, or error message leak credentials?)
- Infrastructure (are ports, services, and firewall rules as expected?)

## Prompt injection awareness

Prompt injection is not a solved problem. No amount of system prompt hardening eliminates the risk of a model being manipulated by crafted input.

The [OpenClaw security model](https://docs.openclaw.ai/gateway/security) puts it well: prompt injection mitigations are not about preventing injection; they're about reducing blast radius.

**Practical measures:**

- **Scope tools tightly.** An agent that can only read files and run tests has a smaller blast radius than one with full shell access.
- **Treat external content as hostile.** Web pages, emails, pasted code, attachments, and log files can all carry injection payloads. Even if only you message the agent, the content it reads is a threat surface.
- **Model choice matters.** Larger, more recent models are more resistant to instruction hijacking. If using smaller models (for cost or latency), reduce their tool access.
- **Sandbox where possible.** OpenClaw supports Docker-based sandboxing per agent. Claude Code's permission model restricts tool access. Use both.
- **Secrets out of reach.** Don't put secrets in agent system prompts. Don't put secrets in files agents routinely read. Use `pass` or an equivalent, and let agents retrieve at runtime only when needed.

## Security checklist

For anyone adapting this blueprint, a minimum-viable security posture:

### Network
- [ ] Agent infrastructure on isolated network segment (guest VLAN, DMZ)
- [ ] No ports opened on the router; inbound via tunnel only
- [ ] Firewall configured and tested from outside the segment
- [ ] Docker `DOCKER-USER` chain audited if using published ports
- [ ] Unnecessary network interfaces disabled (WiFi AP, Bluetooth)

### Secrets
- [ ] Encrypted secrets manager as single source of truth
- [ ] `.env` files are gitignored and treated as runtime artefacts
- [ ] Every agent's system prompt includes "never display secrets"
- [ ] Pre-push scan for hardcoded secret patterns
- [ ] Pre/post-output blocking hook installed (see "Post-output blocking hook" section above for liftable code)
- [ ] Compaction resilience hooks installed (PreCompact re-injection + PostCompact verification)
- [ ] Critical rules section at the top of agent instructions, delimited for programmatic extraction
- [ ] Flow nudge hook installed and tuned (interval, messages, logging)
- [ ] Secret rotation procedure documented and tested

### Agent boundaries
- [ ] Autonomy boundaries explicitly documented (can/should confirm/must not)
- [ ] Agents scoped to project directories, not home directory
- [ ] Deployment requires human confirmation
- [ ] Destructive operations (delete, force push) require human confirmation

### Compliance
- [ ] RLS on all multi-tenant database tables
- [ ] Data deletion tested end-to-end
- [ ] Data export capability exists
- [ ] All external communication over TLS
- [ ] Asset registers (SAM, hardware) maintained and current

### Code quality
- [ ] Fail-first TDD enforced (tests must fail before implementation)
- [ ] CI pipeline runs on every PR; merge blocked until green
- [ ] Pre-push security scan integrated into workflow
- [ ] Dependency vulnerabilities tracked as board cards
- [ ] Pen test reports produced for security-sensitive changes

### Monitoring
- [ ] External uptime monitoring for all public services
- [ ] Health check endpoints on all self-hosted services
- [ ] Alerting configured for downtime and anomalies
