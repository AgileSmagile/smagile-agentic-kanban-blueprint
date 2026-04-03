# The Human in the System

## The temptation

You've set up the board, written the guidelines, given the agents autonomy. They're pulling work, shipping code, updating cards. It's working. The temptation is to step back entirely and let the system run.

Don't.

AI agents are capable, fast, and tireless. They are also incapable of caring about your business, your users, or your reputation. They optimise for the instructions you gave them. If your instructions are incomplete, they'll fill the gaps with reasonable-sounding decisions that may not serve your actual goals. If your priorities shift and you don't update the board, they'll keep delivering the old priorities with impressive efficiency.

The system works *because* a human is in it, not despite one.

## What only you can do

### Set direction

Agents execute. You decide *what's worth executing*. Which initiative matters most this quarter? Which feature serves users vs. which one is technically interesting but commercially irrelevant? Which market signal should change the plan?

These are judgement calls that require context agents don't have: your financial position, your competitive landscape, your conversations with customers, your gut feeling about where the market is going. No amount of knowledge system or board discipline replaces this.

**What happens if you don't:** agents deliver a technically excellent backlog that nobody wants. Work is finished but value isn't created.

### Prioritise the backlog

The board tells agents *what* to work on. You decide *what order*. Initiative priority, card ordering in Ready, and which cards get created in the first place are all human decisions.

Agents can suggest ("this card is blocking three others; consider prioritising it"), but the final ordering is yours. You're the one who knows which customer is waiting, which deadline is real, and which dependency is about to shift.

**What happens if you don't:** agents pull whatever is oldest or most obvious. Important-but-not-urgent work rots. Urgent-but-invisible work never gets created.

### Write acceptance criteria

"Done when" on a card is a product decision, not a technical one. What does "good" look like for this feature? What's the minimum that serves users? What's out of scope?

Agents can write implementation plans, but they can't decide whether the output is *right*. That's your job. A card with vague acceptance criteria gets vague results.

**What happens if you don't:** agents deliver something that passes tests but doesn't solve the user's problem. You rework it, wasting both your time and the agent's context.

### Review what matters

Not everything needs your review. Technical implementation, bug fixes, infrastructure changes, refactoring: these can ship directly if the tests pass and the build is clean.

But user-facing changes do need your eyes. UI/UX decisions, copy, pricing, onboarding flows, anything a customer will see or experience. Not because agents can't make reasonable choices, but because "reasonable" isn't always "right" for your brand, your market, or your users.

The trap is reviewing everything (bottleneck) or reviewing nothing (drift). Be deliberate about which category each piece of work falls into.

**What happens if you don't:** either you become the bottleneck and WIP ages while cards wait for your review, or you ship work that doesn't represent your product well and erode trust with users.

### Validate the product, not just the code

Agents can tell you the build passes, the tests are green, and the deployment succeeded. They cannot tell you whether the feature is *good*. Whether it solves the problem it was meant to solve. Whether users will understand it. Whether it fits with the rest of the product.

Use the product regularly. Click through the flows. Read the copy. Try to break it. Your agents are building what you asked for; your job is to confirm that what you asked for is what's actually needed.

**What happens if you don't:** the product becomes technically sound but experientially poor. Bugs that only surface through real use accumulate. The gap between what's built and what's needed widens silently.

### Manage risk and compliance

GDPR obligations, data protection, financial compliance, legal exposure: these are your responsibilities as a business owner. Agents can implement technical controls (encryption, access control, data deletion endpoints), but they cannot assess whether your overall approach meets your legal obligations.

If you collect personal data, you need a privacy policy, a data processing register, and a process for handling subject access requests. If you process payments, you need PCI compliance. If you use AI to process personal data, you may need a Data Protection Impact Assessment.

Agents can help you build and document these things. They cannot decide whether you've done enough. That's a legal and ethical judgement that sits with you.

**What happens if you don't:** you discover compliance gaps when a regulator asks, not before. Technical controls exist but procedural obligations are unmet. The cost of remediation is orders of magnitude higher than prevention.

### Maintain relationships

Agents can draft outreach, update CRM records, and generate content. They cannot build trust. Your clients, partners, and community relationships require a human who shows up, listens, and responds with genuine understanding.

Use agents to handle the preparation (research, drafting, data gathering) so you can spend your time on the conversation itself, not the admin around it.

**What happens if you don't:** relationships become transactional. People notice when they're talking to a system, even if the system is polite and competent. Trust erodes.

## How to be a good product owner to AI agents

### Be present, not hovering

Check in at natural points: session start, session end, when cards move to review. Don't watch every file edit or command execution. The agents are designed to work autonomously between checkpoints.

### Keep the board honest

If priorities change, move the cards. If a piece of work is no longer needed, close the card with a reason. If something is blocked on you, acknowledge it. The board only works as a source of truth if you keep it true.

### Process Done and Validation promptly

Cards in Done are waiting for your review. Cards in Validation/Rework are waiting for your judgement. Every day those cards sit there, they accumulate WIP age, block downstream capacity, and signal to the system that the human is the bottleneck.

You don't need to review everything immediately, but you do need a rhythm. Daily is ideal. Every other day is workable. Weekly means your agents spend half their time blocked.

### Give feedback, not just approvals

When you review work, say *why* something is wrong, not just that it is. "This copy doesn't match our voice" is less useful than "This copy is too formal; we're casual and direct, closer to how I'd explain it to a friend." The agent can't learn your preferences from a rejection; it learns from the reasoning behind it.

### Write things down

If you make a decision in your head but don't update the board or the guidelines, agents won't know about it. This is the hardest habit to build: externalising decisions that feel obvious to you but are invisible to a system that starts fresh every session.

When you catch yourself thinking "they should know that," ask: where is it written? If it's nowhere, write it. The board, the CLAUDE.md, the knowledge system, a card comment: anywhere persistent is better than your head.

### Accept that you are the constraint

In an agentic system, the human is almost always the bottleneck. Not because you're slow, but because you're the only one who can do certain things (set direction, validate product, manage compliance, maintain relationships). The system is designed to maximise what agents can do without you, so that your limited time is spent on the things only you can do.

If you find agents are frequently blocked waiting for you, that's a signal. Either you're reviewing things that could ship directly, or you haven't delegated enough context into the board and guidelines. Both are fixable.

## How to brief agents: specificity scales with certainty

The quality of what agents deliver depends on how you ask. The right approach changes depending on how well you understand what you want.

### When you know what you want: be as specific as possible

If the solution is clear in your head, describe it precisely. Name the files, the functions, the behaviour, the edge cases. Agents execute specific instructions extremely well. Vagueness when you have clarity just introduces unnecessary interpretation.

```
What: Add a 7-day trial expiry banner to the app layout.
Where: src/app/(app)/layout.tsx, using the existing SubscriptionProvider context.
Behaviour: Show a dismissible amber banner when trial has <=7 days remaining.
  Hide after dismissal for 24 hours (localStorage). Don't show to paid users.
Done when: Banner appears for trial users approaching expiry, dismisses correctly,
  doesn't render for paid subscriptions.
```

### When you don't know what you want: describe the problem, not the solution

If you're exploring, resist the urge to prescribe an approach. State the problem clearly, explain why it matters, describe the desired outcome, and let the agent propose solutions. Crucially, avoid anchoring on assumed constraints. If you say "build it as a React component," the agent will build a React component even if a simpler approach exists.

```
Problem: Users upload a CV but get no feedback for 10-20 seconds while
  the AI processes it. Some think the app is broken and navigate away.
Why it matters: We lose users at the point of highest intent.
Desired outcome: The user feels confident something is happening and
  stays on the page until processing completes.
```

No mention of skeletons, spinners, progress bars, or specific components. The agent might propose something better than what you'd have prescribed.

### As clarity emerges: abandon the POC and rebuild with specifics

Exploration produces understanding, not production code. When the picture becomes clear through iteration, don't try to polish the prototype. Start a new card with specific instructions based on what you learned. The POC served its purpose; building production work on top of exploratory code compounds technical debt.

This is counterintuitive because throwing away working code feels wasteful. It isn't. The POC's value was the learning, not the implementation. A clean rebuild with clear specs takes a fraction of the time and produces something maintainable.

```
First card (exploratory):
  "Problem: we need a way to show users their application status.
   Desired outcome: users can see where each application stands
   without asking us."

Second card (specific, after learning):
  "Build a status timeline component at src/components/StatusTimeline.tsx.
   Vertical layout, 4 states: Submitted, Reviewed, Shortlisted, Outcome.
   Each state shows date and optional note. Grey for future states,
   green for completed. Use the existing design tokens for colours."
```

## Working effectively with agents

### Think from their perspective

Agents start every session with a finite context window and no memory of previous conversations. Put yourself in that position: you've just woken up, someone hands you a document and says "go." What would you need to know? What would confuse you? What assumptions would you make that might be wrong?

This empathy makes you better at writing cards, CLAUDE.md files, and guidelines. A card that makes sense to you (because you have months of context) might be incomprehensible to an agent reading it cold. The test is always: could a fresh agent pick this up and deliver something correct?

### Respect the context window

Agents have a finite amount of information they can hold at once. When the context fills up, older content gets compressed or dropped. This has practical implications:

- **Don't batch unrelated requests into one session.** "Fix the login bug, then redesign the dashboard, then update the deployment scripts" forces the agent to hold three unrelated problem spaces simultaneously. Each one dilutes the context available for the others. One card per session (or a few closely related cards) produces better results.
- **Front-load the important information.** If you're giving a complex brief, put the critical constraints first. Information at the start of a conversation is more reliably retained than information buried in the middle of a long exchange.
- **Let compaction work for you, not against you.** Long sessions compress earlier messages. If you said something important 200 messages ago, don't assume the agent still has it. Restate key constraints when they become relevant again, or better yet, put them in CLAUDE.md where they're always loaded fresh.

### Make time for retrospectives

Don't just run sessions; reflect on how they went. Ask your agents directly: "What worked well in this session? What was unclear? What would have made your job easier?" They'll give you honest answers about card quality, missing context, unclear acceptance criteria, and process friction.

Use your flow data to see the system's health. WIP age trends, throughput, time in each column: these tell you whether the system is improving or degrading. This data lives one level above the day-to-day work, which is exactly where the PO should be looking.

Share what's working, not just what needs fixing. If you only surface problems, agents (and the feedback memories that persist across sessions) develop an overly cautious posture. Confirming that an approach worked is as valuable as correcting one that didn't.

### Use agents to check each other's work

Build a plan with one agent, then ask a different agent to peer review it. The second agent has no sunk cost in the plan and will challenge assumptions the first agent anchored on. This is especially valuable for architectural decisions, product strategy, and anything with long-term consequences.

This works because each agent session is independent. The reviewing agent isn't trying to be polite to the agent that wrote the plan. It's evaluating the plan on its merits.

### Remind agents to check the product vision for new features

When an agent is about to design or build a genuinely new feature, remind it to read the product vision first. This doesn't need to happen for every card; bug fixes, refactoring, and incremental work within established patterns don't need a vision check. But when the work introduces a new capability or changes how users interact with the product, the vision keeps it aligned.

The vision should be stable enough that agents rarely need to re-read it within a single session. If you find yourself constantly redirecting agents back to the vision, either the vision isn't clear enough or the cards aren't carrying enough context.

### Use images and voice

You can communicate with agents using more than text:

- **Images**: Claude Code's CLI doesn't support paste, but you can drag and drop saved files (screenshots, mockups, diagrams, whiteboard photos) directly into the conversation. A screenshot of "this is what's broken" or a sketch of "this is roughly what I want" communicates faster than a paragraph of description.
- **Voice**: Claude Code supports `/voice` for dictating instead of typing. Useful when you're thinking out loud, describing a complex flow, or briefing an agent while away from the keyboard.

### Match the model to the task

Not every task needs your most powerful (and most expensive) model. Claude Code lets you switch models mid-session with `/model` (use left/right arrow keys to select):

- **Opus with high effort**: complex reasoning, architectural decisions, multi-step planning, nuanced product decisions
- **Sonnet with medium effort**: standard feature work, bug fixes, code review, most day-to-day delivery
- **Haiku**: simple lookups, formatting, repetitive tasks, anything where speed matters more than depth

Voice input in particular consumes a high volume of tokens. If you're dictating a long brief, consider dropping to a lighter model first and switching back up when the agent starts the substantive work.

Matching the model to the task isn't just about cost. Lighter models respond faster and are less likely to overthink straightforward problems.

## The bargain

You get extraordinary leverage: multiple AI agents delivering work in parallel, 24 hours a day, learning from session to session. In return, you commit to being a responsible owner of the system: setting direction, maintaining quality standards, honouring your legal obligations, and staying close enough to the product to catch drift before it compounds.

The agents will do what you tell them. The question is whether you're telling them the right things. That's the job.
