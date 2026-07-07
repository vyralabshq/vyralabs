# Vyra Labs — Website Build Spec (for the coding agent)

## What to build

A single landing page for Vyra Labs. Next.js + Tailwind. One page, no routing to empty sections. The page must be honest about stage: this is an engineering lab documenting a journey toward running a validator, not a company with shipped products. Do not invent products, repos counts, metrics, or a cloud platform. If it doesn't exist yet, it isn't on the page.

Reuse the existing Vyra design system (sun/orange on warm near-black) for all color, type, and component styling. The brand brief below mentions a blue palette and Geist font; ignore those. Colors and fonts come from the existing design system, not this doc.

## Stack and constraints

- Next.js (App Router) + Tailwind CSS, same setup as the previous build.
- Single page (`app/page.tsx`), content in a separate `content.ts` so copy is easy to edit.
- No backend, no CMS. Static.
- No em-dashes anywhere in copy (use parentheses or periods).
- Mobile-responsive. Dark theme only.
- Keep it dense and engineering-first, not marketing-fluffy. Reference feel: Linear, Vercel, Rust Foundation, Cloudflare docs. Calm, precise, no hype, no Web3 clichés (no glowing cubes, hexagons, rockets, or "revolutionary").

## Design tokens (from existing Vyra design system, do not change)

- Background base `#0c0805`, surface `#140d07`, elevated `#1c1209` (warm near-black).
- Accent (sun orange) `#F77F1B`, brighter `#FFA033`. Use accent sparingly, for one or two focal elements and interactive states, not everywhere.
- Text primary `#fdf3e8`, secondary `#b89274`, muted `#6e503a`.
- Fonts: Syne (display/headings), JetBrains Mono (labels, code, mono accents). Body can be Syne or a clean sans already in the system.
- Warm radial glow behind the hero (top-center), subtle, matching the design system background treatment.
- Borders: thin, low-opacity orange (the existing border scale). Radius tokens already defined.

## Page structure (top to bottom)

1. **Nav (minimal).** Left: `vyra` wordmark (the "y" in accent, matching the design system brand mark). Right: links to GitHub, X, and an Email/contact. That's it. No fake nav items like Products or Research.

2. **Hero.**
   - A small status badge above the heading: a pulsing accent dot + mono text `STATUS: BUILDING`. (The pulse-dot component exists in the design system.)
   - Heading (display, large): **Engineering the Journey.**
   - Subheading: "From first principles to production infrastructure. Vyra documents the journey of learning distributed systems through Rust, networking, benchmarking, profiling, and validator engineering."
   - One primary button (accent): **Explore the Journey** (anchors down to the journey section). One secondary/ghost button: **Read the Journal** (can anchor to the journal section or link to GitHub/blog for now).

3. **Manifesto (short).** A quiet, centered or left-aligned block. Pull from the brief, tightened:

   > Every expert started as a beginner. The best engineers are built through curiosity, not shortcuts. Every benchmark, profiler trace, bug, and failed deployment teaches something. We document that journey openly. Vyra isn't just about building infrastructure, it's about becoming the engineers capable of building it.
   > Keep it to a few lines. Mono eyebrow label above it: `MANIFESTO`.

4. **Current Mission.** This is the honest centerpiece. A single highlighted card (use the accent card style from the design system).
   - Eyebrow: `CURRENT MISSION`
   - Title: **Dream — From Zero to Mainnet**
   - Body: "Building a production-ready Solana validator while documenting every lesson along the way. Testnet first, mainnet when the operations and economics are proven."
   - Optionally a small mono sub-line: a target or phase marker. Keep it real, no fake dates unless JK supplies one.

5. **The Journey (a vertical timeline / step list).** This replaces a "Projects" section. Show the actual learning-to-validator path as ordered steps, with the early ones marked done and later ones upcoming. Render as a clean vertical stepper (mono labels, accent dot on completed, muted on upcoming). Steps, in order:
   - Learning Rust
   - Async Rust
   - Criterion benchmarking
   - eBPF
   - Networking
   - Mini validator
   - Building the client (jito-solana, running)
   - Testnet node (upcoming)
   - Mainnet (upcoming)
     Mark through "Building the client" as done/in-progress and the last two as upcoming. Use a `DONE` / `IN PROGRESS` / `UPCOMING` mono tag per step. This is the most important section: it tells the true story and shows momentum without claiming finished products.

6. **Current Focus (a compact tag/list block).** Eyebrow `CURRENT FOCUS`. Short list, no descriptions needed:
   - Solana validator internals
   - eBPF and observability
   - Networking (QUIC, SWQoS)
   - Criterion benchmarking
   - Distributed systems
     Render as mono pills or a tight two-column list.

7. **Journal (placeholder-honest).** Eyebrow `JOURNAL`. A short intro line: "Field notes from the build. Every experiment, regression, and lesson, written like an engineer documenting discoveries (not marketing)." Then either (a) link out to the existing writing/X/GitHub, or (b) show 2-3 real entry titles if JK has them, styled as `Journal #001 — <title>`. Do NOT fabricate entries. If there are none ready, show a single honest line: "First entries coming as the testnet node goes up." Writing-style guidance for any real entries: prefer "Today we found why this benchmark regressed 12%" over "Revolutionary infrastructure."

8. **Footer (very minimal).** Links: GitHub, X, Journal, Email. Nothing else. Below the links, a permanent line in muted mono:
   `Current Mission: Dream — From Zero to Mainnet.`
   This line is deliberate: it signals to every visitor that this is chapter one of a long journey, not a finished company. Keep it.

## Mascot ("Pix" / the survey drone) — optional, low priority

The brief describes a small autonomous survey-drone companion: curious, quiet, observant, never speaking, appears occasionally (think GitHub's Octocat, not an everywhere-mascot). For this first build, do NOT make this a priority or block on it. If the agent wants a subtle touch, a tiny minimal SVG drone/instrument glyph can sit once near the hero or footer. No eyes, no anime, no cartoon. Monochrome, line-based, matches the engineering-notebook mood. If in doubt, leave it out of v1 and add later.

## Copy bank (use as-is, tighten if needed)

- One-liner: "Engineering the Journey."
- Brand sentence (for meta description / about): "Vyra is an engineering lab documenting the journey from first principles to production infrastructure, through open experiments, research, and systems engineering."
- Taglines (pick one for hero, others for meta/social): "Built Through Curiosity." / "Understanding Before Scaling." / "Learning in Public." / "Observe. Build. Repeat." / "From Zero, Forward."
- X bio (for reference, not the site): "Engineering the journey to distributed systems. Rust, Solana, networking, performance, eBPF. Building in public."

## Naming convention (for any labels on the page)

Let the `Vyra` prefix be the through-line if sub-areas are ever named: Vyra Journal, Vyra Bench, Vyra Trace, Vyra Validator. Do not invent unrelated product names. For this v1, you likely only need "Vyra" and "Vyra Journal."

## Hard rules (the honesty guardrails)

- No fake products, no "Vyra Validator" / "Vyra RPC" product cards, those go up only when they exist.
- No fabricated stats (no "20 repositories," no benchmarks dashboard, no cloud platform).
- No fake testimonials, partners, or logos.
- The page should make a visitor think "this person is early, serious, and documenting honestly," not "this is a company pretending to have shipped." That honest framing is the differentiator. Keep it.

## Acceptance check

The finished page should: load as one scrollable page, use the sun/orange-on-warm-dark design system, lead with "Engineering the Journey" + a building-status badge, center on the honest "Dream: Zero to Mainnet" mission and the real journey stepper, carry no fabricated products or metrics, and end with the permanent "Current Mission" line in the footer. Copy contains no em-dashes.
