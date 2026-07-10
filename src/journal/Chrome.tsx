import type { ReactNode } from "react";
import { links } from "../content";

// Shared page frame for the Field Notes entry: the same backdrops, wordmark, and nav as
// the landing page so /logs reads as the same site. `width` narrows the column for
// long-form reading on a post vs the slightly wider index.

const navLink =
  "rounded transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function Chrome({
  children,
  width = "max-w-[820px]",
}: {
  children: ReactNode;
  width?: string;
}) {
  const container = `relative z-10 mx-auto ${width} px-6`;
  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <header className={`${container} flex h-18 items-center justify-between`}>
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

      <main className={container}>{children}</main>

      <footer
        className={`${container} mt-20 border-t border-accent/10 pt-10 pb-16`}
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
        <p className="mt-8 font-mono text-[11px] text-ink-muted">
          Vyra Labs. Solana validator infrastructure, built in public.
        </p>
      </footer>
    </>
  );
}
