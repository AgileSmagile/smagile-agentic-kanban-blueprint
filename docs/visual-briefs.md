# Visual Briefs

Specifications for diagrams and visuals to accompany the blueprint. Each brief describes what the visual should communicate, where it should appear, and what it should contain. Produce in whatever tool suits the medium: Mermaid (renders natively on GitHub), Excalidraw, Figma, Canva, or screen recordings.

---

## 1. Multi-Orchestrator Architecture

**Where it goes:** README.md (hero visual), docs/architecture.md
**Content format:** LinkedIn carousel, repo diagram, talk slide
**Priority:** highest; this is the most-shared visual

**What it communicates:** Multiple orchestrators (different runtimes, different machines) sharing the same board, knowledge system, and secrets infrastructure. No single hub.

**Elements:**
- Centre: shared resource layer (Kanban board, knowledge system, secrets store, board CLI)
- Left: CC Orchestrator (local machine, terminal icon) with 2-3 sub-agents branching below it (Product Agent, Website Agent, Research Agent)
- Centre-right: Clawdius / OpenClaw orchestrator (Pi icon, Discord icon) labelled as advisory/research
- Right: Satellite workspace (terminal icon, lighter/dashed style to show it's ad-hoc)
- Top: PO (human) with lines to each orchestrator
- Arrows: bidirectional between each orchestrator and the shared resource layer; one-directional from orchestrators down to sub-agents

**Key visual cues:**
- Shared resources should be visually prominent (the centre of gravity)
- Each orchestrator should look like a peer, not a subordinate of another
- Sub-agents are clearly subordinate to their orchestrator
- Different runtimes should be visually distinct (terminal vs Discord vs dashed)

**Caption:** "Multiple orchestrators share the same board, knowledge, and secrets. No single hub. The board is the coordination layer."

---

## 2. Knowledge Promotion Cycle

**Where it goes:** docs/knowledge-system.md, README.md (inline), LinkedIn standalone
**Content format:** LinkedIn single image, repo diagram, talk slide, short video explainer
**Priority:** high; this is the most novel concept and the strongest content angle

**What it communicates:** How observations earn their way to rules through repeated confirmation, and how rules can be demoted back when contradicted.

**Elements (circular flow):**
1. **Real work** (a card being delivered) → produces an **Observation**
2. Observation written to **Knowledge** (knowledge.md)
3. If a pattern is detected → **Hypothesis** created (hypotheses.md) with evidence count starting at 0
4. Each confirmation increments the count: 1, 2, 3, 4...
5. At **5+ confirmations** → **Promoted to Rule** (rules.md, applied by default)
6. If new data contradicts → **Demoted back to Hypothesis** (requires PO approval)
7. Loop back to step 1

**Side panel or annotation:**
- Rules have three source types: seeded (expert knowledge, day-one), derived (observed), promoted (earned from hypothesis)
- The "5 confirmations" threshold prevents a single lucky observation from becoming policy

**Key visual cues:**
- Forward flow (observation → hypothesis → rule) should feel natural/easy
- Demotion path should feel deliberate/gated (PO approval icon or lock)
- The "5+" badge on the promotion step should be visually prominent
- Colour coding: knowledge = neutral, hypothesis = amber/testing, rule = green/confirmed

**Caption:** "Observations earn their way to rules. Rules earn their way back down when contradicted. The system self-corrects."

---

## 3. Before/After Session Ritual

**Where it goes:** docs/knowledge-system.md, getting-started.md
**Content format:** LinkedIn single image, talk slide
**Priority:** high; practically useful and directly actionable

**What it communicates:** The two-step ritual that makes agents smarter each session: read domain rules before starting, write observations after finishing.

**Layout:** Two-panel (before | after) or timeline

**Before panel (start of task):**
1. Read knowledge/INDEX.md → identify relevant domains
2. Read rules.md for each domain → apply by default
3. Scan hypotheses.md → can today's work test any of these?
4. Agent starts work with institutional context loaded

**After panel (end of task):**
1. What did I observe? → write to knowledge inbox
2. Did I confirm or contradict a hypothesis? → write promote/demote entry
3. Orchestrator merges inbox next session → domain files updated
4. Next agent starts smarter than this one finished

**Key visual cues:**
- Clear before/after separation
- The "inbox" as a physical mailbox or queue metaphor
- An arrow looping from "after" back to "before" showing the compounding effect
- Time arrow showing sessions accumulating

**Caption:** "30 seconds before, 60 seconds after. Every session makes the next one better."

---

## 4. Card Lifecycle

**Where it goes:** docs/architecture.md, orchestrator/agent-guidelines.md
**Content format:** repo diagram, talk slide
**Priority:** medium; important for Kanban practitioners

**What it communicates:** How cards flow through the board, with the critical insight that "Done is the exception, not the default."

**Layout:** Horizontal flow (left to right), swimlane or branching

**Columns (left to right):**
Backlog → Ready → Doing → [branch point] → Shipped/Live → Closed → (auto-archive after 14 days)

**Branch point from Doing:**
- **Default path (80%+ of cards):** Doing → Shipped/Live (technical work, no review needed)
- **Exception path:** Doing → Done (awaiting PO review) → Validation/Rework → Shipped/Live

**Annotations:**
- WIP limits on Doing (4), Done (2), Validation/Rework (3)
- "Done is full? Block in Doing with reason."
- Blocked cards: stay in current column with a visual block indicator
- WIP age arrow running along the bottom

**Key visual cues:**
- The default (direct to Shipped) path should be visually dominant/wider
- The Done/VR path should be visually secondary/narrower
- Blocked cards shown with a lock or barrier icon, staying in place
- WIP limits shown as capacity indicators on each column

**Caption:** "Most work ships directly. Done is a holding bay for product decisions, not a default destination."

---

## 5. Network DMZ / Security Layers

**Where it goes:** docs/security.md, docs/hardware.md
**Content format:** repo diagram, talk slide
**Priority:** medium; important for the security-conscious audience

**What it communicates:** How self-hosted agent infrastructure is isolated from the home/office network.

**Layout:** Layered (outside → inside) or network topology

**Elements:**
- **Internet** (cloud icon, top)
- **Cloudflare** (shield icon): TLS termination, DDoS protection, tunnel endpoint
- **Cloudflare Tunnel** (encrypted pipe, outbound-only arrow from Pi)
- **Guest network / DMZ** (isolated zone):
  - Pi 5 running: Docker containers (app, agent, n8n, nginx)
  - ufw firewall: SSH local only, outbound HTTPS only
  - WiFi AP disabled
- **Primary network** (separate zone): laptops, phones, NAS
- **Barrier** between guest and primary: no traffic can cross

**Key visual cues:**
- The Pi should be visually inside an isolated box/zone
- The tunnel arrow should clearly show outbound-only (Pi → Cloudflare, not the reverse)
- The barrier between networks should be prominent
- Primary network devices should feel "safe" / separated

**Caption:** "The Pi is on its own network. If it's compromised, the blast radius stops at the guest segment."

---

## 6. Cost Comparison

**Where it goes:** docs/hardware.md, TOOLS.md, LinkedIn standalone
**Content format:** bar chart or comparison table visual, LinkedIn single image
**Priority:** medium; strong content angle for the bootstrap audience

**What it communicates:** Self-hosted (Pi) vs cloud hosting costs over 2 years.

**Data:**

| | Year 1 | Year 2 | 2-Year Total |
|--|--------|--------|-------------|
| Self-hosted (Pi 5) | ~£160 (hardware) + ~£10 (electricity) = £170 | ~£10 | £180 |
| Cloud (Vercel Pro + basic) | ~£190 (~£16/mo x 12) | ~£190 | £380 |
| Cloud (full stack) | ~£480-700 | ~£480-700 | £960-1,400 |

**Key visual cues:**
- The self-hosted bar should be dramatically shorter after year 1
- Highlight the crossover point (month 2-6 depending on cloud tier)
- Note: "hardware pays for itself within 2-6 months"

**Caption:** "~£160 once vs. £190-700 per year. Self-hosting pays for itself fast."

---

## 7. Inbox Pattern (Multi-Agent Knowledge Contribution)

**Where it goes:** docs/knowledge-system.md, docs/cross-runtime.md
**Content format:** repo diagram, talk slide
**Priority:** lower; supports the cross-runtime story

**What it communicates:** How multiple agents (different runtimes, different sessions) all contribute to the same knowledge system through the inbox, with the orchestrator as the single merge agent.

**Layout:** Multiple agents on the left, inbox in the middle, domain files on the right

**Elements:**
- Left: CC sub-agent, Clawdius (Discord), satellite workspace (each writing a file to the inbox)
- Centre: knowledge/inbox/ directory with timestamped .md files stacking up
- Right: Orchestrator reading inbox, merging into domain files (rules.md, hypotheses.md, knowledge.md)
- Bottom: processed/ archive

**Key visual cues:**
- Multiple agents writing concurrently (no conflicts, timestamp-based naming)
- Single merge point (orchestrator)
- Arrow from processed back to "available to all agents" showing the cycle

**Caption:** "Any agent can contribute. One agent merges. No conflicts. The system learns from everyone."

---

## Production notes

**For GitHub rendering:** Mermaid diagrams render natively in GitHub markdown. Good for diagrams 1, 3, 4, 7. Add as ```mermaid code blocks in the relevant .md files.

**For LinkedIn / content:** Export as PNG or SVG from whatever tool you use. Recommended sizes: 1200x628 (link preview), 1080x1080 (square post), 1080x1350 (portrait carousel slide).

**For video / talks:** These diagrams work as progressive reveal animations. Build up each element step by step rather than showing the full diagram at once.

**Brand alignment:** replace with your own brand colours. The production system uses #117076 (primary), #75bcbe (secondary), #ffffff (white).
