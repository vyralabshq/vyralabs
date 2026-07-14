import { fmtDuration, fmtInt } from "../format";
import { Missing } from "./Missing";

// Compact system health: thin percent-only bars for the disks and memory, plus a load /
// uptime line. Percent only (no absolute sizes) so the page does not advertise infra
// sizing. Disk is the one that actually kills a validator, so it leads. Fill grades by
// utilization — green when there is headroom, amber getting full, red critical — and each
// track shades a faint danger zone at its far end so the wall is visible, not implied.

function barColor(pct: number, warnAt: number, dangerAt: number): string {
  if (pct >= dangerAt) return "bg-down";
  if (pct >= warnAt) return "bg-accent-bright";
  return "bg-ok";
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
      <span className="w-24 shrink-0 font-mono text-[11px] tracking-[0.08em] text-ink-muted sm:w-28">
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-elevated">
        {/* Danger zone: the top slice of the track (dangerAt → 100%) faintly reddened so
            the wall reads at a glance and the fill's distance from it is visible. */}
        <div
          className="absolute inset-y-0 right-0 bg-down/15"
          style={{ width: `${Math.max(0, 100 - dangerAt)}%` }}
        />
        {pct !== null && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor(pct, warnAt, dangerAt)}`}
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
  incrBehind,
  fullBehind,
  loadAvg,
  cpuCores,
  uptimeSeconds,
}: {
  ledgerPct: number | null;
  accountsPct: number | null;
  memoryPct: number | null;
  incrBehind: number | null;
  fullBehind: number | null;
  loadAvg: number[] | null;
  cpuCores: number | null;
  uptimeSeconds: number | null;
}) {
  const over = loadAvg !== null && cpuCores !== null && loadAvg[0] > cpuCores;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-accent/12 bg-surface/60 p-4 sm:p-5">
      {/* Snapshot lag as a compact header row instead of two big number cards: it's two
          numbers, so it earns one dense line, not half the section's height. */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-accent/10 pb-3 font-mono text-[11px] text-ink-muted">
        <span>
          incr snapshot{" "}
          <span className="tabular-nums text-ink-secondary">
            {incrBehind === null ? <Missing /> : fmtInt(incrBehind)}
          </span>{" "}
          behind
        </span>
        <span>
          full snapshot{" "}
          <span className="tabular-nums text-ink-secondary">
            {fullBehind === null ? <Missing /> : fmtInt(fullBehind)}
          </span>{" "}
          behind
        </span>
      </div>
      <Bar label="ledger disk" pct={ledgerPct} warnAt={80} dangerAt={92} />
      <Bar label="accounts disk" pct={accountsPct} warnAt={80} dangerAt={92} />
      <Bar label="memory" pct={memoryPct} warnAt={85} dangerAt={95} />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-accent/10 pt-3 font-mono text-[11px] text-ink-muted">
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
