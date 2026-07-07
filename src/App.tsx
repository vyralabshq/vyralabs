import {
  links,
  hero,
  manifesto,
  mission,
  milestones,
  journal,
  footer,
} from "./content";

const container = "relative z-10 mx-auto max-w-[760px] px-6";
const eyebrow = "font-mono text-xs tracking-[0.18em] text-accent mb-[18px]";
const navLink =
  "rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const section = "scroll-mt-24 py-20";

function App() {
  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <header className={`${container} flex h-18 items-center justify-between`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="#top"
          aria-label="Vyra home"
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
        <nav className="flex gap-5.5 font-mono text-[13px] text-ink-secondary">
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
        {/* Hero */}
        <section className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center pb-16 text-center">
          <span className="inline-flex items-center gap-2.25 rounded-full border border-accent/30 bg-surface px-[14px] py-1.5 text-xs tracking-[0.12em] text-ink-secondary">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono">{hero.badge}</span>
          </span>
          <h1 className="mx-auto mt-6.5 mb-5 max-w-[16ch] text-balance font-display text-[clamp(36px,6vw,56px)] font-bold leading-[1.06] tracking-[-0.03em]">
            {hero.heading} <span className="text-accent">{hero.headingAccent}</span>
          </h1>
          <p className="mx-auto max-w-[540px] text-lg text-ink-secondary">
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

        {/* Manifesto */}
        <section className="py-20 text-center">
          <p className={eyebrow}>{manifesto.eyebrow}</p>
          <div className="mx-auto flex max-w-[640px] flex-col gap-4">
            {manifesto.lines.map((line) => (
              <p key={line} className="text-[19px] leading-[1.7] text-ink">
                {line}
              </p>
            ))}
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
            <p className="mt-5 font-mono text-xs tracking-[0.12em] text-accent">
              {mission.marker}
            </p>
          </div>
        </section>

        {/* What's Next */}
        <section id="journey" className={section}>
          <p className={eyebrow}>{milestones.eyebrow}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {milestones.cards.map((card) => {
              const next = card.state === "next";
              return (
                <div
                  key={card.label}
                  className={`rounded-xl border p-[26px] ${
                    next
                      ? "border-accent/30 bg-[linear-gradient(180deg,rgba(247,127,27,0.06),#1c1209)]"
                      : "border-accent/15 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs tracking-[0.18em] ${
                        next ? "text-accent" : "text-ink-secondary"
                      }`}
                    >
                      {card.label}
                    </span>
                    <span
                      className={`rounded-full border px-[9px] py-1 font-mono text-[10px] tracking-[0.1em] ${
                        next
                          ? "border-accent bg-accent text-[#1a0d02]"
                          : "border-accent/15 text-ink-muted"
                      }`}
                    >
                      {card.tag}
                    </span>
                  </div>
                  <h3
                    className={`mt-[18px] mb-2 font-display text-[22px] font-bold tracking-[-0.02em] ${
                      next ? "text-ink" : "text-ink-secondary"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`mb-[14px] font-mono text-xs tracking-widest ${
                      next ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    {card.target}
                  </p>
                  <p className="text-sm leading-[1.65] text-ink-secondary">
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Journal */}
        <section id="journal" className={section}>
          <p className={eyebrow}>{journal.eyebrow}</p>
          <p className="mb-[18px] max-w-[560px] text-ink-secondary">
            {journal.intro}
          </p>
          <p className="font-mono text-[13px] text-ink-muted">{journal.empty}</p>
        </section>
      </main>

      <footer className={`${container} mt-16 pt-12 pb-20`}>
        <img
          className="mb-5 block h-11 w-11 object-contain [mix-blend-mode:screen]"
          src="/logo.png"
          alt="Vyra"
        />
        <p className="mb-[18px] text-ink-secondary">{footer.tagline}</p>
        <nav className="mb-[18px] flex gap-[22px] font-mono text-[13px] text-ink-secondary">
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
