# Mistakes We Made

These are real failures from the production system this blueprint was extracted from. Each one cost time, trust, or both. The fixes are all "fix forward" — we didn't undo or revert; we built better systems that made the failure impossible to repeat.

## Secrets exposed in conversation output

**What happened:** An agent read a `.env` file during debugging and printed API keys directly into the conversation. The keys had to be rotated across multiple systems and agents. Rotation took longer than the debugging would have.

**Why it happened:** The only protection was a line in the instructions saying "don't display secrets." That's the weakest form of defence. The agent was trying to be helpful by showing the full error context, and the secret was part of that context.

**Fix forward:** Architectural, not instructional.
- Moved all secrets into an encrypted password manager (`pass`), off the filesystem entirely
- Added a pre-command hook that scans every shell command for secret-shaped patterns and blocks execution before it runs
- Added a post-command hook that scans output for known key prefixes and blocks display
- Kept the instruction ("never display secrets") but stopped relying on it

**The lesson:** If a security control depends on the agent choosing to obey, it will eventually fail. Build controls that prevent the failure mechanically.

## Multiple orchestrators clobbering the same board

**What happened:** Two Claude Code sessions were opened as orchestrators against the same Kanban board. Both checked the board on startup, both pulled the same card to Doing, both started working on it. One overwrote the other's commits. Cards got moved to conflicting states.

**Why it happened:** Nothing in the system prevented it. The board had no concept of "this card is claimed by a specific session." Opening two terminals felt natural.

**Fix forward:**
- Established a clear rule: one orchestrator session per board scope at any time. Multiple orchestrators can coexist if each owns a different scope (see [architecture.md](architecture.md))
- Each orchestrator dispatches sub-agents to project directories for parallel work; the parallelism is in sub-agents, not in multiple orchestrators hitting the same cards
- Added a board-watcher that detects conflicting moves and alerts when two sessions touch the same card
- Documented the multi-orchestrator architecture for cases where parallel orchestration is genuinely needed, with each orchestrator owning a distinct area of focus

**The lesson:** AI agents will happily work in parallel on the same thing if nothing stops them. Coordination must be explicit, not assumed.

## Agents defaulting everything to Done instead of shipping directly

**What happened:** The board's Done column (waiting for human review) filled up with technical cards that didn't need review: bug fixes, refactoring, infrastructure changes. The human became the bottleneck on work that could have shipped directly. Real product decisions that genuinely needed review were buried in a queue of rubber-stamp approvals.

**Why it happened:** The policy said "move to Done if it needs review, Shipped if it doesn't." Agents treated Done as the safe default because there was no downside to asking for review. The policy was correct but the incentive was wrong.

**Fix forward:**
- Rewrote the policy to make Shipped/Live the explicit default: "Most cards should take this path"
- Made Done the documented exception: "Only use Done when the card genuinely requires the PO's product judgement"
- Added a litmus test agents apply before choosing Done: "Would shipping this without the PO seeing it first risk something they'd want to change? If no, ship it."
- Moved the two technical cards that were blocking the queue directly to Shipped/Live
- Updated feedback memory so future sessions carry the correction

**The lesson:** When a policy has a "safe" option and a "risky" option, agents will always choose safe. Make the desired behaviour the default and the exception explicit.

## Empty-description cards becoming orphans

**What happened:** An agent batch-created 7 cards with titles but no descriptions. The session ended. A new session started, read the board, and found 7 cards it couldn't act on. No context on what the work was, why it mattered, or what done looked like. The cards sat in the backlog for weeks, consuming mental overhead every time an agent scanned the board, until they were eventually deleted.

**Why it happened:** The agent was trying to be efficient by capturing ideas quickly. Titles felt sufficient in the moment because the creating agent had full context. But context doesn't survive session boundaries. Titles like "Auth improvements" and "Fix the thing James mentioned" are meaningless to a fresh agent.

**Fix forward:**
- Added to agent guidelines: "A card with an empty or stub description must never be created"
- Reframed card creation as a minimum-spec exercise: What, Why, Done When. If an agent can't write a meaningful "done when," the work isn't understood well enough — it should go to For Evaluation, not Ready
- Added the principle: "The board is the only continuity mechanism across agent sessions. If the card doesn't carry the intent, the intent is lost."

**The lesson:** Context that feels obvious during creation is invisible after a session boundary. Every card is a message to a stranger.

## Knowledge system entries that were never verified

**What happened:** The knowledge system accumulated rules and observations that referenced specific functions, file paths, and API endpoints. Over time, the code changed but the knowledge didn't. Agents followed stale rules that pointed to renamed files, removed functions, and deprecated patterns. Some rules actively caused errors.

**Why it happened:** The knowledge system had no expiry or verification mechanism. Once something was written, it persisted indefinitely. And because agents treated rules as authoritative ("apply these by default, no justification needed"), stale rules were followed without question.

**Fix forward:**
- Added an epistemic status note to the knowledge base: acknowledge that seeded entries are "informed beliefs, not validated facts" until confirmed by actual use
- Added the principle: "A memory that names a specific function, file, or flag is a claim that it existed when the memory was written. Before recommending it, verify it still exists."
- Distinguished between durable knowledge (principles, patterns, user preferences) and perishable knowledge (file paths, function names, API details) — the latter needs periodic verification

**The lesson:** A knowledge system that can't forget is as dangerous as one that can't remember. Build in verification, not just accumulation.

## Deploying without checking downstream capacity

**What happened:** Agents completed work and pushed cards to Done without checking whether the Done column was already at its WIP limit. Three cards piled up waiting for review. The human couldn't process them fast enough. Meanwhile, agents kept finishing more work, hit the full Done column, and started blocking in Doing. The entire flow stopped.

**Why it happened:** Agents were optimising locally (finish my card, move it forward) without checking system state (is there capacity downstream?). The WIP limit existed but wasn't being checked before transitions.

**Fix forward:**
- Added explicit policy: "Done is full (at WIP limit): block the card in Doing with reason 'Done at capacity'"
- Added the principle: "Block individual cards when downstream is full, not the pull itself" — agents should keep pulling new work for cards that can ship directly, only blocking those that need the full Done column
- Combined Doing + Done + Validation as active WIP for flow monitoring, so the system treats downstream congestion as a visible signal

**The lesson:** Local optimisation breaks system flow. Agents need to check downstream capacity, not just their own column.

## The common thread

Every failure above shares a root cause: relying on agents to make the right judgment call in the moment, rather than building systems that make the wrong call difficult or impossible.

Instructions are necessary. They set expectations and communicate intent. But they are the weakest layer of defence. The fixes that stuck were all structural: hooks that block dangerous output, policies that make the safe path the default, WIP limits that mechanically prevent overload, verification steps that catch stale data.

Build the system so that doing the right thing is easier than doing the wrong thing. Then write the instructions on top.
