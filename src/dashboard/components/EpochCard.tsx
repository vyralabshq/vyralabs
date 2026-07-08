import { fmtInt, fmtDuration } from "../format";
import { Missing } from "./Missing";

// Epoch with a thin progress bar and an approximate ETA (the actually useful number).
// This lives once, in the chain section; there is no epoch donut in Resources.

export function EpochCard({
  epoch,
  progressPct,
  etaSeconds,
}: {
  epoch: number | null;
  progressPct: number | null;
  etaSeconds: number | null;
}) {
  const pct = progressPct === null ? null : Math.max(0, Math.min(100, progressPct));

  return (
    <div className="flex flex-col justify-between rounded-xl border border-accent/12 bg-surface/60 p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] text-ink-muted">
          EPOCH
        </span>
        <span className="font-mono text-[11px] text-ink-muted">
          {pct === null ? "" : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="mt-3 font-display text-[26px] font-bold leading-none tabular-nums text-ink">
        {fmtInt(epoch) ?? <Missing />}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-ink-secondary">
        {etaSeconds === null ? "ETA unknown" : `ends in ~${fmtDuration(etaSeconds)}`}
      </div>
    </div>
  );
}
