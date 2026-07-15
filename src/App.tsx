import { useEffect, useRef, useState } from "react";
import { LazyMotion, m, useReducedMotion } from "motion/react";

// Motion ships every feature through the `motion` component. We use exactly two (animate,
// whileInView), so we take the `m` component — same API, none of the baggage — and load the
// DOM feature set as its own async chunk. It is fetched after hydration rather than sitting
// in the entry bundle a visitor waits on.
const loadMotionFeatures = () =>
  import("./motionFeatures").then((mod) => mod.default);
import { postsMeta } from "./journal/postsMeta";
import { fmtDate } from "./journal/date";
import {
  links,
  hero,
  lab,
  whatWeDo,
  mission,
  milestones,
  journal,
  footer,
} from "./content";

const container = "relative z-10 mx-auto max-w-[860px] px-6";
const eyebrow = "font-mono text-xs tracking-[0.18em] text-accent mb-[18px]";
const navLink =
  "rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const section = "scroll-mt-24 py-20";

// Status tone for the small dot + label shown on cards. Orange where it earns it, amber
// for in-progress, muted for not-yet.
const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  PUBLISHED: { dot: "bg-accent", text: "text-accent" },
  LIVE: { dot: "bg-accent", text: "text-accent" },
  "IN PROGRESS": { dot: "bg-accent-bright", text: "text-accent-bright" },
  SOON: { dot: "bg-ink-muted", text: "text-ink-tertiary" },
  UPCOMING: { dot: "bg-ink-muted", text: "text-ink-tertiary" },
};

const svg = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// One icon per "what we do" clause: read (braces), instrument (signal), measure (bars).
const ICONS = [
  () => (
    <svg {...svg}>
      <path d="M9 5C6.5 5 6.5 11 4 12c2.5 1 2.5 7 5 7" />
      <path d="M15 5c2.5 0 2.5 6 5 7-2.5 1-2.5 7-5 7" />
    </svg>
  ),
  () => (
    <svg {...svg}>
      <path d="M3 12h4l2.5-7 4 14 2.5-7H21" />
    </svg>
  ),
  () => (
    <svg {...svg}>
      <path d="M5 20V11M12 20V4M19 20V14" />
    </svg>
  ),
];

function LiveDot() {
  // Steady glowing dot (no ping animation, which read as flicker in the hero badge).
  return (
    <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgba(247,127,27,0.65)]" />
  );
}

function App() {
  // Newest note, teased on the landing page. Frontmatter only — no post bodies.
  const latest = postsMeta[0];

  // The header blends into the hero at rest and lifts into a solid bar once you leave the
  // top. Driven by an IntersectionObserver on a 1px sentinel rather than a scroll listener:
  // the crossing is reported by the browser instead of us reading scroll position on every
  // frame, so this costs nothing during scroll.
  // Motion honours the OS setting for us; we branch the transform, keeping the fade.
  const reduce = useReducedMotion();
  const [lifted, setLifted] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setLifted(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures}>
      {/* Keyboard users land here first: off-screen until focused, then jumps past the nav. */}
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-accent focus:bg-elevated focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      {/* 1px marker for the header observer: once this scrolls out of view we are off the top. */}
      <div ref={sentinel} aria-hidden="true" className="absolute top-0 h-px w-full" />

      {/* The bar blends into the hero at rest and lifts into a surface wider than the content
          column once you scroll off the top.
          The surface is a separate layer that fades and scales in; the links never move. An
          earlier cut transitioned max-width on the wrapper, which animates a layout property
          — 300ms of layout+paint on the one element pinned during scroll. Scaling a surface
          behind fixed content buys the same "it got wider" read for transform+opacity only,
          which stays on the compositor. 0.97 (not 0) per the rule that nothing appears from
          nothing. Under reduced motion it just fades: the scale is dropped, not the feedback. */}
      <header className="sticky top-0 z-30 pt-4">
        <div className="relative z-10 mx-auto max-w-[1010px] px-6">
          {/* Spring, not a fixed curve: the bar should settle like a physical surface rather
              than tick through an easing. duration/bounce per Apple-style config; bounce is
              kept low because this is a crisp tool, not a toy. `initial={false}` so it does
              not animate in on first paint — it is already in its resting state. */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 inset-y-0 origin-center rounded-xl border border-accent/15 bg-elevated/80 shadow-lg shadow-black/40 backdrop-blur-md"
            initial={false}
            animate={{
              opacity: lifted ? 1 : 0,
              scale: reduce ? 1 : lifted ? 1 : 0.97,
            }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          />
          <div className="relative mx-auto flex h-14 max-w-[812px] items-center justify-between">
            <a
              className="inline-flex items-center gap-1.5 rounded font-display text-[19px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href="#top"
              aria-label="Vyra Labs home"
            >
              <img
                className="-ml-1 h-8 w-8 object-contain mix-blend-screen"
                src="/logo.png"
                alt=""
              />
              <span>
                v<span className="text-accent">y</span>ra
              </span>
            </a>
            {/* Where you can go on this site, not where else to find us: GitHub/X live in the
                footer, which is where people look for them. */}
            <nav className="flex items-center gap-5 font-mono text-[13px] text-ink-secondary">
              <a className={navLink} href="/dashboard">
                Dashboard
              </a>
              <a className={navLink} href="/logs">
                Logs
              </a>
              <a className={navLink} href="#contact">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main id="top" className={`${container} container-lines`}>
        {/* Hero. The live validator badge leads: it is the single strongest true signal. */}
        {/* Left-aligned, like every section below it: a centered hero over left-aligned body
            copy read as two different pages. items-start (not text-center) so the badge sits
            at its own width instead of stretching.
            dvh, not vh: iOS Safari's collapsing toolbar makes 100vh taller than the real
            viewport, so the hero jumps as you scroll. */}
        <section className="flex min-h-[calc(100dvh-72px)] flex-col items-start justify-center pb-16">
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-surface px-[14px] py-1.5 text-xs tracking-[0.12em] text-ink-secondary">
            <span className="font-mono">{hero.liveBadge}</span>
          </span>
          <h1 className="mt-6.5 mb-5 max-w-[16ch] text-balance font-display text-[clamp(36px,6vw,56px)] font-bold leading-[1.06] tracking-[-0.03em]">
            {hero.heading} <span className="text-accent">{hero.headingAccent}</span>
          </h1>
          <p className="max-w-[560px] text-lg text-ink-secondary">
            {hero.subheading}
          </p>
          <div className="mt-[34px] flex flex-wrap gap-[14px]">
            <a
              className="inline-flex items-center rounded-lg border border-transparent bg-accent px-5 py-[11px] text-sm font-semibold text-[#1a0d02] transition-colors duration-100 hover:bg-accent-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href={hero.primaryCta.href}
            >
              {hero.primaryCta.label}
            </a>
            <a
              className="inline-flex items-center rounded-lg border border-accent/30 px-5 py-[11px] text-sm font-semibold text-ink transition-colors duration-100 hover:border-accent hover:text-accent-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href={hero.secondaryCta.href}
            >
              {hero.secondaryCta.label}
            </a>

          </div>

          {/* Aside under the primary CTA, curving back up at it. It sits below rather than
              beside the buttons because "See the Node" is the button it is about, and from
              the right of the row the arrow would have to reach across the second CTA to get
              there. Earns its place only because the claim is checkable: the collector writes
              a fresh snapshot every 10s, so the dashboard is the node, not a picture of one.
              Decorative — hidden from screen readers, and from narrow screens where the
              buttons wrap. */}
          <span
            aria-hidden="true"
            className="pointer-events-none ml-6 hidden select-none items-start gap-1.5 text-ink-tertiary sm:flex"
          >
            <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
              <path
                d="M31 27C18 25 7 19 4 4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M4 3.5 1.5 11M4 3.5 10 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="mt-3.5 -rotate-3 font-mono text-[11px] leading-[1.5] tracking-[0.02em] whitespace-pre-line">
              {hero.ctaNote}
            </span>
          </span>
        </section>

        {/* The lab: the stated goal, verbatim, as the resonant statement of intent. */}
        <section className={section}>
          <p className={eyebrow}>{lab.eyebrow}</p>
          <p className="max-w-[760px] font-display text-[clamp(21px,2.7vw,29px)] font-semibold leading-[1.42] tracking-[-0.01em] text-ink">
            {lab.lead} <span className="text-accent">{lab.accent}</span> {lab.rest}
          </p>
        </section>

        {/* What we do: each card is one clause of the stated goal, made concrete. */}
        <section className={section}>
          <p className={eyebrow}>{whatWeDo.eyebrow}</p>
          <h2 className="mb-8 font-display text-[30px] font-bold tracking-[-0.02em]">
            {whatWeDo.heading}
          </h2>
          {/* Asymmetric, not three equal thirds: the first clause ("read the protocol, not
              just run it") is the thesis the whole lab is named for, so it leads full-width
              and the other two split the row beneath. Equal columns gave all three the same
              weight and read as a stock feature row. Wide-and-short, not a tall 2x2 cell —
              the copy is three lines, so a tall feature cell is just a void. Same
              featured-plus-grid shape as the Field Notes index. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {whatWeDo.cards.map((card, i) => {
              const Icon = ICONS[i] ?? ICONS[0];
              const tone = STATUS_TONE[card.tag] ?? STATUS_TONE.SOON;
              const feature = i === 0;
              return (
                <m.div
                  key={card.title}
                  /* Cascade in as the row enters view instead of all three mounting at once.
                     60ms apart (the 30-80ms band), once only — a re-run on every scroll-by
                     turns a nicety into a nuisance. `-80px` margin fires it just before the
                     row is fully on screen so it never plays behind the fold. Reduced motion
                     drops the travel and keeps the fade. */
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.06,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border border-accent/12 bg-surface/70 transition-colors hover:border-accent/30 ${
                    feature ? "p-7 md:col-span-2 md:p-9" : "p-6"
                  }`}
                >
                  {/* The feature card carries the number as a watermark, the same device the
                      roadmap cards use, instead of a small label in the corner. */}
                  {feature && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-8 right-2 select-none font-display text-[140px] font-bold leading-none text-accent/[0.05]"
                    >
                      01
                    </span>
                  )}
                  <div className="relative mb-5 flex items-center justify-between">
                    <span
                      className={`flex items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent ${
                        feature ? "h-12 w-12" : "h-10 w-10"
                      }`}
                    >
                      <Icon />
                    </span>
                    {!feature && (
                      <span className="font-mono text-[11px] tracking-[0.2em] text-ink-tertiary">
                        0{i + 1}
                      </span>
                    )}
                  </div>
                  <h3
                    className={`relative mb-2.5 font-display font-bold leading-tight tracking-[-0.01em] text-ink ${
                      feature ? "max-w-[18ch] text-[clamp(24px,2.6vw,30px)]" : "text-[20px]"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`relative flex-1 leading-[1.65] text-ink-secondary ${
                      feature ? "max-w-[46ch] text-[15px]" : "text-sm"
                    }`}
                  >
                    {card.body}
                  </p>
                  <div className="relative mt-5 flex items-center gap-2 border-t border-accent/10 pt-4">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    <span className={`font-mono text-[10px] tracking-[0.12em] ${tone.text}`}>
                      {card.tag}
                    </span>
                    {card.href && (
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto font-mono text-[11px] text-accent hover:text-accent-bright"
                      >
                        read &rarr;
                      </a>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        </section>

        {/* Current Mission */}
        <section className={section}>
          {/* Tokens, not hardcoded hex: this used to bake in #1c1209, which silently drifts
              the day --color-elevated changes. */}
          <div className="rounded-xl border border-accent/30 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-accent)_7%,transparent),var(--color-elevated))] p-9">
            <p className={eyebrow}>{mission.eyebrow}</p>
            <h2 className="font-display text-[28px] font-bold tracking-[-0.02em]">
              {mission.title}
            </h2>
            <p className="mb-3 font-display text-lg text-ink-secondary">
              {mission.subtitle}
            </p>
            <p className="max-w-[560px] text-ink-secondary">{mission.body}</p>
            <p className="mt-5 inline-flex items-center gap-2 font-mono text-xs tracking-[0.12em] text-accent">
              <LiveDot />
              {mission.marker}
            </p>
          </div>
        </section>

        {/* Roadmap: two phases, testnet live and mainnet upcoming. */}
        <section className={section}>
          <p className={eyebrow}>{milestones.eyebrow}</p>
          <h2 className="mb-8 font-display text-[30px] font-bold tracking-[-0.02em]">
            {milestones.heading}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {milestones.cards.map((card) => {
              const live = card.state === "live";
              const cls = `group relative flex flex-col overflow-hidden rounded-2xl border p-7 transition-colors ${
                live ? "border-accent/40 bg-surface" : "border-accent/12 bg-surface/60"
              } ${card.href ? "hover:border-accent/70" : ""}`;
              const inner = (
                <>
                  {/* oversized phase number, filling the space as a quiet watermark */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-5 right-1 select-none font-display text-[92px] font-bold leading-none text-accent/[0.06]"
                  >
                    {card.phase.replace("PHASE ", "")}
                  </span>
                  <div className="relative flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-[0.18em] text-ink-tertiary">
                      {card.phase} · {card.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] ${
                        live ? "border-accent/40 text-accent" : "border-ink-muted/40 text-ink-tertiary"
                      }`}
                    >
                      {live && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="relative mt-6 font-display text-[24px] font-bold tracking-[-0.02em] text-ink">
                    {card.title}
                  </h3>
                  <p
                    className={`relative mt-1 mb-4 font-mono text-xs tracking-widest ${
                      live ? "text-accent" : "text-ink-tertiary"
                    }`}
                  >
                    {card.target}
                  </p>
                  <p className="relative flex-1 text-sm leading-[1.65] text-ink-secondary">
                    {card.body}
                  </p>
                  <div className="relative mt-6 border-t border-accent/10 pt-4">
                    {card.href ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-accent">
                        open dashboard
                        <span className="transition-transform group-hover:translate-x-0.5">
                          &rarr;
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-ink-tertiary">{card.note}</span>
                    )}
                  </div>
                </>
              );
              return card.href ? (
                <a key={card.label} href={card.href} className={cls}>
                  {inner}
                </a>
              ) : (
                <div key={card.label} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* Field Notes. Shows the newest note itself rather than only linking to it: the
            section used to be an eyebrow, two lines and a link, which read as unfinished
            next to every other section (and left a void above the footer). The notes are the
            proof of "built in public", so the landing page shows one. */}
        <section id="journal" className={section}>
          <p className={eyebrow}>{journal.eyebrow}</p>
          <h2 className="mb-3 max-w-[20ch] font-display text-[30px] font-bold tracking-[-0.02em]">
            {journal.heading}
          </h2>
          <p className="mb-7 max-w-[560px] text-ink-secondary">{journal.intro}</p>

          {latest && (
            <a
              href={`/logs/${latest.slug}`}
              className="group mb-6 block rounded-2xl border border-accent/12 bg-surface/70 p-6 transition-colors hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-ink-tertiary">
                  {latest.frontmatter.number != null && (
                    <span className="text-accent">
                      {String(latest.frontmatter.number).padStart(3, "0")}
                    </span>
                  )}
                  <span>{fmtDate(latest.frontmatter.date)}</span>
                  {latest.frontmatter.readingMinutes != null && (
                    <span>{latest.frontmatter.readingMinutes} min read</span>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0 font-mono text-[13px] leading-none text-ink-tertiary transition-colors group-hover:text-accent"
                >
                  ↗
                </span>
              </div>
              <h3 className="mt-2.5 max-w-[42ch] font-display text-[21px] font-bold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                {latest.frontmatter.title}
              </h3>
              {latest.frontmatter.summary && (
                <p className="mt-2 max-w-[66ch] text-[15px] leading-relaxed text-ink-secondary">
                  {latest.frontmatter.summary}
                </p>
              )}
            </a>
          )}

          <a
            className="inline-flex items-center gap-1.5 font-mono text-[13px] text-accent transition-colors hover:text-accent-bright"
            href={journal.href}
          >
            {journal.current} <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>

      {/* Three columns: who we are, where you can go, how to reach us — then a rule and the
          standing line. `id` is the Contact target in the header, so Contact scrolls here
          instead of firing a mailto the visitor never asked for. */}
      <footer id="contact" className={`${container} scroll-mt-24 mt-16 border-t border-accent/10 pt-12 pb-20`}>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <a
              className="inline-flex items-center gap-1.5 rounded font-display text-[19px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href="#top"
              aria-label="Vyra Labs home"
            >
              <img
                className="-ml-1 h-8 w-8 object-contain [mix-blend-mode:screen]"
                src="/logo.png"
                alt=""
              />
              <span>
                v<span className="text-accent">y</span>ra
              </span>
            </a>
            <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-ink-secondary">
              {footer.tagline}
            </p>
          </div>

          <div>
            <h2 className="mb-4 font-display text-[15px] font-bold text-ink">Platform</h2>
            <nav className="flex flex-col gap-2.5 font-mono text-[13px] text-ink-secondary">
              <a className={`${navLink} w-fit`} href="/dashboard">
                Dashboard
              </a>
              <a className={`${navLink} w-fit`} href="/logs">
                Logs
              </a>
              <a
                className={`${navLink} w-fit`}
                href={links.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </nav>
          </div>

          <div>
            <h2 className="mb-4 font-display text-[15px] font-bold text-ink">Get in touch</h2>
            <a
              className={`${navLink} font-mono text-[13px] break-all text-ink-secondary`}
              href={links.email}
            >
              {links.email.replace("mailto:", "")}
            </a>
            <div className="mt-4 flex items-center gap-3">
              <a
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/15 bg-surface/70 text-ink-secondary transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                href={links.x}
                target="_blank"
                rel="noreferrer"
                aria-label="Vyra Labs on X"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.5l-5.1-6.7L5.8 22H2.7l7.6-8.7L1.8 2h6.6l4.6 6.1L18.9 2Zm-1.1 18h1.7L7.3 3.7H5.5L17.8 20Z" />
                </svg>
              </a>
              <a
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/15 bg-surface/70 text-ink-secondary transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                href={links.github}
                target="_blank"
                rel="noreferrer"
                aria-label="Vyra Labs on GitHub"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                  <path d="M12 2A10 10 0 0 0 8.8 21.5c.5.1.7-.2.7-.5v-1.7C6.7 19.9 6.1 18 6.1 18c-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-accent/10 pt-6">
          <p className="font-mono text-xs tracking-[0.06em] text-ink-tertiary">
            {footer.missionLine}
          </p>
        </div>
      </footer>
    </LazyMotion>
  );
}

export default App;
