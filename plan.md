# Vyra Labs — Landing Page Build Spec v2 (for the coding agent)

## Context for this rewrite

The previous landing page was built when the honest state was "learning, documenting a journey, nothing shipped yet." That is no longer true. Since then:

- A jito-solana v4.1.1 validator is **live and voting on Solana testnet** (identity vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg), built from source, running as a systemd service on tuned bare metal in Singapore.
- A **live metrics dashboard exists at /dashboard**, reading real node health straight from the box (finality lag, vote lag, drop rate, fork weight, epoch progress, vote credits, snapshots).
- The stated goal has been locked: a build-in-public validator-tooling lab.

So the old homepage now contradicts its own product: it says "STATUS: BUILDING, first entries coming as the testnet node goes up" while /dashboard shows a voting validator with 2.4M+ vote credits. This rewrite catches the homepage up to reality.

**The honesty rule flips direction but stays strict:** before it was "don't claim what you haven't built." Now it's "show what you HAVE built (the live validator + dashboard), and STILL don't claim what you haven't (no shipped tooling repos yet, no mainnet, no external stake)." Accuracy in both directions.

## Stack and constraints (unchanged)

- Next.js (App Router) + Tailwind, same as current build. The /dashboard route already exists and stays as-is; this spec is for the landing page (`app/page.tsx`).
- Content in a separate `content.ts` so copy is easy to edit.
- No em-dashes anywhere (parentheses or periods).
- Mobile-responsive, dark theme only.
- Engineering-first, not marketing-fluffy. Reference feel: Linear, Vercel, Cloudflare docs. Calm, precise, no hype, no Web3 clichés.

## Design tokens (from existing Vyra design system, do not change)

- Background base `#0c0805`, surface `#140d07`, elevated `#1c1209` (warm near-black).
- Accent (sun orange) `#F77F1B`, brighter `#FFA033`. Use sparingly, for focal elements and interactive/live states.
- Text primary `#fdf3e8`, secondary `#b89274`, muted `#6e503a`.
- Fonts: Syne (display/headings), JetBrains Mono (labels, code, mono accents).
- Warm radial glow behind hero (top-center), subtle.
- Green for "healthy/live" status dots is acceptable (matches the dashboard's live indicators), used only for genuine live-status signals.

## Page structure (top to bottom)

1. **Nav (minimal).** Left: `vyra` wordmark (accent "y"). Right: Dashboard, GitHub, X, Email. Dashboard is now a real, primary link (it exists), so it belongs in the nav prominently, not buried.

2. **Hero (updated to reflect live status).**
   - Status badge above heading: **replace `STATUS: BUILDING` with a live indicator.** A green pulsing dot + mono text `VALIDATOR LIVE · TESTNET`. This is now true and it is the single strongest thing you can lead with. (Keep MISSION 001 as a secondary eyebrow if desired, but the live-status badge is the headline signal.)
   - Heading (display, large): **From First Principles to Production.** (keep, it works)
   - Subheading (tighten to reflect reality): "Vyra is a build-in-public validator-tooling lab. We run a Solana validator in the open and build the tooling that keeps it healthy. Every benchmark, deployment, failure, and lesson, shared openly."
   - Primary button (accent): **See the Node** → links to /dashboard (the live dashboard is now the money shot, send people straight to it).
   - Secondary/ghost button: **Read the Journey** → anchors to the journey section.

3. **Live status strip (NEW, high priority).** A compact horizontal band directly under the hero pulling 3-4 real numbers from the dashboard data source (or a shared JSON/endpoint the dashboard already uses). Show: vote credits (lifetime), finality lag (slots), drop rate (%), epoch. Mono, understated, each with a tiny label. A small "live · updated Xs ago" marker and a link "full dashboard →". This is the proof-in-the-hero that the old page lacked. If wiring live data into the landing page is non-trivial for v1, it is acceptable to link prominently to /dashboard instead and add the inline strip in a follow-up, but the live link must be unmissable.

4. **Manifesto (keep, lightly tightened).** Mono eyebrow `MANIFESTO`. The current four-line version reads well:

   > Every expert started somewhere.
   > Great infrastructure engineers aren't built through shortcuts.
   > They're built through curiosity, benchmarks, profiling sessions, failed deployments, and iteration.
   > Vyra documents that journey publicly.

5. **Current Mission (keep, update phase).** Accent card. Eyebrow `MISSION 001`. Title **Dream** / subtitle "From Zero to Mainnet". Body: "Building a production-ready Solana validator while documenting every lesson along the way. Testnet first, mainnet when the operations and economics are proven." **Update the phase marker** from `PHASE: TESTNET PREP` to `PHASE: TESTNET LIVE` (it is live now, prep is done).

6. **The Journey (vertical stepper, update statuses).** Same stepper concept, but the statuses move forward to match reality. Steps in order with updated tags:
   - Learning Rust — DONE
   - Async Rust — DONE
   - Criterion benchmarking — DONE
   - eBPF — DONE
   - Networking — DONE
   - Mini validator — DONE
   - Building the client (jito-solana from source) — DONE
   - **Testnet node, live and voting — DONE / LIVE** (this was "upcoming"; it is now real, this is the big status change)
   - Open-source operator tooling (dashboard live, more in progress) — IN PROGRESS
   - Mainnet — UPCOMING
     Use `DONE` / `LIVE` / `IN PROGRESS` / `UPCOMING` mono tags. The stepper now shows a validator that actually got stood up, not a plan.

7. **What's Next (keep the two-card layout, update).** Testnet card → flip from "TARGET: JULY 2026 / upcoming" to "LIVE · voting on testnet" with a link to the dashboard. Mainnet card → keep as UPCOMING, "pending delegation program approval, mainnet when operations and economics are proven."

8. **Current Focus (keep).** Eyebrow `CURRENT FOCUS`. Mono pills: Solana validator internals, eBPF and observability, Networking (QUIC, SWQoS), Validator devops and client maintenance, Distributed systems.

9. **Journal (keep honest).** Eyebrow `JOURNAL`. Intro line stays. **Update the placeholder:** the old "First entries coming as the testnet node goes up" is now stale (the node is up). Replace with either real entry titles if available (styled `Journal #001 — <title>`), or an honest current line like "Field notes from the build, starting with the from-scratch testnet bring-up." Do NOT fabricate entries. The first real entry is obvious and should be written: the from-scratch build (io_uring kernel wall, libclang/bindgen gauntlet, two-disk I/O split, first vote at latency 1).

10. **Footer (minimal, keep).** Links: Dashboard, GitHub, X, Journal, Email. Permanent muted mono line: `Current Mission: Dream (From Zero to Mainnet).`

## Hard rules (updated honesty guardrails)

- DO show the live validator and the live dashboard prominently. They are real. The old page under-claimed; fix that.
- DO NOT claim shipped tooling that isn't public yet. The dashboard is live and can be shown. driftwatch, the XDP firewall, and the staking page are NOT shipped, so no product cards for them. "In progress" framing only.
- DO NOT fabricate: no external stake numbers (self-stake is 0 / not applicable on testnet), no SFDP delegation (not yet approved), no fake repos count, no partners/testimonials.
- Stake on the dashboard shows 0 / testnet config, that is honest and fine; do not dress it up.
- No em-dashes.

## The one-liner (use identically everywhere: site, X bio, Discord, GitHub org)

> Build-in-public validator-tooling lab. We run a Solana validator in the open and ship open-source operator tooling, proven on our own node.

## Acceptance check

The finished page should: load as one scrollable page on the existing design system; lead with a LIVE validator status badge (not "building"); prominently link to /dashboard as the primary CTA; show the journey stepper with the testnet node marked DONE/LIVE; keep the honest Mission and Mainnet-upcoming framing; carry no fabricated tooling/stats/stake; and match the live reality shown at /dashboard. No em-dashes.

## What changed from v1 (summary for the agent)

The site was written pre-launch and is now behind reality. The single theme of this rewrite: **the node is live and the dashboard is real, so the homepage must stop saying "building/coming soon" and start showing the running validator, while still not overclaiming tooling that hasn't shipped.**
