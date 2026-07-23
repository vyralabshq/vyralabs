import type { LeaderProduction } from "./types";

// Turn the flat leader schedule into the consecutive-slot groups the timeline draws,
// deriving each slot's state against the current tip and the collector's per-slot ledger
// verification (getBlocks per group). A past slot is "produced"/"skipped" only when its
// group was actually resolved; unresolved past slots (not yet checked, or purged beyond
// getFirstAvailableBlock) are "unknown" — the display never claims more than the data
// supports. Aggregate counts in the donut still come straight from the collector.

export type SlotState = "produced" | "skipped" | "unknown" | "upcoming";
export interface LeaderGroup {
  start: number;
  slots: SlotState[];
}

export function buildLeaderGroups(lp: LeaderProduction): LeaderGroup[] {
  const current = lp.currentSlot ?? Number.NEGATIVE_INFINITY;
  const produced = new Set(lp.producedSlots);
  const resolved = new Set(lp.resolvedSlots);
  const state = (s: number): SlotState => {
    if (s > current) return "upcoming";
    if (!resolved.has(s)) return "unknown";
    return produced.has(s) ? "produced" : "skipped";
  };

  const slots = [...lp.leaderSlots].sort((a, b) => a - b);
  const groups: LeaderGroup[] = [];
  let i = 0;
  while (i < slots.length) {
    const start = slots[i];
    const run: number[] = [start];
    while (i + 1 < slots.length && slots[i + 1] === slots[i] + 1) {
      run.push(slots[i + 1]);
      i += 1;
    }
    i += 1;
    groups.push({ start, slots: run.map(state) });
  }
  return groups;
}

/** Blocks not yet led: schedule size minus produced minus skipped, floored at zero. */
export function upcomingCount(lp: LeaderProduction): number {
  const done = (lp.produced ?? 0) + (lp.skipped ?? 0);
  return Math.max(0, lp.leaderSlots.length - done);
}
