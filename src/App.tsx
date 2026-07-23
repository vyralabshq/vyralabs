import { useEffect, useRef, useState } from "react";
import { LazyMotion, m, useReducedMotion } from "motion/react";

const loadMotionFeatures = () =>
  import("./motionFeatures").then((mod) => mod.default);
import { postsMeta } from "./journal/postsMeta";
import { fmtDate } from "./journal/date";
import { links, hero, workstreams, milestones, journal, footer } from "./content";

// One content measure site-wide (header surface is slightly wider for the lift bar only).
const measure = "mx-auto w-full max-w-[880px] px-6";
const eyebrow =
  "font-mono text-[11px] tracking-[0.2em] text-accent mb-4";
const navLink =
  "rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const section = "scroll-mt-24 py-16 md:py-20";

const TONE: Record<string, { dot: string; text: string }> = {
  live: { dot: "bg-accent", text: "text-accent" },
  progress: { dot: "bg-accent-bright", text: "text-accent-bright" },
  soon: { dot: "bg-ink-muted", text: "text-ink-tertiary" },
};

function LiveDot() {
  return (
    <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgba(232,120,32,0.65)]" />
  );
}

function Wordmark({ size = "md" }: { size?: "md" | "sm" }) {
  const img = size === "md" ? "h-8 w-8 -ml-1" : "h-7 w-7 -ml-0.5";
  const type = size === "md" ? "text-[19px]" : "text-[17px]";
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-bold tracking-tight ${type}`}>
      <img
        className={`${img} object-contain mix-blend-screen`}
        src="/logo.png"
        alt=""
      />
      <span>
        v<span className="text-accent">y</span>ra
      </span>
    </span>
  );
}

function App() {
  const latest = postsMeta[0];
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
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-accent focus:bg-elevated focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />
      <div ref={sentinel} aria-hidden="true" className="absolute top-0 h-px w-full" />

      <header className="sticky top-0 z-30 pt-4">
        <div className={`relative z-10 ${measure}`}>
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 inset-y-0 origin-center rounded-xl border border-cream/10 bg-elevated/85 shadow-lg shadow-black/40 backdrop-blur-md"
            initial={false}
            animate={{
              opacity: lifted ? 1 : 0,
              scale: reduce ? 1 : lifted ? 1 : 0.97,
            }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          />
          <div className="relative flex h-14 items-center justify-between px-1">
            <a
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href="#top"
              aria-label="Vyra Labs home"
            >
              <Wordmark />
            </a>
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

      <main id="top" className={`relative z-10 ${measure}`}>
        {/* 1. HERO — rails only here */}
        <section className="flex min-h-[calc(100dvh-88px)] flex-col items-start justify-center pb-20 pt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-cream/15 bg-surface/80 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] text-ink-secondary">
            <LiveDot />
            {hero.liveBadge}
          </span>
          <h1 className="mt-7 mb-5 max-w-[15ch] text-balance font-display text-[clamp(40px,6.5vw,60px)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
            {hero.heading}{" "}
            <span className="text-accent">{hero.headingAccent}</span>
          </h1>
          <p className="max-w-[34rem] font-text text-[17px] leading-[1.65] text-ink-secondary">
            {hero.subheading}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#1a0d02] transition-colors duration-100 hover:bg-accent-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href={hero.primaryCta.href}
            >
              {hero.primaryCta.label}
            </a>
            <a
              className="inline-flex items-center rounded-lg border border-cream/18 px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-100 hover:border-accent/50 hover:text-accent-bright active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href={hero.secondaryCta.href}
            >
              {hero.secondaryCta.label}
            </a>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none ml-5 mt-1 hidden select-none items-start gap-1.5 text-ink-tertiary sm:flex"
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

        {/* 2. FIELD NOTES — proof first */}
        <section id="journal" className={section}>
          <p className={eyebrow}>{journal.eyebrow}</p>
          <h2 className="mb-3 max-w-[18ch] font-display text-[clamp(26px,3.2vw,34px)] font-bold tracking-[-0.025em] text-ink">
            {journal.heading}
          </h2>
          <p className="mb-8 max-w-[32rem] font-text text-[15px] leading-relaxed text-ink-secondary">
            {journal.intro}
          </p>

          {latest && (
            <a
              href={`/logs/${latest.slug}`}
              className="group mb-6 block rounded-2xl border border-cream/12 bg-surface/80 p-6 transition-colors hover:border-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:p-7"
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
              <h3 className="mt-3 max-w-[40ch] font-display text-[clamp(18px,2.2vw,22px)] font-bold leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-accent">
                {latest.frontmatter.title}
              </h3>
              {latest.frontmatter.summary && (
                <p className="mt-2.5 max-w-[62ch] font-text text-[15px] leading-relaxed text-ink-secondary">
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

        {/* 3. ROADMAP — single status narrative */}
        <section className={section}>
          <p className={eyebrow}>{milestones.eyebrow}</p>
          <h2 className="mb-8 font-display text-[clamp(26px,3.2vw,34px)] font-bold tracking-[-0.025em] text-ink">
            {milestones.heading}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {milestones.cards.map((card, i) => {
              const live = card.state === "live";
              const cls = `group relative flex flex-col overflow-hidden rounded-2xl border p-6 md:p-7 transition-colors ${
                live
                  ? "border-accent/35 bg-surface"
                  : "border-cream/10 bg-surface/50"
              } ${card.href ? "hover:border-accent/55" : ""}`;
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] tracking-[0.16em] text-ink-tertiary">
                      PHASE {card.phase} · {card.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] ${
                        live
                          ? "border-accent/40 text-accent"
                          : "border-cream/12 text-ink-tertiary"
                      }`}
                    >
                      {live && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
                    {card.title}
                  </h3>
                  <p
                    className={`mt-1 mb-3 font-mono text-xs tracking-widest ${
                      live ? "text-accent" : "text-ink-tertiary"
                    }`}
                  >
                    {card.target}
                  </p>
                  <p className="flex-1 font-text text-sm leading-[1.65] text-ink-secondary">
                    {card.body}
                  </p>
                  <div className="mt-6 border-t border-cream/10 pt-4">
                    {card.href ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-accent">
                        open dashboard
                        <span className="transition-transform group-hover:translate-x-0.5">
                          →
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-ink-tertiary">
                        {card.note}
                      </span>
                    )}
                  </div>
                </>
              );
              return card.href ? (
                <m.a
                  key={card.label}
                  href={card.href}
                  className={cls}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.06,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  {inner}
                </m.a>
              ) : (
                <m.div
                  key={card.label}
                  className={cls}
                  initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.06,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  {inner}
                </m.div>
              );
            })}
          </div>
        </section>

        {/* 4. Evidence: soft cards, no hairline rules — space and surface do the grouping */}
        <section className={section}>
          <p className={eyebrow}>{workstreams.eyebrow}</p>
          <h2 className="mb-8 font-display text-[clamp(22px,2.8vw,28px)] font-bold tracking-[-0.02em] text-ink">
            {workstreams.heading}
          </h2>
          <ul className="flex flex-col gap-3">
            {workstreams.items.map((item) => {
              const tone = TONE[item.tone] ?? TONE.soon;
              const shell =
                "flex flex-col gap-3 rounded-xl bg-surface/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-6";
              const interactive = item.href
                ? "group border border-cream/10 transition-colors hover:border-accent/30 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                : "border border-transparent";
              const body = (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                      {item.title}
                      {item.href && (
                        <span
                          aria-hidden="true"
                          className="ml-2 font-mono text-[13px] font-normal text-ink-tertiary transition-colors group-hover:text-accent"
                        >
                          →
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 max-w-[52ch] font-text text-sm leading-relaxed text-ink-secondary">
                      {item.detail}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-cream/10 bg-elevated/50 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] ${tone.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {item.tag}
                  </span>
                </>
              );
              return (
                <li key={item.title}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className={`${shell} ${interactive}`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className={`${shell} ${interactive}`}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer
        id="contact"
        className={`relative z-10 ${measure} scroll-mt-24 mt-8 border-t border-cream/10 pt-12 pb-20`}
      >
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <a
              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              href="#top"
              aria-label="Vyra Labs home"
            >
              <Wordmark />
            </a>
            <p className="mt-4 max-w-[40ch] font-text text-sm leading-relaxed text-ink-secondary">
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream/12 bg-surface/70 text-ink-secondary transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream/12 bg-surface/70 text-ink-secondary transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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

        <div className="mt-12 border-t border-cream/10 pt-6">
          <p className="font-mono text-xs tracking-[0.06em] text-ink-tertiary">
            {footer.missionLine}
          </p>
        </div>
      </footer>
    </LazyMotion>
  );
}

export default App;
