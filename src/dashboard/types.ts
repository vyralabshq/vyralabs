// TypeScript mirror of the JSON contract in docs/dashboard.md (Schema).
// This file and collector/schema.py are the two sides of the same contract; edit both
// in lockstep whenever the schema changes. schema_version is currently 1.

export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Raw wire types: the exact shape of the JSON the collector uploads.
// Everything is nullable: null means "this source failed this cycle".
// ---------------------------------------------------------------------------

export interface RawLatest {
  schema_version: number;
  generated_at: string | null;
  cluster: string | null;
  identity_pubkey: string | null;
  vote_pubkey: string | null;

  health: { rpc: string | null } | null;
  version: { version: string | null; jito: boolean | null } | null;

  slots: {
    processed: number | null;
    confirmed: number | null;
    finalized: number | null;
    full_snapshot: number | null;
    incremental_snapshot: number | null;
    network_tx_total: number | null;
  } | null;
  identity_balance_sol: number | null;

  epoch: {
    epoch: number | null;
    slot_index: number | null;
    slots_in_epoch: number | null;
    absolute_slot: number | null;
    block_height: number | null;
  } | null;

  vote: { latest: number | null; root: number | null } | null;
  block_production: { produced: number | null; dropped: number | null } | null;
  /** Leader schedule + block production for the "is it producing" section. Absent on old
      collector builds; present (leader_slots possibly empty) once block production lands. */
  leader_production?: {
    epoch: number | null;
    epoch_start_slot: number | null;
    epoch_end_slot: number | null;
    current_slot: number | null;
    leader_slots: number[];
    produced: number | null;
    skipped: number | null;
    skip_rate_pct: number | null;
    cluster_skip_rate_pct: number | null;
    next_leader_slot: number | null;
    skip_history: { epoch: number; skip_rate_pct: number }[];
  } | null;
  /** Raw 0-1 fraction from the bank_weight datapoint; frontend derives % = *100. */
  fork_weight: number | null;

  system: {
    ledger_disk: RawDisk | null;
    accounts_disk: RawDisk | null;
    memory: RawDisk | null;
    /** [1min, 5min, 15min]; validated to length 3 in parseSnapshot. */
    load_avg: number[] | null;
    cpu_cores: number | null;
    uptime_seconds: number | null;
    process_active: boolean | null;
  } | null;

  vote_account: {
    stale: boolean;
    fetched_at: string | null;
    credits_lifetime: number | null;
    commission_pct: number | null;
    activated_stake_sol: number | null;
    epoch_credits: RawEpochCredit[] | null;
    recent_votes: RawRecentVote[] | null;
  } | null;

  events: RawEvent[] | null;
  errors: string[] | null;
}

export interface RawDisk {
  pct: number | null;
  used_gb: number | null;
  total_gb: number | null;
}

export interface RawEpochCredit {
  epoch: number | null;
  credits: number | null;
  max: number | null;
}

export interface RawRecentVote {
  slot: number | null;
  latency: number | null;
}

export interface RawEvent {
  ts: string | null;
  level: string | null;
  msg: string | null;
}

export interface RawHistory {
  schema_version: number;
  window: string | null;
  resolution_seconds: number | null;
  generated_at: string | null;
  points: RawHistoryPoint[] | null;
}

export interface RawHistoryPoint {
  t: string | null;
  processed: number | null;
  finalized: number | null;
  vote_lag: number | null;
  identity_sol: number | null;
  mem_pct: number | null;
  tx_per_slot: number | null;
  drop_rate_pct: number | null;
}

// ---------------------------------------------------------------------------
// Domain state: the output of parseSnapshot, consumed by presentational
// components. Every "missing" value is null (never NaN/undefined). Derived
// fields live here so the raw schema never has to store them.
// ---------------------------------------------------------------------------

export interface EventItem {
  ts: string | null;
  level: "WARN" | "ERROR" | null;
  msg: string;
}

export interface DiskUsage {
  pct: number | null;
  usedGb: number | null;
  totalGb: number | null;
}

export interface EpochCredit {
  epoch: number | null;
  credits: number | null;
  max: number | null;
}

/** One recent vote: the voted slot and how many slots late it landed (1 = optimal). */
export interface RecentVote {
  slot: number;
  latency: number | null;
}

export interface EpochSkip {
  epoch: number;
  skipRatePct: number;
}

/** Parsed leader schedule + block production for the "is it producing" section. `epoch` is
    the displayed epoch (current, or next when the current has none of our slots). Per-slot
    produced/skipped is derived on the frontend from `currentSlot` until getBlocks lands. */
export interface LeaderProduction {
  epoch: number | null;
  epochStartSlot: number | null;
  epochEndSlot: number | null;
  currentSlot: number | null;
  leaderSlots: number[];
  /** Past slots verified against the ledger: produced ⊆ resolved. A past slot in neither
      is unknown (unchecked or purged) and must render as unknown, never as produced. */
  producedSlots: number[];
  resolvedSlots: number[];
  produced: number | null;
  skipped: number | null;
  skipRatePct: number | null;
  clusterSkipRatePct: number | null;
  nextLeaderSlot: number | null;
  skipHistory: EpochSkip[];
}

/** Whole-page liveness signal (#7). Values always visible, just dimmed off LIVE. */
export type Liveness = "LIVE" | "STALE" | "OFFLINE";

export interface DashboardState {
  /** false only when the input is unusable garbage; the object is still valid to render. */
  ok: boolean;
  /** true when schema_version !== SCHEMA_VERSION. */
  schemaMismatch: boolean;
  /** Human banner shown on schema mismatch or parse failure; null when clean. */
  banner: string | null;

  cluster: string | null;
  identityPubkey: string | null;
  votePubkey: string | null;

  generatedAt: Date | null;
  /** now - generatedAt, in seconds; null when generatedAt is missing. */
  ageSeconds: number | null;
  /** whole-page staleness: age > 30s (also true when the timestamp is missing). */
  stale: boolean;
  /** three-state liveness (#7): LIVE <=30s, STALE 30-90s, OFFLINE >90s / missing / parse fail. */
  liveness: Liveness;

  // Status pills (#3)
  nodeHealthy: boolean | null;
  processActive: boolean | null;
  jitoActive: boolean | null;
  version: string | null;

  // Slots (#4)
  processedSlot: number | null;
  confirmedSlot: number | null;
  finalizedSlot: number | null;
  fullSnapshotSlot: number | null;
  incrementalSnapshotSlot: number | null;
  networkTxTotal: number | null;
  /** derived: processed - finalized */
  finalityLag: number | null;
  identityBalanceSol: number | null;

  // Epoch (#4)
  epoch: number | null;
  slotIndex: number | null;
  slotsInEpoch: number | null;
  absoluteSlot: number | null;
  blockHeight: number | null;
  /** derived: slot_index / slots_in_epoch * 100 */
  epochProgressPct: number | null;

  // Voting + block production (#4)
  voteLatest: number | null;
  voteRoot: number | null;
  /** derived: latest - root */
  voteLag: number | null;
  blocksProduced: number | null;
  blocksDropped: number | null;
  /** derived: dropped / (produced + dropped) * 100, cumulative since restart */
  dropRatePct: number | null;
  /** derived: fork_weight * 100 */
  forkWeightPct: number | null;

  /** Leader schedule + block production ("is it producing"). null until the collector emits
      it (old builds) or before any schedule is fetched. */
  leaderProduction: LeaderProduction | null;

  // System (#4)
  ledgerDisk: DiskUsage;
  accountsDisk: DiskUsage;
  memory: DiskUsage;
  loadAvg: number[] | null;
  cpuCores: number | null;
  uptimeSeconds: number | null;

  // Vote account (#6)
  voteAccountStale: boolean;
  voteAccountFetchedAt: Date | null;
  creditsLifetime: number | null;
  commissionPct: number | null;
  activatedStakeSol: number | null;
  epochCredits: EpochCredit[];
  recentVotes: RecentVote[];

  // Events (#6)
  events: EventItem[];
  errors: string[];
}

// --- history (parseHistory output, consumed by charts + sparklines) -----------------

export interface HistoryPoint {
  t: Date | null;
  processed: number | null;
  finalized: number | null;
  voteLag: number | null;
  identitySol: number | null;
  memPct: number | null;
  txPerSlot: number | null;
  dropRatePct: number | null;
}

export interface HistorySeries {
  ok: boolean;
  window: string | null;
  resolutionSeconds: number | null;
  points: HistoryPoint[];
}
