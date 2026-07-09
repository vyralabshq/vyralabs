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
  SOON: { dot: "bg-ink-muted", text: "text-ink-muted" },
  UPCOMING: { dot: "bg-ink-muted", text: "text-ink-muted" },
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
  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <header className={`${container} flex h-18 items-center justify-between`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="#top"
          aria-label="Vyra Labs home"
        >
          <img
            className="-ml-1.5 h-10 w-10 object-contain mix-blend-screen"
            src="/logo.png"
            alt=""
          />
          <span>
            v<span className="text-accent">y</span>ra
          </span>
        </a>
        <nav className="flex items-center gap-5.5 font-mono text-[13px] text-ink-secondary">
          <a className={navLink} href={links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className={navLink} href={links.x} target="_blank" rel="noreferrer">
            X
          </a>
          <a className={navLink} href={links.email}>
            Email
          </a>
        </nav>
      </header>

      <main id="top" className={container}>
        {/* Hero. The live validator badge leads: it is the single strongest true signal. */}
        <section className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center pb-16 text-center">
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-surface px-[14px] py-1.5 text-xs tracking-[0.12em] text-ink-secondary">
            <span className="font-mono">{hero.liveBadge}</span>
          </span>
          <h1 className="mx-auto mt-6.5 mb-5 max-w-[16ch] text-balance font-display text-[clamp(36px,6vw,56px)] font-bold leading-[1.06] tracking-[-0.03em]">
            {hero.heading} <span className="text-accent">{hero.headingAccent}</span>
          </h1>
          <p className="mx-auto max-w-[560px] text-lg text-ink-secondary">
            {hero.subheading}
          </p>
          <div className="mt-[34px] flex flex-wrap justify-center gap-[14px]">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {whatWeDo.cards.map((card, i) => {
              const Icon = ICONS[i] ?? ICONS[0];
              const tone = STATUS_TONE[card.tag] ?? STATUS_TONE.SOON;
              return (
                <div
                  key={card.title}
                  className="group flex flex-col rounded-2xl border border-accent/12 bg-surface/70 p-6 transition-colors hover:border-accent/30"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                      <Icon />
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.2em] text-ink-muted">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2.5 font-display text-[20px] font-bold leading-tight tracking-[-0.01em] text-ink">
                    {card.title}
                  </h3>
                  <p className="flex-1 text-sm leading-[1.65] text-ink-secondary">{card.body}</p>
                  <div className="mt-5 flex items-center gap-2 border-t border-accent/10 pt-4">
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
                </div>
              );
            })}
          </div>
        </section>

        {/* Current Mission */}
        <section className={section}>
          <div className="rounded-xl border border-accent/30 bg-[linear-gradient(180deg,rgba(247,127,27,0.07),#1c1209)] p-9">
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
                    <span className="font-mono text-[11px] tracking-[0.18em] text-ink-muted">
                      {card.phase} · {card.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] ${
                        live ? "border-accent/40 text-accent" : "border-ink-muted/40 text-ink-muted"
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
                      live ? "text-accent" : "text-ink-muted"
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
                      <span className="font-mono text-[11px] text-ink-muted">{card.note}</span>
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

        {/* Journal */}
        <section id="journal" className={section}>
          <p className={eyebrow}>{journal.eyebrow}</p>
          <p className="mb-[18px] max-w-[560px] text-ink-secondary">{journal.intro}</p>
          <p className="font-mono text-[13px] text-ink-muted">{journal.current}</p>
        </section>
      </main>

      <footer className={`${container} mt-16 pt-12 pb-20`}>
        <img
          className="mb-5 block h-11 w-11 object-contain [mix-blend-mode:screen]"
          src="/logo.png"
          alt="Vyra Labs"
        />
        <p className="mb-[18px] max-w-[540px] text-ink-secondary">{footer.tagline}</p>
        <nav className="mb-[18px] flex flex-wrap gap-[22px] font-mono text-[13px] text-ink-secondary">
          <a className={navLink} href="/dashboard">
            Dashboard
          </a>
          <a className={navLink} href={links.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className={navLink} href={links.x} target="_blank" rel="noreferrer">
            X
          </a>
          <a className={navLink} href="#journal">
            Journal
          </a>
          <a className={navLink} href={links.email}>
            Email
          </a>
        </nav>
        <p className="font-mono text-xs tracking-[0.06em] text-ink-muted">
          {footer.missionLine}
        </p>
      </footer>
    </>
  );
}

export default App;
