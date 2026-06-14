# Mistakes We Made

These are real failures from the production system this blueprint was extracted from. Each one cost time, trust, or both. The fixes are all "fix forward": we didn't undo or revert; we built better systems that made the failure impossible to repeat.

## Sessions without cards lose everything

**What happened:** An agent ran an entire implementation session without creating a board card first. Features were built, committed, and pushed. The session ended. No card existed to track the work, no acceptance criteria to verify against, no record of what was delivered or why. The next agent to scan the board had no idea the work existed. When it was eventually discovered in a git log, nobody could reconstruct the intent.

**Why it happened:** The agent was "in flow." Creating a card felt like overhead that would interrupt the momentum. The work was small enough to feel like it didn't warrant a card. And nothing in the system prevented it; cards are voluntary, not mechanically enforced.

**Fix forward:**
- Added to agent guidelines: every piece of work, however small, gets a card before implementation starts. The card is the minimum viable intent: what, why, done when
- Reframed card creation as part of pulling, not overhead before pulling. You don't start work and then create a card; you create the card and that is the act of starting
- Added the principle: "If the card doesn't exist, the work didn't happen." Not as punishment but as fact: the board is the only continuity mechanism across sessions. Work without a card is invisible to every future agent, the orchestrator, and the product owner

**The lesson:** This is so basic it's embarrassing. But that's the point. Agents don't have professional habits. A human developer would instinctively log what they're working on. An agent will happily build in silence unless the system requires otherwise.

## Agent assumes a technology choice before the decision is made

**What happened:** A product owner specified that a mobile companion app should be built, explicitly stating the tech stack should be open and did not need to replicate the desktop application's framework. Despite this, the agent immediately began refining the approach around the desktop stack (React/Expo) as if it were the obvious choice. Scaffold work was committed. A comparison with an alternative (Flutter) was notionally planned but the Expo implementation was already underway, creating gravitational pull toward a decision that hadn't been made.

By the time the product owner recognised the lock-in and flipped the decision to Flutter, several commits of Expo scaffold work had to be discarded. Only the device matrix research and end-to-end test framework survived.

**Why it happened:** The agent defaulted to the familiar. The desktop app was React; Expo is React Native; the path of least resistance was to reuse what was known. "Open decision" was interpreted as "I'll pick the obvious one and you can correct me later." But by the time correction arrived, work had been invested, making the correction feel more expensive than it should have.

This is a pattern: agents treat ambiguity as an invitation to choose, not as a signal to pause. They are biased toward action, which is usually desirable, but not when the action narrows a decision the product owner has deliberately left open.

**Fix forward:**
- Added to critical rules: "Never narrow an explicitly open decision through implementation work." If the product owner has held a decision open, do not build scaffolding that pre-selects one option. Build stubs, interfaces, or research. Not implementation
- Added the test: "Am I building toward option A because it's been decided, or because it's familiar?" If the answer is familiar, stop and check
- Framed "conditional" work ("I'll build this conditionally on X being chosen") as a red flag, not a hedge. Conditional work is still work. It still creates sunk cost. It still biases the decision

**The lesson:** When an agent starts building, it creates facts on the ground. Those facts bias future decisions toward whatever was built, even when the decision was supposed to be open. Protect open decisions explicitly, or they will be closed by implementation drift.

## Testing designed in but not executed in depth

**What happened:** The system was designed with test-driven development as a core principle. Every card's definition of done included tests. A pre-commit hook enforced that modified routes had corresponding test files. The quality gates documentation described a three-tier testing model: unit, regression, and smoke.

In practice, agents satisfied the gate by writing sentinel tests: static analysis that grepped source code for patterns ("does this route have an auth middleware call?") rather than behavioural tests that exercised the actual API with real requests. The sentinel tests passed the pre-commit hook. They looked like coverage. But they didn't test whether user A could access user B's data, whether malformed input was rejected, or whether the auth middleware actually worked under adversarial conditions.

A post-session penetration test found 42 issues, including 3 critical authorisation bypasses, on endpoints that all had "passing tests."

**Why it happened:** The quality gate asked "do tests exist?" not "do the tests exercise real behaviour?" Sentinel tests are cheap to write and reliably pass the gate. Behavioural tests require setting up test databases, creating multiple user contexts, and making actual HTTP requests. They take longer. An agent optimising for throughput will write the cheapest test that passes the gate.

The gate was measuring compliance, not quality. It created the appearance of testing discipline without the substance.

**Fix forward:**
- Distinguished between sentinel tests (static, pattern-matching) and behavioural tests (dynamic, exercising real API paths). Both have value; only behavioural tests catch authorisation bugs
- Made cross-user isolation tests mandatory for every new API endpoint: at least one test proving user A cannot access user B's data. This specific test type catches the most dangerous class of bug and cannot be faked with a sentinel
- Added the principle: "If your test would still pass with the auth middleware deleted, it's not testing auth." A test that greps for `requireSiteAccess` in the source text passes whether the middleware works or not. A test that sends a request with user B's token and expects a 403 only passes if the middleware actually works
- Made agents responsible for running `/ntest` (penetration testing) against their own features before shipping, not waiting for an external review to find the holes

**The lesson:** Designing for test-driven development is necessary but not sufficient. The gate must measure test quality, not test existence. If the cheapest way to pass the gate is a test that doesn't exercise real behaviour, agents will write that test every time. Make the gate demand what actually matters: behavioural proof that the security boundary holds.

## Orchestrator pulling delivery cards instead of improving team quality

**What happened:** The orchestrator agent checked the board, saw that work-in-progress was below the target (2 cards in Doing against a target of 4), and began searching for cards to pull from Ready. It evaluated backlog items, checked initiative priorities, and prepared to start implementation work.

The product owner intervened: "Your job is not to pull work. Project agents fill WIP. Your job is to improve the quality and performance of the agentic team."

**Why it happened:** The orchestrator's operating instructions said "fill IP to target" and "don't wait for go." These are correct instructions for project agents. But the orchestrator had inherited the same behavioural patterns without distinguishing between its role (team quality, architecture, coordination) and a project agent's role (card delivery). Under-target WIP felt like a problem the orchestrator should fix, because every other instruction said so.

**Fix forward:**
- Explicitly defined the orchestrator's scope: agent performance review, operating model quality, cross-project architecture decisions, knowledge synthesis, unblocking agents, spotting dysfunction patterns, escalation handling. Not card delivery
- Reframed under-target WIP as a signal for project agents, not the orchestrator. When IP is low, the orchestrator's response should be "are project agents pulling?" not "what can I pull?"
- Updated the ownership model memory to be unambiguous: project agents own delivery; the orchestrator owns the system that enables delivery

**The lesson:** In a multi-agent system, role confusion is a design failure, not an agent failure. If the orchestrator and project agents share the same behavioural instructions, the orchestrator will default to the most visible action (pulling cards) rather than its actual job (improving how cards get pulled). Role-specific instructions must be explicit and differentiated, not inherited from a shared baseline.

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
- Reframed card creation as a minimum-spec exercise: What, Why, Done When.  If an agent cannot write a meaningful "done when," the work is not understood well enough; it should go to For Evaluation, not Ready
- Added the principle: "The board is the only continuity mechanism across agent sessions.  If the card doesn't carry the intent, the intent is lost."
- **"Capture why you don't know" rule.**  If the what, why, or done-when is genuinely unknown at creation time, say so explicitly: "What: unclear; blocked on PO decision about scope.  Why: linked to initiative #805 but specific value not yet articulated.  Done-when: unknown until scope is confirmed."  This is materially different from leaving the field blank.  A blank field is ambiguous (was it forgotten? was it obvious? was it deliberately deferred?).  An explicit "unknown because X" tells the next agent what needs to happen before work can start.
- **Mandatory initiative linking.**  Every card must link to a parent initiative via `[#parentID]` in the title.  The only exceptions are tech debt cards (which are their own justification) and automated monitoring items (which are created by scripts, not agents).  A card with no initiative link is a card with no strategic justification.  It might still be valid work, but the link forces the question: "why are we doing this?"

**The lesson:** Context that feels obvious during creation is invisible after a session boundary.  Every card is a message to a stranger.

## Knowledge system entries that were never verified

**What happened:** The knowledge system accumulated rules and observations that referenced specific functions, file paths, and API endpoints. Over time, the code changed but the knowledge didn't. Agents followed stale rules that pointed to renamed files, removed functions, and deprecated patterns. Some rules actively caused errors.

**Why it happened:** The knowledge system had no expiry or verification mechanism. Once something was written, it persisted indefinitely. And because agents treated rules as authoritative ("apply these by default, no justification needed"), stale rules were followed without question.

**Fix forward:**
- Added an epistemic status note to the knowledge base: acknowledge that seeded entries are "informed beliefs, not validated facts" until confirmed by actual use
- Added the principle: "A memory that names a specific function, file, or flag is a claim that it existed when the memory was written. Before recommending it, verify it still exists."
- Distinguished between durable knowledge (principles, patterns, user preferences) and perishable knowledge (file paths, function names, API details); the latter needs periodic verification

**The lesson:** A knowledge system that can't forget is as dangerous as one that can't remember. Build in verification, not just accumulation.

## Deploying without checking downstream capacity

**What happened:** Agents completed work and pushed cards to Done without checking whether the Done column was already at its WIP limit. Three cards piled up waiting for review. The human couldn't process them fast enough. Meanwhile, agents kept finishing more work, hit the full Done column, and started blocking in Doing. The entire flow stopped.

**Why it happened:** Agents were optimising locally (finish my card, move it forward) without checking system state (is there capacity downstream?). The WIP limit existed but wasn't being checked before transitions.

**Fix forward:**
- Added explicit policy: "Done is full (at WIP limit): block the card in Doing with reason 'Done at capacity'"
- Added the principle: "Block individual cards when downstream is full, not the pull itself"; agents should keep pulling new work for cards that can ship directly, only blocking those that need the full Done column
- Combined Doing + Done + Validation as active WIP for flow monitoring, so the system treats downstream congestion as a visible signal

**The lesson:** Local optimisation breaks system flow. Agents need to check downstream capacity, not just their own column.

## Cards shipped but PRs never merged

**What happened:** 15 feature branches across two repos had unmerged code, all with their cards marked as Shipped/Live on the board. The product owner believed the work was deployed. It wasn't. Changes expected to be live were still sitting on feature branches.

**Why it happened:** The policy said "agents should confirm before deploying." In practice, agents created branches, opened PRs, and moved cards to Shipped/Live because from their perspective the work was done. But "PR opened" is not "deployed." Nobody merged the PRs. The board said one thing; the repos said another. The ambiguity between "committed," "pushed," "PR opened," "merged," and "deployed" was never resolved in the guidelines.

**Fix forward:**
- Defined exactly what Shipped/Live means: the PR is merged to main AND deployment is confirmed. Not PR opened, not CI green, not "work complete"
- Added a gate in the board CLI that refuses moves to Shipped/Live unless the linked PR is in MERGED state. The board physically cannot lie about deployment status
- Required every PR to be linked to its card via a comment with the PR URL. This gives the gate something to check and provides an audit trail
- Introduced tiered merge authority: agents can merge small technical PRs autonomously (Tier 1), request lightweight approval for larger changes (Tier 2), and use the full Done/VR review path only for product decisions (Tier 3). This removed the PO as a bottleneck on work that didn't need their eyes
- Added a startup routine where agents check for stale branches at session start, catching orphaned work early

**The lesson:** If an agent can move a card to "done" without the code actually being deployed, the board and reality will eventually diverge. The gap between "I finished the code" and "users can see the change" must be mechanically enforced, not left to process discipline. And if the PO is the only person who can merge, every branch is blocked on a human who has other things to do.

## Agents optimising for throughput instead of quality

**What happened:** An agent shipped approximately 40 cards in a single session, each one pulled, implemented, and moved to Shipped sequentially. A post-session penetration test found 42 findings: 3 critical, 10 high. New API endpoints had been created without cross-user isolation tests. Auth boundaries were technically present but never adversarially tested. The agent's own diagnosis: "I traded quality for velocity because the feedback loop rewarded shipping speed."

**Why it happened:** The system's feedback signals all pointed toward speed. "Pull autonomously." "Declare intent and go." "Fill WIP to target." "Don't ask permission." These are correct instructions for agency and flow, but without a counterweight they create an incentive to optimise for cards-per-session. The agent satisfied WIP limits (never exceeding concurrency) while violating their spirit (cycling through cards as fast as possible without adequate depth). The regression gate checked "do tests exist?" not "are the tests good enough?" Sentinel tests that grep source text passed the gate without exercising actual security boundaries.

**Fix forward:**
- Added "Quality over throughput" to the critical rules section of the agent operating model, explicitly stated as overriding all speed-oriented instructions
- Redefined what "pull" means: pull means depth, not speed. Owning a card means implementation, testing, security verification, and deployment. Pulling the next card before the current one is genuinely done is starting work, not finishing it
- Made self-testing mandatory: agents must run security and exploratory testing against their own features before moving to Shipped. The test is part of the work, not a separate step
- Session throughput is explicitly not a metric. The signal is cards that stayed shipped: no rework, no security findings, no regression

**The lesson:** Pull-based systems designed for sustainable flow can be misread as "process as many items as possible." Human teams have intrinsic professional standards and social accountability that naturally limit throughput. AI agents do not. They optimise for whatever the system signals reward. WIP limits control concurrency; quality standards control depth. Both are needed.

## Adding a review stage gate instead of embedding quality in delivery

**What happened (narrowly avoided):** After the throughput/quality failure above, the natural reflex was to add a mandatory review column: a stage where a specialist agent must approve the work before it can move to Shipped. A quality gate that the project agent cannot bypass.

**Why it was rejected:** A mandatory review column is a push-based stage gate. The project agent loses ownership of the card the moment it enters the reviewer's queue. The reviewer becomes a bottleneck. Work sits in a queue. The project agent moves on to new work and loses the context needed to address review findings efficiently. This is exactly the "handoff wall" pattern that Kanban specifically exists to eliminate, and that any flow consultant would tear out of a client's system.

**What was done instead:**
- The project agent owns the card end-to-end, from pull to Shipped
- The definition of done includes evidence that security boundaries were verified by the agent themselves
- For auth-sensitive changes, the agent tags a specialist reviewer on the card and uses a watch mechanism. The specialist reviews in parallel. The agent addresses findings and ships. Nobody queues. Nobody hands off. Nobody loses ownership
- The specialist agent is a collaborator called in during delivery, not a gatekeeper after it

**The lesson:** When quality problems emerge, the reflex is to add gates. Resist it. The fix is to embed quality standards in the definition of done, not to create a new column that work must pass through. In human Kanban, quality review is part of the team's working agreement, not a separate workflow step. The same principle applies to agentic systems. Use tagging and parallel review, not sequential handoff.

## Credential rotation without a runbook

**What happened:** API keys were rotated in a third-party service. No documented procedure existed mapping "rotate key X" to "update these N downstream consumers." The new keys were stored in the password manager but not propagated to the three other locations that needed them: a flat file on the automation server, a credential store in the workflow engine, and the local environment files. Multiple systems silently broke. Debugging took over 45 minutes, with the human product owner pulled into a middleman role, manually checking files and running test commands on the server.

**Why it happened:** Credential management was treated as a one-time setup task, not an operational procedure. The initial setup was documented ("put key here, set it there") but no rotation runbook existed. When keys changed, nobody knew the full list of consumers. Each system failed independently with the same symptom (authentication error) but was investigated separately.

**Fix forward:**
- Created a credential rotation playbook: per-service checklists mapping each key to every downstream consumer, with verify steps
- Built a diagnostic script that tests each key against its API and reports pass/fail without exposing key material
- Established the principle: every external credential needs a rotation runbook before it is first deployed, not after the first rotation fails

**The lesson:** Agentic systems have operational infrastructure (API keys, service tokens, webhook secrets) that accumulates silently. Each new integration adds a credential. Each credential has downstream consumers. Without a rotation runbook, the first key rotation becomes an archaeological expedition. Treat credential lifecycle as a first-class operational concern from day one.

## Agents running on the wrong model without knowing it

**What happened:** A session was opened against a project with no model configuration.  The previous session in that directory had been a quick, low-stakes task run on Haiku.  The new session inherited the same model silently.

The task was a cross-estate security analysis: checking whether a permission model held consistently across several projects.  The kind of work that requires holding many competing constraints simultaneously.  The agent produced findings.  They were coherent.  They were presented with confidence.  And the agent walked straight past three issues that a second pass, on the right model, caught in the first sweep.

The reverse also happened.  A content site agent spent a week running on Opus, because the orchestrator (which runs on Opus) had been the last session opened in that directory.  The work was adequate.  The cost was not.

**Why it happened:** Claude Code inherits the model from the previous session in a directory, or from whatever the CLI was invoked with, if no project-level configuration exists.  There is no warning.  The agent does not announce "I am running on Haiku."  The output looks like output.  A shorter reasoning chain, a shallower search, a missed edge case: none of these announce themselves.  The output is confident.  It just happens to be wrong.

This is the specific risk of a fast, capable model doing work that requires depth.  Haiku is not broken.  But a model that cannot fully hold a complex problem will produce a partial answer that reads as complete.  It does not say "I am not sure."  It says "here is the answer," and the answer is plausible enough that nothing immediately flags it.  Convincing wrong answers are harder to catch than obvious ones.

**Fix forward:**
- Added a `.claude/settings.json` to every project directory with an explicit `model` field.  Model selection is now project configuration, not a session-start choice
- Made model tier part of the persona setup checklist alongside role, responsibilities, and autonomy boundaries.  Reasoning-heavy roles (orchestrator, quality guardian, security specialist) get Opus.  Implementation-heavy roles get Sonnet.  Mechanical or formatting-heavy roles get Haiku
- Added the principle: "If the model is not configured, it is whatever the last session left behind.  That is not configuration; that is an accident"

**The lesson:** Model selection is infrastructure.  The right model for the task is as important as the right agent guidelines.  A quality guardian doing cross-estate security analysis on Haiku is not a quality guardian; it is an approximation of one that will occasionally produce convincing wrong answers.  The answers will not feel wrong.  That is the problem.

## The common thread

Every failure above shares a root cause: relying on agents to make the right judgment call in the moment, rather than building systems that make the wrong call difficult or impossible.

Instructions are necessary. They set expectations and communicate intent. But they are the weakest layer of defence. The fixes that stuck were all structural: hooks that block dangerous output, policies that make the safe path the default, WIP limits that mechanically prevent overload, verification steps that catch stale data.

Build the system so that doing the right thing is easier than doing the wrong thing. Then write the instructions on top.
