import { fmtDuration } from "../format";
import { Missing } from "./Missing";

// Compact system health: thin percent-only bars for the disks and memory, plus a load /
// uptime line. Percent only (no absolute sizes) so the page does not advertise infra
// sizing. Disk is the one that actually kills a validator, so it leads; bars tint warm
// past their thresholds so the row answers "am I about to run out of something?".

function barColor(pct: number, warnAt: number, dangerAt: number): string {
  if (pct >= dangerAt) return "bg-down";
  if (pct >= warnAt) return "bg-accent-bright";
  return "bg-accent";
}

function Bar({
  label,
  pct,
  warnAt,
  dangerAt,
}: {
  label: string;
  pct: number | null;
  warnAt: number;
  dangerAt: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[11px] tracking-[0.08em] text-ink-muted">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
        {pct !== null && (
          <div
            className={`h-full rounded-full ${barColor(pct, warnAt, dangerAt)}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        )}
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {pct === null ? <Missing /> : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

export function SystemStrip({
  ledgerPct,
  accountsPct,
  memoryPct,
  loadAvg,
  cpuCores,
  uptimeSeconds,
}: {
  ledgerPct: number | null;
  accountsPct: number | null;
  memoryPct: number | null;
  loadAvg: number[] | null;
  cpuCores: number | null;
  uptimeSeconds: number | null;
}) {
  const over = loadAvg !== null && cpuCores !== null && loadAvg[0] > cpuCores;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-accent/12 bg-surface/60 p-5">
      <Bar label="ledger disk" pct={ledgerPct} warnAt={80} dangerAt={92} />
      <Bar label="accounts disk" pct={accountsPct} warnAt={80} dangerAt={92} />
      <Bar label="memory" pct={memoryPct} warnAt={85} dangerAt={95} />
      <div className="mt-1 flex items-center justify-between border-t border-accent/10 pt-3 font-mono text-[11px] text-ink-muted">
        <span>
          load{" "}
          {loadAvg === null ? (
            <Missing />
          ) : (
            <span className={`tabular-nums ${over ? "text-down" : "text-ink-secondary"}`}>
              {loadAvg.map((v) => v.toFixed(2)).join(" / ")}
            </span>
          )}
          {cpuCores !== null && <span> on {cpuCores} cores</span>}
        </span>
        <span>up {fmtDuration(uptimeSeconds) ?? "?"}</span>
      </div>
    </div>
  );
}
