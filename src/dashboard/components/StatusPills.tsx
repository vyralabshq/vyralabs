// Status row: Node Healthy, Process Active, and a client pill (Agave / Jito + version).
// Quiet by design: an up signal just glows, only down / unknown adds a word.

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
      className="inline-flex items-center gap-2.5 rounded-full border border-cream/12 bg-surface px-3.5 py-1.5"
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

/** Client family from version.jito: true → Jito, false → Agave, null unknown. */
function clientLabel(jito: boolean | null | undefined): string {
  if (jito === true) return "Jito";
  if (jito === false) return "Agave";
  return "client";
}

export function StatusPills({
  nodeHealthy,
  processActive,
  version,
  jito,
}: {
  nodeHealthy: PillState;
  processActive: PillState;
  version?: string | null;
  jito?: boolean | null;
}) {
  const name = clientLabel(jito);
  const clientText = version
    ? name === "client"
      ? version
      : `${name} ${version}`
    : name === "client"
      ? null
      : name;

  return (
    <div className="flex flex-wrap gap-2.5">
      <Pill label="Node healthy" state={nodeHealthy} />
      <Pill label="Process active" state={processActive} />
      {clientText && (
        <span
          className="inline-flex items-center gap-2 rounded-full border border-cream/12 bg-surface px-3.5 py-1.5 font-mono text-[12px] tabular-nums text-ink-secondary"
          role="status"
          aria-label={`client: ${clientText}`}
        >
          <span className="tracking-[0.08em] text-ink-tertiary">client</span>
          {clientText}
        </span>
      )}
    </div>
  );
}
