// The right half of the status hero: one at-a-glance verdict that rolls up every health
// signal into a single word, balancing the headline on the left. Folds the cluster, the
// three-state liveness badge and the "updated ..." freshness into one line, so the page
// has a single source of "is it up and current?" instead of a lone testnet pill.

import type { Liveness } from "../types";
import { fmtAge } from "../format";

export type Verdict = "ok" | "warn" | "down";

const TONE: Record<Verdict, string> = {
  ok: "text-ok",
  warn: "text-accent-bright",
  down: "text-down",
};
const DOT: Record<Verdict, string> = {
  ok: "bg-ok shadow-[0_0_12px_rgba(107,191,126,0.6)]",
  warn: "bg-accent-bright shadow-[0_0_12px_rgba(255,160,51,0.55)]",
  down: "bg-down shadow-[0_0_12px_rgba(224,112,95,0.55)]",
};
const LIVE: Record<Liveness, string> = {
  LIVE: "border-ok/40 text-ok",
  STALE: "border-accent-bright/50 text-accent-bright",
  OFFLINE: "border-down/40 text-down",
};

export function StatusHero({
  word,
  tone,
  detail,
  cluster,
  ageSeconds,
  liveness,
}: {
  word: string;
  tone: Verdict;
  detail: string;
  cluster: string | null;
  ageSeconds: number | null;
  liveness: Liveness;
}) {
  return (
    <div className="flex flex-col gap-2 md:items-end md:text-right">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} aria-hidden="true" />
        <span
          className={`font-display text-[22px] font-bold tracking-tight ${TONE[tone]}`}
        >
          {word}
        </span>
      </div>
      <p className="text-[13px] text-ink-secondary">{detail}</p>
      <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
        <span className="tracking-[0.1em]">{cluster ?? "testnet"}</span>
        <span aria-hidden="true">·</span>
        <span className={`rounded-full border px-2 py-0.5 ${LIVE[liveness]}`}>
          {liveness.toLowerCase()}
        </span>
        <span aria-hidden="true">·</span>
        <span>updated {fmtAge(ageSeconds)}</span>
      </div>
    </div>
  );
}
