import type { LeaderGroup } from "../blockGroups";
import { InfoTip } from "./InfoTip";

// The epoch's 34 leader groups as ticks positioned by where they fall in the epoch, so the
// stake-weighted clustering and any run of failures read at a glance. Mirrors the vote-side
// language: same panel, same status tones (green produced / amber partial / red skipped /
// muted upcoming). A "now" marker shows how far the epoch has run.

type GroupState = "produced" | "partial" | "skipped" | "upcoming";

function groupState(g: LeaderGroup): GroupState {
  const skipped = g.slots.filter((s) => s === "skipped").length;
  const produced = g.slots.filter((s) => s === "produced").length;
  if (produced === 0 && skipped === 0) return "upcoming";
  if (skipped === 0) return "produced";
  if (produced === 0) return "skipped";
  return "partial";
}

const TICK: Record<GroupState, string> = {
  produced: "bg-ok",
  partial: "bg-accent-bright",
  skipped: "bg-down",
  upcoming: "bg-ink-muted/40",
};

const LEGEND: { state: GroupState; label: string }[] = [
  { state: "produced", label: "all produced" },
  { state: "partial", label: "partial" },
  { state: "skipped", label: "all skipped" },
  { state: "upcoming", label: "upcoming" },
];

export function LeaderTimeline({
  groups,
  epochStart,
  epochEnd,
  currentSlot,
}: {
  groups: LeaderGroup[];
  epochStart: number;
  epochEnd: number;
  currentSlot: number;
}) {
  const span = epochEnd - epochStart;
  const pct = (slot: number) =>
    Math.max(0, Math.min(100, ((slot - epochStart) / span) * 100));

  return (
    <div className="panel p-4 sm:p-5">
      <p className="mb-4 flex items-center gap-1.5 text-[13px] text-ink-secondary">
        Leader groups this epoch
        <InfoTip text="Every leader assignment this epoch, positioned by where it falls in the 432,000-slot span. Each group is a 4-slot window. Colour shows the outcome; the line marks the current slot." />
      </p>

      {/* Track: ticks sit on a baseline, the now-marker sweeps left to right as the epoch runs. */}
      <div className="relative h-12">
        <div className="absolute inset-x-0 bottom-0 h-px bg-accent/12" />
        {groups.map((g, i) => {
          const state = groupState(g);
          const produced = g.slots.filter((s) => s === "produced").length;
          const skipped = g.slots.filter((s) => s === "skipped").length;
          const end = g.start + (g.slots.length - 1);
          const outcome =
            state === "upcoming"
              ? "upcoming"
              : `${produced} produced${skipped ? `, ${skipped} skipped` : ""}`;
          return (
            <div
              key={i}
              className={`absolute bottom-0 w-[3px] -translate-x-1/2 rounded-t ${TICK[state]}`}
              style={{ left: `${pct(g.start)}%`, height: "100%" }}
              title={`slots ${g.start.toLocaleString("en-US")}–${end.toLocaleString("en-US")} · ${outcome}`}
            />
          );
        })}
        {/* now marker */}
        <div
          className="absolute bottom-0 top-0 w-px -translate-x-1/2 bg-accent"
          style={{ left: `${pct(currentSlot)}%` }}
        >
          <span className="absolute -top-0.5 left-1 whitespace-nowrap font-mono text-[9px] tracking-[0.08em] text-accent">
            now
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-cream/10 pt-3 font-mono text-[10px] text-ink-tertiary">
        <span className="tabular-nums">{groups.length} groups</span>
        {LEGEND.map((l) => (
          <span key={l.state} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-[2px] ${TICK[l.state]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
