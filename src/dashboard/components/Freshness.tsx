// "Updated ... ago" plus a soft stale tag when the snapshot is older than the freshness
// bound. The three-state live / stale / offline signal lands in slice #7.

function formatAge(ageSeconds: number | null): string {
  if (ageSeconds === null) return "no timestamp";
  if (ageSeconds < 5) return "just now";
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s ago`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
  return `${Math.round(ageSeconds / 3600)}h ago`;
}

export function Freshness({
  ageSeconds,
  stale,
}: {
  ageSeconds: number | null;
  stale: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-ink-muted">
      <span>Updated {formatAge(ageSeconds)}</span>
      {stale && (
        <span className="rounded-full border border-down/40 px-2 py-0.5 font-mono text-[11px] text-down">
          stale
        </span>
      )}
    </div>
  );
}
