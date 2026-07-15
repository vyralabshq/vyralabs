// Status row: Node Healthy, Process Active, Jito Active. Quiet by design. When a
// signal is up the dot just glows; only a problem (down / unknown) adds a word, so a
// healthy node reads as calm rather than shouting three "UP" labels.

type PillState = boolean | null;

function Pill({ label, state }: { label: string; state: PillState }) {
  const up = state === true;
  const down = state === false;

  const dot = up
    ? "bg-ok shadow-[0_0_10px_rgba(107,191,126,0.55)]"
    : down
      ? "bg-down"
      : "border border-dashed border-ink-muted";

  const word = down ? "down" : state === null ? "no data" : null;
  const wordColor = down ? "text-down" : "text-ink-tertiary";

  return (
    <span
      className="inline-flex items-center gap-2.5 rounded-full border border-accent/15 bg-surface px-3.5 py-1.5"
      role="status"
      aria-label={`${label}: ${up ? "up" : (word ?? "up")}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="text-[13px] text-ink-secondary">{label}</span>
      {word && (
        <span className={`font-mono text-[11px] tracking-[0.08em] ${wordColor}`}>
          {word}
        </span>
      )}
    </span>
  );
}

export function StatusPills({
  nodeHealthy,
  processActive,
  version,
}: {
  nodeHealthy: PillState;
  processActive: PillState;
  version?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Pill label="Node healthy" state={nodeHealthy} />
      <Pill label="Process active" state={processActive} />
      {version && (
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-surface px-3.5 py-1.5 font-mono text-[12px] tabular-nums text-ink-secondary">
          <span className="tracking-[0.08em] text-ink-tertiary">client</span>
          Jito {version}
        </span>
      )}
    </div>
  );
}
