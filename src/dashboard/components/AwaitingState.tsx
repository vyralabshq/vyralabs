import { IDENTITY_PUBKEY, VOTE_PUBKEY } from "../config";
import { PubkeyChip } from "./PubkeyChip";
import { Disclaimer } from "./Disclaimer";

// Shown in production until the collector publishes real data. Honest and calm rather
// than fake or broken: it states there is nothing live yet, and still shows the two
// public pubkeys (which are known without the collector) so the page is not empty.

const container = "relative z-10 mx-auto max-w-[1100px] px-6";

export function AwaitingState() {
  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <header className={`${container} flex h-18 items-center justify-between`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="/"
          aria-label="Vyra home"
        >
          <img className="-ml-1.5 h-10 w-10 object-contain mix-blend-screen" src="/logo.png" alt="" />
          <span>
            v<span className="text-accent">y</span>ra
          </span>
        </a>
        <span className="rounded-full border border-accent/20 bg-surface px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-ink-secondary">
          testnet
        </span>
      </header>

      <main className={`${container} pt-6 pb-24`}>
        <div className="mb-8 flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.18em] text-accent">status</p>
          <h1 className="font-display text-[clamp(30px,4vw,42px)] font-bold tracking-[-0.02em]">
            How the node is doing
          </h1>
        </div>

        <div className="flex flex-col items-start gap-6 rounded-xl border border-accent/15 bg-surface/60 px-8 py-14">
          <span className="inline-flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" />
            <span className="font-mono text-sm tracking-[0.12em] text-ink-secondary">
              waiting for the first snapshot
            </span>
          </span>
          <p className="max-w-[54ch] text-[15px] leading-relaxed text-ink-secondary">
            Live validator health will appear here once the on-box collector starts
            publishing. Until then there is nothing real to show, so the page stays empty
            on purpose rather than showing placeholder numbers.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <PubkeyChip label="identity" value={IDENTITY_PUBKEY} />
            <PubkeyChip label="vote" value={VOTE_PUBKEY} />
          </div>
        </div>

        <footer className="mt-16 border-t border-accent/10 pt-8">
          <Disclaimer />
        </footer>
      </main>
    </>
  );
}
