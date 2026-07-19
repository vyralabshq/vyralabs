import type { EpochSkip } from "../types";
import { InfoTip } from "./InfoTip";

// Skip rate per epoch, the block-side counterpart to credits-per-epoch. Low is good, so bars
// grow upward with skip rate: green under 5%, amber to 10%, red above. A healthy node sits
// near zero, so the interesting range is the low single digits — the axis tops out at 6% (a
// touch above the 5% "watch" line) so normal values fill the plot instead of being stubs on a
// 0-100 axis, and a bad epoch clamps to the top and reads as "off the chart".

const AXIS_MAX = 6; // percent
const GUIDE = 5; // percent — the "watch it" threshold

function tier(pct: number): string {
  if (pct >= 10) return "bg-down";
  if (pct >= 5) return "bg-accent-bright";
  return "bg-ok";
}

export function BlocksPerEpoch({
  history,
  currentEpoch,
}: {
  history: EpochSkip[];
  currentEpoch: number | null;
}) {
  const shown = [...history].sort((a, b) => a.epoch - b.epoch).slice(-8);

  return (
    <div className="flex h-full flex-col panel p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
        Skip rate per epoch
        <InfoTip text="Skipped leader slots as a percent of assigned, epoch by epoch. Low is good: green under 5%, red above. Starts at your first epoch with leader slots and builds a history like the credits chart." />
      </p>
      <p className="font-mono text-[11px] text-ink-tertiary">green under 5%</p>

      {shown.length === 0 ? (
        <div className="flex flex-1 items-center justify-center font-mono text-ink-muted">
          —
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col">
          {/* Plot fills the panel; bars are full-height cells so they scale to the whole
              area, not a fixed stub. The dashed line marks the 5% watch threshold. */}
          <div className="relative flex flex-1 items-end justify-center gap-4 border-b border-accent/10">
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/15"
              style={{ bottom: `${(GUIDE / AXIS_MAX) * 100}%` }}
            >
              <span className="absolute -top-2.5 right-0 font-mono text-[8px] text-ink-muted">
                {GUIDE}%
              </span>
            </div>
            {shown.map((e) => {
              const h = (Math.min(AXIS_MAX, Math.max(0, e.skipRatePct)) / AXIS_MAX) * 100;
              return (
                <div
                  key={e.epoch}
                  className="relative flex h-full w-8 items-end justify-center"
                >
                  <span
                    className="absolute w-full -translate-y-1 text-center font-mono text-[10px] tabular-nums text-ink-tertiary"
                    style={{ bottom: `${h}%` }}
                  >
                    {e.skipRatePct.toFixed(1)}
                  </span>
                  <div
                    className={`w-6 rounded-t ${tier(e.skipRatePct)} ${e.epoch === currentEpoch ? "opacity-90" : ""}`}
                    style={{ height: `${h}%`, minHeight: 3 }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis: same widths + gap + centering as the bars, so labels sit under them. */}
          <div className="mt-2 flex justify-center gap-4">
            {shown.map((e) => (
              <div key={e.epoch} className="flex w-8 flex-col items-center gap-0.5">
                <span className="font-mono text-[10px] text-ink-secondary">{e.epoch}</span>
                {e.epoch === currentEpoch && (
                  <span className="rounded-full border border-accent/30 px-1 py-px text-[8px] leading-none text-accent">
                    live
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
