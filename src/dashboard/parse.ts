// The frontend's single seam. parseSnapshot turns raw latest.json into a typed,
// display-ready DashboardState; parseHistory does the same for the history windows.
// Both are pure, deterministic, now-injected: no network, no DOM, no ECharts. They
// NEVER throw. Malformed input yields a defined fallback state so the page degrades
// instead of crashing. All derivations (finality lag, vote lag, drop rate, fork %,
// epoch progress) live here so the two sides can never disagree.

import {
  SCHEMA_VERSION,
  type DashboardState,
  type DiskUsage,
  type EpochCredit,
  type EventItem,
  type HistoryPoint,
  type HistorySeries,
  type Liveness,
  type RecentVote,
} from "./types";
import { STALE_AFTER_SECONDS, OFFLINE_AFTER_SECONDS } from "./config";

/** Three-state liveness from snapshot age. Missing timestamp reads as OFFLINE (#7). */
function livenessOf(ageSeconds: number | null): Liveness {
  if (ageSeconds === null || ageSeconds > OFFLINE_AFTER_SECONDS)
    return "OFFLINE";
  if (ageSeconds > STALE_AFTER_SECONDS) return "STALE";
  return "LIVE";
}

// --- coercion helpers: keep "missing" explicit as null, never NaN/undefined ---------

function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

/** Parse an ISO-8601 timestamp to a Date, or null if absent/unparseable. */
function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (s === null) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

function disk(v: unknown): DiskUsage {
  const o = asObject(v);
  if (o === null) return { pct: null, usedGb: null, totalGb: null };
  return { pct: num(o.pct), usedGb: num(o.used_gb), totalGb: num(o.total_gb) };
}

/** a - b, or null if either side is missing. */
function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a - b;
}

// --- the empty / fallback shape -----------------------------------------------------

function emptyState(): DashboardState {
  return {
    ok: true,
    schemaMismatch: false,
    banner: null,
    cluster: null,
    identityPubkey: null,
    votePubkey: null,
    generatedAt: null,
    ageSeconds: null,
    stale: true,
    liveness: "OFFLINE",
    nodeHealthy: null,
    processActive: null,
    jitoActive: null,
    version: null,
    processedSlot: null,
    confirmedSlot: null,
    finalizedSlot: null,
    fullSnapshotSlot: null,
    incrementalSnapshotSlot: null,
    networkTxTotal: null,
    finalityLag: null,
    identityBalanceSol: null,
    epoch: null,
    slotIndex: null,
    slotsInEpoch: null,
    absoluteSlot: null,
    blockHeight: null,
    epochProgressPct: null,
    voteLatest: null,
    voteRoot: null,
    voteLag: null,
    blocksProduced: null,
    blocksDropped: null,
    dropRatePct: null,
    forkWeightPct: null,
    leaderProduction: null,
    ledgerDisk: { pct: null, usedGb: null, totalGb: null },
    accountsDisk: { pct: null, usedGb: null, totalGb: null },
    memory: { pct: null, usedGb: null, totalGb: null },
    loadAvg: null,
    cpuCores: null,
    uptimeSeconds: null,
    voteAccountStale: false,
    voteAccountFetchedAt: null,
    creditsLifetime: null,
    commissionPct: null,
    activatedStakeSol: null,
    epochCredits: [],
    recentVotes: [],
    events: [],
    errors: [],
  };
}

/** The state returned when input is unusable or the schema is wrong. Never a throw. */
function fallback(banner: string, schemaMismatch: boolean): DashboardState {
  return { ...emptyState(), ok: false, schemaMismatch, banner };
}

/**
 * Normalize a raw latest.json snapshot into DashboardState.
 * @param raw  the parsed JSON (untrusted; may be anything)
 * @param now  the reference clock for staleness (injected for determinism)
 */
export function parseSnapshot(raw: unknown, now: Date): DashboardState {
  const root = asObject(raw);
  if (root === null) {
    return fallback("Metrics data is malformed.", false);
  }
  if (root.schema_version !== SCHEMA_VERSION) {
    return fallback(
      `Unsupported metrics schema (expected v${SCHEMA_VERSION}, got ${String(
        root.schema_version,
      )}). Showing a safe fallback.`,
      true,
    );
  }

  const s = emptyState();

  const generatedAt = parseDate(root.generated_at);
  s.generatedAt = generatedAt;
  s.ageSeconds =
    generatedAt === null
      ? null
      : (now.getTime() - generatedAt.getTime()) / 1000;
  // Missing timestamp counts as stale. A future timestamp (negative age) does not.
  s.stale = s.ageSeconds === null || s.ageSeconds > STALE_AFTER_SECONDS;
  s.liveness = livenessOf(s.ageSeconds);

  s.cluster = str(root.cluster);
  s.identityPubkey = str(root.identity_pubkey);
  s.votePubkey = str(root.vote_pubkey);

  const health = asObject(root.health);
  const rpc = health ? str(health.rpc) : null;
  s.nodeHealthy = rpc === null ? null : rpc === "ok";

  const version = asObject(root.version);
  s.jitoActive = version ? bool(version.jito) : null;
  s.version = version ? str(version.version) : null;

  const slots = asObject(root.slots);
  if (slots) {
    s.processedSlot = num(slots.processed);
    s.confirmedSlot = num(slots.confirmed);
    s.finalizedSlot = num(slots.finalized);
    s.fullSnapshotSlot = num(slots.full_snapshot);
    s.incrementalSnapshotSlot = num(slots.incremental_snapshot);
    s.networkTxTotal = num(slots.network_tx_total);
  }
  s.finalityLag = diff(s.processedSlot, s.finalizedSlot);
  s.identityBalanceSol = num(root.identity_balance_sol);

  const epoch = asObject(root.epoch);
  if (epoch) {
    s.epoch = num(epoch.epoch);
    s.slotIndex = num(epoch.slot_index);
    s.slotsInEpoch = num(epoch.slots_in_epoch);
    s.absoluteSlot = num(epoch.absolute_slot);
    s.blockHeight = num(epoch.block_height);
  }
  s.epochProgressPct =
    s.slotIndex !== null && s.slotsInEpoch && s.slotsInEpoch > 0
      ? (s.slotIndex / s.slotsInEpoch) * 100
      : null;

  const vote = asObject(root.vote);
  if (vote) {
    s.voteLatest = num(vote.latest);
    s.voteRoot = num(vote.root);
  }
  s.voteLag = diff(s.voteLatest, s.voteRoot);

  const bp = asObject(root.block_production);
  if (bp) {
    s.blocksProduced = num(bp.produced);
    s.blocksDropped = num(bp.dropped);
  }
  s.dropRatePct =
    s.blocksProduced !== null &&
    s.blocksDropped !== null &&
    s.blocksProduced + s.blocksDropped > 0
      ? (s.blocksDropped / (s.blocksProduced + s.blocksDropped)) * 100
      : null;

  const lp = asObject(root.leader_production);
  if (lp) {
    const slots = Array.isArray(lp.leader_slots)
      ? lp.leader_slots.filter((x): x is number => typeof x === "number")
      : [];
    const history = Array.isArray(lp.skip_history)
      ? lp.skip_history.flatMap((h) => {
          const o = asObject(h);
          const epoch = o ? num(o.epoch) : null;
          const rate = o ? num(o.skip_rate_pct) : null;
          return epoch !== null && rate !== null
            ? [{ epoch, skipRatePct: rate }]
            : [];
        })
      : [];
    s.leaderProduction = {
      epoch: num(lp.epoch),
      epochStartSlot: num(lp.epoch_start_slot),
      epochEndSlot: num(lp.epoch_end_slot),
      currentSlot: num(lp.current_slot),
      leaderSlots: slots,
      produced: num(lp.produced),
      skipped: num(lp.skipped),
      skipRatePct: num(lp.skip_rate_pct),
      clusterSkipRatePct: num(lp.cluster_skip_rate_pct),
      nextLeaderSlot: num(lp.next_leader_slot),
      skipHistory: history,
    };
  }

  const forkWeight = num(root.fork_weight);
  s.forkWeightPct = forkWeight === null ? null : forkWeight * 100;

  const system = asObject(root.system);
  if (system) {
    s.ledgerDisk = disk(system.ledger_disk);
    s.accountsDisk = disk(system.accounts_disk);
    s.memory = disk(system.memory);
    s.loadAvg = Array.isArray(system.load_avg)
      ? system.load_avg
          .map((x) => num(x))
          .filter((x): x is number => x !== null)
      : null;
    if (s.loadAvg && s.loadAvg.length !== 3) s.loadAvg = null;
    s.cpuCores = num(system.cpu_cores);
    s.uptimeSeconds = num(system.uptime_seconds);
    s.processActive = bool(system.process_active);
  }

  const va = asObject(root.vote_account);
  if (va) {
    s.voteAccountStale = va.stale === true;
    s.voteAccountFetchedAt = parseDate(va.fetched_at);
    s.creditsLifetime = num(va.credits_lifetime);
    s.commissionPct = num(va.commission_pct);
    s.activatedStakeSol = num(va.activated_stake_sol);
    s.epochCredits = Array.isArray(va.epoch_credits)
      ? va.epoch_credits.map((c): EpochCredit => {
          const o = asObject(c);
          return {
            epoch: o ? num(o.epoch) : null,
            credits: o ? num(o.credits) : null,
            max: o ? num(o.max) : null,
          };
        })
      : [];
    s.recentVotes = Array.isArray(va.recent_votes)
      ? va.recent_votes
          .map((r): RecentVote | null => {
            const o = asObject(r);
            const slot = o ? num(o.slot) : null;
            return slot === null
              ? null
              : { slot, latency: o ? num(o.latency) : null };
          })
          .filter((r): r is RecentVote => r !== null)
      : [];
  }

  s.events = Array.isArray(root.events)
    ? root.events.map((e): EventItem => {
        const o = asObject(e);
        const level = o ? str(o.level) : null;
        return {
          ts: o ? str(o.ts) : null,
          level: level === "WARN" || level === "ERROR" ? level : null,
          msg: (o ? str(o.msg) : null) ?? "",
        };
      })
    : [];

  s.errors = strArray(root.errors);
  return s;
}

/** Normalize a raw history window into a HistorySeries. Never throws. */
export function parseHistory(raw: unknown): HistorySeries {
  const root = asObject(raw);
  const empty: HistorySeries = {
    ok: false,
    window: null,
    resolutionSeconds: null,
    points: [],
  };
  if (root === null || root.schema_version !== SCHEMA_VERSION) return empty;

  const points: HistoryPoint[] = Array.isArray(root.points)
    ? root.points.map((p): HistoryPoint => {
        const o = asObject(p);
        return {
          t: o ? parseDate(o.t) : null,
          processed: o ? num(o.processed) : null,
          finalized: o ? num(o.finalized) : null,
          voteLag: o ? num(o.vote_lag) : null,
          identitySol: o ? num(o.identity_sol) : null,
          memPct: o ? num(o.mem_pct) : null,
          txPerSlot: o ? num(o.tx_per_slot) : null,
          dropRatePct: o ? num(o.drop_rate_pct) : null,
        };
      })
    : [];

  return {
    ok: true,
    window: str(root.window),
    resolutionSeconds: num(root.resolution_seconds),
    points,
  };
}
