// DEMO block-production data — NOT live. The collector does not emit leader-schedule or
// block-production yet; this exists only to design the "is it producing" UI against
// realistic numbers before wiring getLeaderSchedule / getBlockProduction in the collector.
// Everything here is deterministic (fixed seed) so the demo never flickers between renders.
//
// Modelled on epoch 992 with ~157k testnet stake: 34 leader groups of 4 consecutive slots
// (Solana hands each leader a 4-slot window), 136 slots total, ~0.031% of the epoch.

export const EPOCH = 992;
export const EPOCH_START = 423_053_000;
export const EPOCH_END = 423_485_000;
export const CURRENT_SLOT = 423_255_100; // ~47% through the epoch
export const CLUSTER_SKIP_PCT = 0.8;

export type SlotState = "produced" | "skipped" | "upcoming";
export interface LeaderGroup {
  start: number;
  slots: SlotState[];
}

// Stake-weighted-random spread of 34 group starts across the epoch — irregular gaps, as the
// real schedule is. Seeded LCG so it is stable across reloads.
function buildGroups(): LeaderGroup[] {
  let seed = 992;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const span = EPOCH_END - EPOCH_START;
  const starts = Array.from({ length: 34 }, (_, i) => {
    const pos = (i + rand() * 0.85) / 34; // proportional + jitter
    return Math.round((EPOCH_START + span * pos) / 4) * 4; // align to a group boundary
  }).sort((a, b) => a - b);

  const skipAt = new Set([5, 19]); // two groups each drop one slot -> 2 skips total
  return starts.map((start, gi) => ({
    start,
    slots: [0, 1, 2, 3].map((k): SlotState => {
      const slot = start + k;
      if (slot > CURRENT_SLOT) return "upcoming";
      if (skipAt.has(gi) && k === 1) return "skipped";
      return "produced";
    }),
  }));
}

export const LEADER_GROUPS = buildGroups();

const all = LEADER_GROUPS.flatMap((g) => g.slots);
const count = (s: SlotState) => all.filter((x) => x === s).length;

export const BLOCK_STATS = {
  leaderSlots: all.length,
  produced: count("produced"),
  skipped: count("skipped"),
  upcoming: count("upcoming"),
  // Skip rate is over completed slots only (skipped / (produced + skipped)).
  get skipRatePct() {
    const done = this.produced + this.skipped;
    return done === 0 ? 0 : (this.skipped / done) * 100;
  },
};

// Next leader slot: first slot still ahead of the current tip.
export const NEXT_LEADER_SLOT =
  all.length > 0
    ? (LEADER_GROUPS.flatMap((g) => g.slots.map((_, k) => g.start + k)).find(
        (slot) => slot > CURRENT_SLOT,
      ) ?? null)
    : null;

// Skip rate per epoch, for the history bars. Real history starts at 992 (our first epoch
// with leader slots — stake activated at 991, so 992 is the first with an assignment); the
// earlier demo epochs illustrate how the view fills in over time. The current epoch reads
// its live rate off BLOCK_STATS.
export interface EpochSkip {
  epoch: number;
  skipRatePct: number;
  inProgress: boolean;
}
export const EPOCH_SKIP_HISTORY: EpochSkip[] = [
  { epoch: 990, skipRatePct: 3.4, inProgress: false },
  { epoch: 991, skipRatePct: 1.1, inProgress: false },
  { epoch: EPOCH, skipRatePct: BLOCK_STATS.skipRatePct, inProgress: true },
];
