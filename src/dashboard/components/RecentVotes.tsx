import type { RecentVote } from "../types";
import { Missing } from "./Missing";
import { InfoTip } from "./InfoTip";

// The last ~31 votes as a per-slot bar strip. Each bar is one recent slot; its height is
// how late the vote landed (latency), so short = on time and tall = very late, colored the
// same way. A dashed full-height bar is a skipped slot: a missed vote. This is the granular
// counterpart to the epoch-wide success %, readable slot by slot.
//
// latency is slots between the voted slot and when the vote landed (1 = optimal, up to 16
// credited), so we scale bar height against 16.

const MAX_LATENCY = 16;

type Cell = { slot: number; latency: number | null; missed: boolean };

function toneFor(latency: number | null): string {
  if (latency === null) return "bg-ink-muted/50"; // present but latency unknown
  if (latency <= 2) return "bg-ok";
  if (latency <= 8) return "bg-accent-bright";
  return "bg-down";
}

// Bar height as a percent of the plot: taller = later. Floored so an on-time vote is still
// a visible nub, and unknown-latency votes get a small neutral mark.
function heightPct(c: Cell): number {
  if (c.missed) return 100;
  if (c.latency === null) return 30;
  return Math.max(8, Math.min(100, (c.latency / MAX_LATENCY) * 100));
}

function buildCells(votes: RecentVote[]): Cell[] {
  if (votes.length === 0) return [];
  const sorted = [...votes].sort((a, b) => a.slot - b.slot);
  const first = sorted[0].slot;
  const last = sorted[sorted.length - 1].slot;

  // Normal case: consecutive slots, so expand gaps into "missed" cells. Guard against an
  // anomalous huge span by falling back to just the votes we have.
  if (last - first <= 128) {
    const bySlot = new Map(sorted.map((v) => [v.slot, v]));
    const cells: Cell[] = [];
    for (let slot = first; slot <= last; slot++) {
      const v = bySlot.get(slot);
      cells.push(
        v
          ? { slot, latency: v.latency, missed: false }
          : { slot, latency: null, missed: true },
      );
    }
    return cells;
  }
  return sorted.map((v) => ({ slot: v.slot, latency: v.latency, missed: false }));
}

const legend = [
  { cls: "bg-ok", label: "on time" },
  { cls: "bg-accent-bright", label: "late" },
  { cls: "bg-down", label: "very late" },
  { cls: "border border-dashed border-down/60", label: "missed" },
];

export function RecentVotes({
  recentVotes,
  stale = false,
}: {
  recentVotes: RecentVote[];
  stale?: boolean;
}) {
  const cells = buildCells(recentVotes);
  const landed = cells.filter((c) => !c.missed);
  const missed = cells.length - landed.length;
  const latencies = landed
    .map((c) => c.latency)
    .filter((l): l is number => l !== null);
  const avgLatency =
    latencies.length === 0
      ? null
      : latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const onTime = landed.filter((c) => c.latency !== null && c.latency <= 2).length;
  const onTimePct = landed.length === 0 ? null : (onTime / landed.length) * 100;

  return (
    <div
      className={`flex h-full flex-col panel p-4 transition-opacity ${stale ? "opacity-45" : ""}`}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
        Recent votes
        <InfoTip text="The last ~31 votes, one bar per slot. Bar height is latency: how late the vote landed (1 = earliest possible, up to 16 credited). Short is good, tall is late, a dashed bar is a skipped slot (missed vote)." />
      </p>

      {cells.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Missing />
        </div>
      ) : (
        <>
          <div className="font-mono text-[11px] text-ink-muted">
            {avgLatency === null ? (
              "no latency data"
            ) : (
              <>
                avg latency{" "}
                <span className="tabular-nums text-ink-secondary">
                  {avgLatency.toFixed(1)}
                </span>{" "}
                ·{" "}
                <span className="tabular-nums text-ink-secondary">
                  {Math.round(onTimePct ?? 0)}%
                </span>{" "}
                on time
                {missed > 0 && (
                  <>
                    {" "}
                    · <span className="tabular-nums text-down">{missed} missed</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Bar plot: fills the card's height; bars sit on a baseline, tallest = latest. */}
          <div className="mt-4 flex min-h-[120px] flex-1 items-end gap-[3px] border-b border-accent/12 pb-px">
            {cells.map((c) => (
              <div
                key={c.slot}
                title={
                  c.missed
                    ? `slot ${c.slot} · missed`
                    : `slot ${c.slot} · latency ${c.latency ?? "?"}`
                }
                style={{ height: `${heightPct(c)}%` }}
                className={`min-w-0 flex-1 rounded-[2px] ${c.missed ? "border border-dashed border-down/60" : toneFor(c.latency)}`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[9px] tracking-[0.06em] text-ink-muted">
            <span>oldest</span>
            <span>latency: taller = later</span>
            <span>newest</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-ink-muted">
            {legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[2px] ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
