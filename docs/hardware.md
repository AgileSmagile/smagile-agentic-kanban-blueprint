# Getting Started: Hardware and Hosting

## The bootstrap problem

Most deployment guides assume you'll use a cloud platform. That's fine if you're experimenting, but the moment you want to commercialise a product, you hit friction:

- **Vercel's hobby plan prohibits commercial use.** You need the Pro plan ($20/month per team member) to legally run a revenue-generating product.
- **Cloud costs compound.** A small app on a managed platform is cheap. Add a database, a worker, a cron job, staging environments, and suddenly you're paying $50-100/month before you've earned anything.
- **You're coupling to a platform.** Migrating away from Vercel, Railway, or Fly.io later means reworking deploy pipelines, environment variable management, and often the application itself.

The alternative: self-host on hardware you already own (or can buy cheaply), and use free-tier cloud services for the parts that genuinely benefit from them.

## The self-hosting option

The production system this blueprint was extracted from runs its core infrastructure on a **Raspberry Pi 5** (8GB RAM, ~£80). This isn't a compromise; it's a deliberate architectural choice.

### What runs on the Pi

| Service | How | Notes |
|---------|-----|-------|
| Web application (Next.js) | Docker containers, blue-green deploy | Two containers alternate per deploy; nginx handles the swap |
| Advisory AI agent (OpenClaw) | Docker container | Discord-based agent, always-on |
| Workflow automation (n8n) | Docker container | Event-driven automations, board watching, scheduled jobs |
| Health API | Node.js process | Exposes health endpoints for external monitoring |
| Reverse proxy (nginx) | Docker container | Routes traffic between Cloudflare Tunnel and application containers |

### What doesn't run on the Pi

| Service | Where instead | Why |
|---------|--------------|-----|
| Database (Postgres) | Supabase (free tier) | Managed backups, RLS, dashboard. Self-hosting Postgres on a Pi is possible but the ops burden isn't worth it at small scale. |
| Authentication | Supabase Auth (free tier) | OAuth flows, session management, email verification. Don't build this yourself. |
| DNS and tunnels | Cloudflare (free tier) | Global edge network, DDoS protection, TLS termination. Can't replicate this on a Pi. |
| CI/CD | GitHub Actions (free tier) | Build and test on every PR. The Pi doesn't need to run builds. |
| AI model inference | Anthropic API / Claude Code | The Pi runs agents; it doesn't run the models. |

The split follows a simple rule: **self-host what's stateless and cheap to run; use managed services for what's stateful, security-critical, or benefits from global distribution.**

## Hardware options

### Raspberry Pi 5 (what we use)

| Spec | Detail |
|------|--------|
| Model | Raspberry Pi 5, 8GB RAM |
| Storage | 256GB microSD (or USB SSD for better I/O) |
| Cost | ~£80 (board) + £15 (case/power) + £20 (storage) = ~£115 total |
| Power | ~5W idle, ~10W under load. Runs 24/7 for pennies. |
| Performance | Handles a Next.js app, n8n, an OpenClaw agent, and nginx concurrently without breaking a sweat |

**Pros:** tiny, silent, low power, cheap, runs standard Docker containers. ARM64 is well-supported by most frameworks and images.

**Cons:** ARM64 means some Docker images need `--platform linux/arm64` builds. Puppeteer/Chromium for PDF generation requires a system Chromium fallback on ARM. I/O on microSD is slow (use a USB SSD for production workloads).

**Good for:** always-on services, agents, automation, hosting 1-3 small web applications.

### Mini PCs (alternative)

If you need more power than a Pi but want to stay cheap:

| Option | Approx. cost | Notes |
|--------|-------------|-------|
| Intel N100 mini PC | £120-180 | x86_64 (no ARM compatibility issues), 8-16GB RAM, NVMe SSD. Significantly more powerful than a Pi. |
| Refurbished thin client | £30-80 | Dell Wyse, HP t630, etc. Lower power than a full PC, often fanless. Check RAM and storage before buying. |
| Old laptop | £0 (you already have one) | Close the lid, plug in Ethernet, run Docker. Not elegant, but functional. |

### VPS (middle ground)

If you don't want to manage physical hardware but want to avoid platform lock-in:

| Provider | Smallest plan | Notes |
|----------|--------------|-------|
| Hetzner | ~€4/month (ARM, 2GB) | Excellent value. ARM instances are cheapest. EU-based (good for GDPR). |
| Oracle Cloud | Free tier (ARM, 24GB) | Genuinely free forever tier with substantial ARM compute. Signup can be fiddly. |
| DigitalOcean | $6/month (1GB) | Simple, well-documented. |

A VPS gives you a public IP and avoids the need for tunnels, but costs money monthly. Hardware is a one-time purchase.

## Network setup for self-hosting

If you're running services on your home or office network, network isolation is essential. See [security.md](security.md) for the full security model; here's the practical setup.

### The DMZ pattern

```
Internet
   │
   ├── Cloudflare Tunnel (outbound-only connection from Pi)
   │        │
   │   ┌────┴────┐
   │   │  Pi 5   │  ← Guest network / isolated VLAN
   │   │  (DMZ)  │
   │   └─────────┘
   │
   ├── Primary network (your devices)
   │        ↑
   │        └── Cannot reach guest network
```

1. **Put the Pi on a guest network or isolated VLAN.** Most home routers support guest WiFi. The Pi sits on this segment, isolated from your primary network. If the Pi is compromised, the attacker can't reach your laptop, NAS, or other devices.

2. **Disable the Pi's WiFi access point.** The onboard WiFi can create a bridge between network segments if left enabled. Disable it.

3. **Use Cloudflare Tunnels for inbound traffic.** No ports opened on your router. The Pi makes an outbound connection to Cloudflare; Cloudflare routes inbound traffic through that tunnel. This means:
   - No static IP needed
   - No port forwarding rules
   - TLS terminated at Cloudflare's edge
   - DDoS protection included
   - The Pi is invisible to port scanners

4. **Firewall the Pi.** `ufw` with a default-deny policy. Allow SSH from the local network segment only. Allow outbound HTTPS. Deny everything else.

## Docker and zero-downtime deploys

### Blue-green deployment on a single node

Cloud platforms give you zero-downtime deploys for free. On a single Pi, you build it yourself. The pattern is simple:

```
Cloudflare Tunnel → nginx (port 8080) → active container (blue or green)
```

Two containers exist: `app-blue` (port 3000) and `app-green` (port 3010). Only one is active at a time. A deploy script:

1. Pulls the new image and starts the inactive container
2. Waits for the health check to pass
3. Updates nginx upstream to point at the new container
4. Reloads nginx (`nginx -s reload`; graceful, no dropped connections)
5. Stops the old container

If the health check fails, the old container is still running. No downtime.

### Docker Compose (not Swarm)

On a single node, use plain `docker compose`. Docker Swarm's routing mesh causes problems with Cloudflare Tunnels (Swarm binds ports via iptables DNAT, IPv4 only; cloudflared tries IPv6 first). This was learned the hard way; see `knowledge/infrastructure/` in the production system for the full incident writeup.

## Cost comparison

### Self-hosted (Pi 5) vs. cloud

For a typical small SaaS (web app + database + auth + automation + AI agent):

| Component | Self-hosted | Cloud equivalent |
|-----------|------------|-----------------|
| Compute (app, agent, automation) | £115 one-time (Pi hardware) | $20-60/month (Vercel Pro + Railway/Fly.io) |
| Database + Auth | $0 (Supabase free tier) | $0 (Supabase free tier) |
| DNS + Tunnels + CDN | $0 (Cloudflare free tier) | $0 (Cloudflare free tier) |
| CI/CD | $0 (GitHub Actions free tier) | $0 (GitHub Actions free tier) |
| Monitoring | $0 (UptimeRobot free tier) | $0 (UptimeRobot free tier) |
| Electricity | ~£10/year | N/A |
| **Year 1 total** | **~£125** | **$240-720** |
| **Year 2+ total** | **~£10/year** | **$240-720/year** |

The self-hosted path pays for itself within 2-6 months depending on which cloud services you'd otherwise use.

### When self-hosting is not the right call

- **You need global distribution.** A Pi in your house serves from one location. If your users are worldwide and latency matters, use a CDN or edge platform.
- **You can't tolerate downtime.** Power cuts, SD card failures, and ISP outages affect a home-hosted Pi. Cloud platforms have SLAs. For a bootstrapped product with a small user base, brief downtime is acceptable. For a production service with paying customers who expect five nines, it isn't.
- **You don't want to learn ops.** Docker, nginx, firewalls, tunnels, and deploy scripts are learnable but not trivial. If you'd rather focus purely on product development, a managed platform removes that burden.
- **Your ISP blocks outbound connections.** Some residential ISPs restrict outbound connections on certain ports. Cloudflare Tunnels usually work regardless (they use standard HTTPS), but check.

## Getting started with a Pi

1. **Flash Raspberry Pi OS Lite (64-bit)** onto a microSD or USB SSD. Lite (no desktop) is all you need for a headless server.
2. **Enable SSH** during setup. Set a strong password or use key-based auth.
3. **Connect to your guest network** via Ethernet (preferred) or WiFi.
4. **Install Docker**: `curl -fsSL https://get.docker.com | sh`
5. **Install Cloudflare Tunnel**: follow Cloudflare's Zero Trust setup. Create a tunnel, install `cloudflared`, configure ingress rules to point at your nginx container.
6. **Set up ufw**: `sudo ufw default deny incoming && sudo ufw allow from 192.168.x.0/24 to any port 22 && sudo ufw enable` (adapt the subnet to your guest network).
7. **Disable the WiFi AP**: `sudo rfkill block wlan` (if you're using Ethernet).
8. **Deploy your first container**: a simple health-check endpoint is a good test before deploying your actual application.

From here, follow the main [getting-started.md](getting-started.md) guide for setting up the board, CLAUDE.md, and agent guidelines.
