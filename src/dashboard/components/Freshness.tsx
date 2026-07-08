// "Updated ... ago" plus the three-state live / stale / offline signal (#7). The values on
// the page are never hidden in STALE/OFFLINE, only dimmed; this badge names the state.

import type { Liveness } from "../types";

function formatAge(ageSeconds: number | null): string {
  if (ageSeconds === null) return "no timestamp";
  if (ageSeconds < 5) return "just now";
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s ago`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
  return `${Math.round(ageSeconds / 3600)}h ago`;
}

// LIVE green, STALE warm amber (the design's warn = accent-bright), OFFLINE red.
const BADGE: Record<Liveness, string> = {
  LIVE: "border-ok/40 text-ok",
  STALE: "border-accent-bright/50 text-accent-bright",
  OFFLINE: "border-down/40 text-down",
};

export function Freshness({
  ageSeconds,
  liveness,
}: {
  ageSeconds: number | null;
  liveness: Liveness;
}) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-ink-muted">
      <span>Updated {formatAge(ageSeconds)}</span>
      <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${BADGE[liveness]}`}>
        {liveness.toLowerCase()}
      </span>
    </div>
  );
}
