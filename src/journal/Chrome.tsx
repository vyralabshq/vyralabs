import type { ReactNode } from "react";
import { links } from "../content";

// Shared page frame for the Field Notes entry: the same backdrops, wordmark, and nav as
// the landing page so /logs reads as the same site. `width` narrows the column for
// long-form reading on a post vs the slightly wider index.
//
// Header/main/footer sit in a min-h-screen flex column with main flex-1, so a short page
// (one post, or a single note) still pins the footer to the bottom of the viewport rather
// than leaving it stranded mid-screen above dead space.

const navLink =
  "rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function Chrome({
  children,
  width = "max-w-[820px]",
}: {
  children: ReactNode;
  width?: string;
}) {
  const container = `relative z-10 mx-auto w-full ${width} px-6`;
  return (
    <div className="flex min-h-screen flex-col">
      {/* Halved: full-strength dots are fine behind dashboard panels but read as
          noise under long-form paragraphs. */}
      <div className="grid-bg opacity-50" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <header className={`${container} flex h-18 shrink-0 items-center justify-between`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="/"
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
          <a className={navLink} href="/">
            Home
          </a>
          <a
            className={navLink}
            href={links.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            className={navLink}
            href={links.x}
            target="_blank"
            rel="noreferrer"
          >
            X
          </a>
        </nav>
      </header>

      <main className={`${container} flex-1`}>{children}</main>

      <footer
        className={`${container} mt-20 shrink-0 border-t border-accent/10 pt-10 pb-16`}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            className="inline-flex items-center gap-1.5 rounded font-display text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            href="/"
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
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px] text-ink-secondary">
            <a className={navLink} href="/">
              Home
            </a>
            <a className={navLink} href="/dashboard">
              Dashboard
            </a>
            <a
              className={navLink}
              href={links.github}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className={navLink}
              href={links.x}
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
            <a className={navLink} href={links.email}>
              Email
            </a>
          </nav>
        </div>
        <p className="mt-8 font-mono text-[11px] text-ink-tertiary">
          Vyra Labs. Solana validator infrastructure, built in public.
        </p>
      </footer>
    </div>
  );
}
