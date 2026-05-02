# How Do You Know It's Working?

You don't need a metrics dashboard. You need three signals and the discipline to check them.

## After 5 sessions: is the board carrying context?

Open a card that was worked on in a previous session. Read the comments. Could a fresh agent (or you, two weeks from now) understand what was done, what's remaining, and why decisions were made?

If yes, the system is working. Context is surviving session boundaries.

If no, your agents aren't writing good handoff comments. Check whether your card standards are clear enough and whether the "last 60 seconds of a session" ritual (see [session-boundaries.md](session-boundaries.md)) is being followed.

**What to look for:**
- Cards with comments that explain *what was done* and *what's remaining*
- Blocked cards with specific, actionable block reasons
- Cards that a different agent picked up mid-stream and continued without asking clarifying questions

**Red flags:**
- Cards with no comments beyond the initial description
- Cards where a new agent re-asked questions that were already answered in a previous session
- Block reasons like "blocked" with no explanation

## After 10 sessions: are items finishing faster?

Look at how long cards spend in Doing. You don't need formal cycle time charts; just glance at the WIP age when you start each session. Are cards that enter Doing today finishing sooner than cards that entered Doing two weeks ago?

If yes, the system is compounding. Agents are getting better at the work because the knowledge system, card standards, and guidelines are reducing uncertainty.

If no, check two things:
1. **Card quality.** Are descriptions still vague? Agents that have to figure out what "improve the dashboard" means will always be slower than agents given specific criteria.
2. **Knowledge capture.** Are agents writing to domain files? If agents aren't writing observations after completing cards, the system isn't learning. Each session starts from the same baseline instead of building on what came before.

**What to look for:**
- WIP age trending downward (or stable at a healthy level)
- Fewer clarifying questions from agents before they start work
- Knowledge entries that reference patterns discovered in previous sessions

**Red flags:**
- WIP age trending upward with no change in card complexity
- The same correction being given to agents in multiple sessions (should have been captured as a rule)
- Domain knowledge files that haven't been updated in the last 5 sessions

## After 20 sessions: is rework decreasing?

Rework means cards that ship, get reviewed, and come back with changes needed. Some rework is healthy (product decisions that need human judgment). Excessive rework means the system isn't capturing preferences and standards effectively.

Track informally: when you review a card, did the agent get it right on the first pass? Are you giving the same feedback repeatedly ("too formal," "wrong colour scheme," "missing error handling")?

If rework is decreasing, the feedback loop is working. Agents are applying knowledge from previous sessions and your corrections are sticking.

If rework is steady or increasing, check:
1. **Are corrections being saved as feedback memories (see [glossary](getting-started.md#what-these-terms-mean)) or knowledge entries?** A correction that only exists in conversation history dies when the session ends.
2. **Are CLAUDE.md files carrying enough project-specific context?** If every agent has to rediscover your preferences, the system has a memory leak.
3. **Are you reviewing the right things?** If technical work keeps coming back with product feedback, the Done/Shipped boundary might be wrong.

**What to look for:**
- First-pass acceptance rate improving over time
- Feedback memories and rules that reference specific past corrections
- Agents proactively applying standards you taught them sessions ago

**Red flags:**
- The same feedback given three or more times across different sessions
- Agents not reading the knowledge system before starting work
- Rules file that hasn't been updated since it was seeded

## The meta-signal: are you spending less time directing and more time deciding?

The ultimate measure of a healthy agentic Kanban system is how you spend your time. Early on, you'll spend most of your time explaining what to do and how to do it. Over time, that should shift toward making product decisions, reviewing output, and setting direction.

If you're still explaining the same things after 20 sessions, something in the persistence layer (cards, knowledge, CLAUDE.md, guidelines) isn't capturing it.

If you're mostly making decisions and reviewing output, the system is working as designed: agents handle the execution, you handle the judgment.
