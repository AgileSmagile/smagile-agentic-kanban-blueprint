# Tools and Stack

Every tool here was chosen because it solved a real problem in the system. This isn't a recommendation list; it's what we actually use and why. Most have generous free tiers, so you can replicate the setup without upfront cost.

<!--
  AFFILIATE LINKS: Replace the URLs below with tracked affiliate/partner links
  where you have agreements. Mark with <!-- affiliate: partner-name --> where active.
  Tools without partnerships use direct links.
-->

---

## AI Agents

### Claude Code
<!-- affiliate: anthropic -->

**Role in the system:** The engine. Every agent (orchestrator, sub-agents, satellite workspaces) runs as a Claude Code session. The orchestrator uses Opus for complex reasoning and coordination; sub-agents typically use Sonnet for focused delivery work.

**Why this and not alternatives:** Claude Code's tool-use model (bash, file read/write, search) maps directly to software engineering workflows. The agent can read code, run tests, make commits, and interact with APIs without custom integration. The conversation context carries the full operating model.

**Free tier:** Claude Code is available with a Claude Pro subscription ($20/month) or via API usage. No free tier, but the Pro subscription includes substantial usage.

**Get started:** [claude.ai/code](https://claude.ai/code)

---

## Kanban Board

### Businessmap (formerly Kanbanize)
<!-- affiliate: businessmap -->

**Role in the system:** The single source of truth for all work. Every card, column transition, WIP limit, and blocked status lives here. Agents interact with it via the REST API through a custom CLI wrapper (see `orchestrator/bin/`). The board provides continuity across sessions: when an agent session ends, the board state persists for the next one.

**Why this and not alternatives:** Businessmap has a proper API, supports WIP limits natively, handles blocked-in-place semantics, and has a two-level workflow (initiatives + cards) that maps well to strategic and tactical planning. Most Kanban tools treat WIP limits as decorative.

**Free tier:** 14-day trial. Paid plans from ~$179/month for teams. Not cheap for a solo operator, but the API access is what makes autonomous agent interaction possible. Evaluate whether your board tool of choice has an API before committing.

**Alternatives:** Any Kanban board with a REST API works. The patterns in this repo are tool-agnostic; the CLI is Businessmap-specific but the structure is adaptable. Trello, Jira, Linear, and GitHub Projects all have APIs, though their Kanban semantics vary.

**Get started:** [businessmap.io](https://businessmap.io)

---

## Database and Auth

### Supabase
<!-- affiliate: supabase -->

**Role in the system:** Database (Postgres), authentication, and row-level security for the SaaS products. Multi-tenant by design. Agents interact with it for data queries, migrations, and monitoring.

**Why this and not alternatives:** Postgres with RLS gives you multi-tenancy without application-level security code. The hosted dashboard, built-in auth, and CLI tooling reduce infrastructure overhead. Agents can push migrations directly via the Supabase CLI.

**Free tier:** Yes. Two free projects with generous limits (500MB database, 50,000 monthly active users, 1GB storage). Enough to run a real product through early traction.

**Get started:** [supabase.com](https://supabase.com)

---

## Networking and Edge

### Cloudflare
<!-- affiliate: cloudflare -->

**Role in the system:** DNS, tunnels (exposing local/self-hosted services to the internet), Workers (serverless edge functions), and access policies. Cloudflare Tunnels are how self-hosted services (running on a Raspberry Pi, for example) get a public URL without opening firewall ports.

**Why this and not alternatives:** Tunnels solve the "I want to self-host but not expose my network" problem cleanly. The free tier is absurdly generous. Workers give you serverless compute at the edge without a cloud provider account.

**Free tier:** Yes. DNS is free. Tunnels are free. Workers have 100,000 requests/day free. Access (Zero Trust) has a free tier for up to 50 users.

**Get started:** [cloudflare.com](https://cloudflare.com)

---

## Workflow Automation

### n8n
<!-- affiliate: n8n -->

**Role in the system:** Event-driven automation between services. Examples: watching the Kanban board for changes, triggering deploys, bridging CRM data, running scheduled health checks. Self-hosted (Docker) to avoid per-execution costs.

**Why this and not alternatives:** Self-hostable, so no per-execution pricing. Visual workflow builder means non-code automations are inspectable. Webhook support makes it easy to wire into any API. The agent can import/export workflow JSON programmatically.

**Free tier:** Self-hosted is free (open source, fair-code licence). Cloud-hosted starts at $24/month.

**Get started:** [n8n.io](https://n8n.io)

---

## CRM

### Capsule CRM
<!-- affiliate: capsule -->

**Role in the system:** Contact and opportunity tracking for lead generation and outreach. Agents query it via API for prospect data and update deal stages.

**Why this and not alternatives:** Clean API, sensible data model, UK-based (GDPR-native). Doesn't try to be a marketing platform, project manager, and CRM simultaneously.

**Free tier:** Yes. Up to 250 contacts and 2 users. Enough for early-stage outreach and experimentation.

**Get started:** [capsulecrm.com](https://capsulecrm.com)

---

## Deployment

### Self-hosting (Raspberry Pi / mini PC)

**Role in the system:** Production hosting for web applications, agents, and automation. A Raspberry Pi 5 or equivalent runs Docker containers behind a Cloudflare Tunnel, providing a zero-cost compute layer after the initial hardware purchase.

**Why this and not cloud platforms:** No monthly compute costs. No commercial use restrictions. No platform lock-in. A Pi 5 (8GB, ~£115 all-in) comfortably runs a Next.js app, an AI agent, n8n, and nginx concurrently. Year 2+ cost is effectively zero (electricity only).

**When to consider this:** if you want to commercialise a product without recurring hosting costs, if you have suitable hardware available, or if you want full control over your infrastructure. Not suitable if you need global distribution, five-nines uptime, or don't want to learn Docker and networking basics.

**Get started:** [docs/hardware.md](docs/hardware.md) covers hardware options, network isolation, Docker setup, zero-downtime deploys, and a cost comparison against cloud hosting.

### Netlify
<!-- affiliate: netlify -->

**Role in the system:** Static site and serverless function hosting. Used for deploying web products and landing pages. Agents can trigger deploys via API or CLI.

**Why this and not alternatives:** Git-based deploys, preview deployments on PRs, generous free tier. Simple for static sites and Jamstack applications. **No commercial use restriction on the free tier**, unlike Vercel.

**Free tier:** Yes. 100GB bandwidth, 300 build minutes/month, 1 concurrent build. Enough for most small-to-medium sites.

**Get started:** [netlify.com](https://netlify.com)

### Vercel

**Role in the system:** Development and preview platform, particularly for Next.js applications. Preview deployments on every PR provide a pre-production smoke test.

**Why this and not alternatives:** Best-in-class Next.js support. Preview deployments are automatic.

**Commercial use warning:** The hobby (free) plan **prohibits commercial use**. If you're building a product you intend to charge for, you need the Pro plan ($20/month per team member) or a different hosting solution. This restriction drove a move to self-hosting in the production system this blueprint was extracted from. Consider Netlify (no commercial restriction on free tier) or self-hosting (see [docs/hardware.md](docs/hardware.md)) as alternatives for production workloads.

**Free tier:** Yes (hobby plan), but restricted to non-commercial use.

**Get started:** [vercel.com](https://vercel.com)

---

## Monitoring

### UptimeRobot
<!-- affiliate: uptimerobot -->

**Role in the system:** External uptime monitoring for all public-facing services. Alerts when services go down. Provides a public status page.

**Why this and not alternatives:** Dead simple. Free tier covers the basics. No infrastructure to maintain. Agents can check service status programmatically via the API.

**Free tier:** Yes. 50 monitors, 5-minute check intervals. Enough for a small portfolio of services.

**Get started:** [uptimerobot.com](https://uptimerobot.com)

---

## Communication

### Discord

**Role in the system:** Inter-agent communication channel. Agents post updates, ask questions, and coordinate via Discord bots. Also the human-agent communication layer for advisory agents that don't run in a terminal.

**Why this and not alternatives:** Bot API is well-documented, free, and supports rich interactions. Channels provide natural topic separation. Most technical communities already use it.

**Free tier:** Yes. Fully free for the features used here.

**Get started:** [discord.com](https://discord.com)

---

## Payments

### Stripe
<!-- affiliate: stripe -->

**Role in the system:** Payment processing, subscription management, and checkout flows for SaaS products. Agents can create products, generate payment links, and query charges via the API.

**Why this and not alternatives:** Industry standard. API-first design. Handles subscriptions, trials, and usage-based billing natively. Extensive documentation.

**Free tier:** No monthly fee. Transaction-based pricing (2.9% + 30p per transaction). You pay nothing until you earn something.

**Get started:** [stripe.com](https://stripe.com)

---

## Version Control and CI

### GitHub

**Role in the system:** Code hosting, pull requests, CI/CD via GitHub Actions. Agents create branches, open PRs, and monitor CI status. The branch-based workflow (no direct pushes to main) is enforced through the operating model.

**Free tier:** Yes. Unlimited public repos, 2,000 Actions minutes/month on free tier. Enough for most small teams.

**Get started:** [github.com](https://github.com)

---

## Kanban Training

### ProKanban.org

**Role in the system:** The theoretical foundation. The operating model in this repo is grounded in ProKanban's Kanban Guide. WIP limits, flow management, explicit policies, and the hypothesis-driven improvement approach all come from ProKanban principles.

**Not a tool, but worth knowing:** If you're adapting this blueprint and want to understand *why* the board works the way it does, the [Kanban Guide](https://prokanban.org/the-kanban-guide/) and [Kanban Pocket Guide](https://prokanban.org/kanban-pocket-guide/) are the references.

**Get started:** [prokanban.org](https://prokanban.org)

---

## Cost summary

For a solo operator getting started:

| Component | Monthly cost |
|-----------|-------------|
| Claude Pro (for Claude Code) | $20 |
| Hosting (self-hosted Pi 5) | ~£115 one-time, then ~£1/month electricity |
| Supabase (free tier) | $0 |
| Cloudflare (free tier) | $0 |
| n8n (self-hosted) | $0 |
| Capsule CRM (free tier) | $0 |
| Netlify (free tier) | $0 |
| UptimeRobot (free tier) | $0 |
| Discord | $0 |
| GitHub (free tier) | $0 |
| Stripe (transaction-based) | $0 until revenue |
| **Kanban board** | **$0-179+** |
| **Total (month 1)** | **~$20 + ~£115 hardware + board** |
| **Total (month 2+)** | **~$20 + board** |

The Kanban board is the variable. You can start with a free tool (Trello, GitHub Projects) and the patterns still apply. The board CLI would need adapting, but the operating model doesn't change.

Self-hosting eliminates recurring compute costs entirely after the initial hardware purchase. See [docs/hardware.md](docs/hardware.md) for the full cost comparison and setup guide. If you'd rather use cloud hosting, replace the Pi line with Vercel Pro ($20/month) or equivalent; the rest of the stack stays the same.
