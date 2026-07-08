// Pure metric-to-status thresholds. A single place that answers "is this number fine?"
// so the cards can show one green/amber/red dot and the page answers "anything wrong?"
// at a glance. Thresholds are operator judgement (testnet); tune them here only.

export type Status = "ok" | "warn" | "down";

// higher value is worse (lag, drop rate, disk, memory)
function hi(v: number, okMax: number, warnMax: number): Status {
  return v <= okMax ? "ok" : v <= warnMax ? "warn" : "down";
}

// higher value is better (fork weight, balance)
function lo(v: number, okMin: number, warnMin: number): Status {
  return v >= okMin ? "ok" : v >= warnMin ? "warn" : "down";
}

export const status = {
  finalityLag: (v: number | null): Status | null => (v === null ? null : hi(v, 40, 75)),
  voteLag: (v: number | null): Status | null => (v === null ? null : hi(v, 40, 75)),
  dropRate: (v: number | null): Status | null => (v === null ? null : hi(v, 3, 7)),
  forkWeight: (v: number | null): Status | null => (v === null ? null : lo(v, 66, 40)),
  disk: (v: number | null): Status | null => (v === null ? null : hi(v, 80, 92)),
  memory: (v: number | null): Status | null => (v === null ? null : hi(v, 85, 95)),
  balance: (v: number | null): Status | null => (v === null ? null : lo(v, 1, 0.1)),
};

/** Short human qualifier for a status, e.g. next to drop rate. */
export function statusWord(s: Status | null): string | null {
  if (s === "ok") return "healthy";
  if (s === "warn") return "elevated";
  if (s === "down") return "critical";
  return null;
}
