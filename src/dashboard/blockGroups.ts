import type { LeaderProduction } from "./types";

// Turn the flat leader schedule into the consecutive-slot groups the timeline draws, deriving
// each slot's state against the current tip. Per-slot skip detail is not available yet
// (getBlocks is a follow-up), so an elapsed slot reads as "produced" here; the exact skipped
// count lives in the aggregate donut and skip-rate stat, which come straight from the
// collector. Before our first assignment the whole schedule is still ahead, so every slot is
// "upcoming" and this approximation is invisible.

export type SlotState = "produced" | "skipped" | "upcoming";
export interface LeaderGroup {
  start: number;
  slots: SlotState[];
}

export function buildLeaderGroups(lp: LeaderProduction): LeaderGroup[] {
  const current = lp.currentSlot ?? Number.NEGATIVE_INFINITY;
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
    groups.push({
      start,
      slots: run.map((s) => (s > current ? "upcoming" : "produced")),
    });
  }
  return groups;
}

/** Blocks not yet led: schedule size minus produced minus skipped, floored at zero. */
export function upcomingCount(lp: LeaderProduction): number {
  const done = (lp.produced ?? 0) + (lp.skipped ?? 0);
  return Math.max(0, lp.leaderSlots.length - done);
}
