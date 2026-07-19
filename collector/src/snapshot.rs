//! The collector's single seam: `build_snapshot`.
//!
//! One pure assembler over already-fetched raw source outputs. No I/O, no clock, no
//! network inside; `now` and `prev_state` are arguments, so it is deterministic. Any
//! missing input becomes a null field plus an entry in `errors`, never a panic.
//!
//! Issue #9 wires the first real source (the log datapoint parser); issue #13 rolls the
//! history windows across cycles via `prev_state`. The other sources (monitor, RPC, OS
//! stats, vote account) are filled by later slices; until then their fields stay null.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde_json::{Map, Value as Json};

use crate::datapoints::{latest_datapoint, Value};
use crate::derive::{drop_rate_pct, vote_lag};
use crate::event::build_events;
use crate::monitor::parse_monitor;
use crate::osstats::{parse_os_stats, OsStatsInput};
use crate::redact::Redactor;
use crate::rpc::{parse_activated_stake, parse_balance, parse_epoch_info, parse_health, parse_version};
use crate::blockproduction::{next_leader_slot, parse_block_production, skip_rate_pct};
use crate::config;
use crate::schema::{
    empty_history, empty_latest, EpochSkip, History, HistoryPoint, Latest, LeaderProduction,
    Version, VoteAccount,
};
use crate::voteaccount::parse_vote_account;
use crate::window::roll;

// History window cadence (append interval) and retention span, per docs/dashboard.md:
// 1h at 10s (~360 points), 24h at 60s (~1440 points).
const H1_RESOLUTION_S: i64 = 10;
const H24_RESOLUTION_S: i64 = 60;
const H1_WINDOW_S: i64 = 3600;
const H24_WINDOW_S: i64 = 86_400;
const STATE_H1: &str = "history_1h";
const STATE_H24: &str = "history_24h";

// Vote account is stale only if the last good fetch is older than this (> 2 missed 5-min
// windows); within normal cadence a carried-forward value is fresh.
const VOTE_STALE_AFTER_S: i64 = 11 * 60;

/// Parse an `iso_z`-formatted timestamp (as written to `fetched_at`), else None.
fn parse_iso_z(s: &str) -> Option<DateTime<Utc>> {
    chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%SZ")
        .ok()
        .map(|n| n.and_utc())
}

/// Load a persisted point series from `prev_state`; missing or malformed -> empty.
fn read_points(state: Option<&Map<String, Json>>, key: &str) -> Vec<HistoryPoint> {
    state
        .and_then(|s| s.get(key))
        .and_then(|v| serde_json::from_value::<Vec<HistoryPoint>>(v.clone()).ok())
        .unwrap_or_default()
}

/// Already-fetched raw source outputs. Grows as sources are added (#11).
#[derive(Debug, Clone, Default)]
pub struct Inputs {
    pub log_lines: Option<Vec<String>>,
    /// Raw `agave-validator monitor` output (issue #10).
    pub monitor_output: Option<String>,
    /// Raw localhost `getHealth` / `getEpochInfo` / `getVersion` responses (issue #10, Source B).
    pub rpc_health: Option<String>,
    pub rpc_epoch_info: Option<String>,
    pub rpc_version: Option<String>,
    /// Raw localhost `getBalance` for the identity (issue #10).
    pub rpc_balance: Option<String>,
    /// Whether the node runs jito-solana (getVersion can't tell); from config.
    pub jito_client: Option<bool>,
    /// Captured OS-stat command outputs (issue #11, Source D).
    pub os_stats: Option<OsStatsInput>,
    /// Raw `solana vote-account --output json` (issue #11, Source E).
    pub vote_account_json: Option<String>,
    /// Raw localhost `getVoteAccounts` — only for activated stake, which the CLI omits (#11).
    pub vote_accounts_json: Option<String>,
    /// Epoch the leader schedule below belongs to (current, or next when the current has none
    /// of our slots). Pairs with `leader_slots`.
    pub leader_epoch: Option<i64>,
    /// Our leader slots for `leader_epoch` (absolute, sorted), pre-parsed from `solana
    /// leader-schedule` and cached by the caller — the raw text is the whole cluster's
    /// schedule (~26 MB), so it is filtered to our identity before it reaches here.
    pub leader_slots: Option<Vec<i64>>,
    /// Raw localhost `getBlockProduction` for our identity (produced/skipped counts).
    pub block_production_json: Option<String>,
    pub identity_pubkey: Option<String>,
    pub vote_pubkey: Option<String>,
    pub cluster: String,
}

impl Inputs {
    /// `cluster` defaults to "testnet", matching the Python dataclass default.
    pub fn new() -> Self {
        Inputs {
            cluster: "testnet".to_string(),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone)]
pub struct SnapshotResult {
    pub latest: Latest,
    pub history_1h: History,
    pub history_24h: History,
    pub new_state: Map<String, Json>,
    pub errors: Vec<String>,
}

fn iso_z(now: DateTime<Utc>) -> String {
    now.format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

pub fn build_snapshot(
    inputs: &Inputs,
    now: DateTime<Utc>,
    prev_state: Option<&Map<String, Json>>,
) -> SnapshotResult {
    let generated_at = iso_z(now);
    let cluster = if inputs.cluster.is_empty() {
        "testnet"
    } else {
        inputs.cluster.as_str()
    };
    let mut latest = empty_latest(
        &generated_at,
        inputs.identity_pubkey.clone(),
        inputs.vote_pubkey.clone(),
        cluster,
    );
    let mut errors: Vec<String> = Vec::new();

    let empty: Vec<String> = Vec::new();
    let lines = match &inputs.log_lines {
        Some(l) if !l.is_empty() => l.as_slice(),
        _ => {
            errors.push("log: no lines available".to_string());
            empty.as_slice()
        }
    };

    // The redactor is the single sanitization choke point (issue #12): the node's own two
    // pubkeys are the whitelist, everything else that looks sensitive is scrubbed. Used for
    // both the event feed and the shipped errors[].
    let redactor = Redactor::new(
        [&inputs.identity_pubkey, &inputs.vote_pubkey]
            .into_iter()
            .flatten()
            .cloned(),
    );

    // Redacted event feed from the same log lines (issue #12).
    latest.events = build_events(lines, &redactor);

    // Fetch a named datapoint, recording a not-found error when absent.
    let mut require = |name: &str| -> Option<HashMap<String, Value>> {
        let fields = latest_datapoint(lines, name);
        if fields.is_none() {
            errors.push(format!("{name}: not found in log"));
        }
        fields
    };

    if let Some(tower) = require("tower-vote") {
        latest.vote.latest = tower.get("latest").and_then(Value::as_int);
        latest.vote.root = tower.get("root").and_then(Value::as_int);
    }

    if let Some(blocks) = require("blocks_produced") {
        latest.block_production.produced = blocks.get("num_blocks_on_fork").and_then(Value::as_int);
        latest.block_production.dropped = blocks
            .get("num_dropped_blocks_on_fork")
            .and_then(Value::as_int);
    }

    if let Some(bank_weight) = require("bank_weight") {
        latest.fork_weight = bank_weight.get("fork_weight").and_then(Value::as_float);
    }

    if let Some(commitment) = require("block-commitment-cache") {
        latest.slots.confirmed = commitment.get("highest-confirmed-slot").and_then(Value::as_int);
        latest.slots.finalized = commitment
            .get("highest-super-majority-root")
            .and_then(Value::as_int);
    }

    if let Some(heights) = require("bank-new_from_parent-heights") {
        latest.epoch.block_height = heights.get("block_height").and_then(Value::as_int);
    }

    let replay = require("replay-slot-stats");
    let tx_per_slot = replay
        .as_ref()
        .and_then(|r| r.get("total_transactions"))
        .and_then(Value::as_int);

    // Monitor is the authoritative source for the five slot numbers (issue #10). It
    // overrides the log-datapoint values above; where the monitor omits a field, the
    // datapoint value survives (`.or`), giving graceful degradation when either is absent.
    match inputs.monitor_output.as_deref() {
        Some(out) => match parse_monitor(out) {
            Some(s) => {
                latest.slots.processed = s.processed.or(latest.slots.processed);
                latest.slots.confirmed = s.confirmed.or(latest.slots.confirmed);
                latest.slots.finalized = s.finalized.or(latest.slots.finalized);
                latest.slots.full_snapshot = s.full_snapshot.or(latest.slots.full_snapshot);
                latest.slots.incremental_snapshot =
                    s.incremental_snapshot.or(latest.slots.incremental_snapshot);
            }
            None => errors.push("monitor: no status line found".to_string()),
        },
        None => errors.push("monitor: no output available".to_string()),
    }

    // Localhost RPC (issue #10, Source B): cheap methods only. Each independent.
    match inputs.rpc_health.as_deref().map(parse_health) {
        Some(Some(h)) => latest.health = Some(h),
        Some(None) => errors.push("getHealth: unparseable".to_string()),
        None => errors.push("getHealth: not available".to_string()),
    }
    match inputs.rpc_epoch_info.as_deref().map(parse_epoch_info) {
        Some(Some(e)) => {
            latest.epoch.epoch = e.epoch;
            latest.epoch.slot_index = e.slot_index;
            latest.epoch.slots_in_epoch = e.slots_in_epoch;
            latest.epoch.absolute_slot = e.absolute_slot;
            // getEpochInfo is authoritative for block height; datapoint value is the fallback.
            latest.epoch.block_height = e.block_height.or(latest.epoch.block_height);
            latest.slots.network_tx_total = e.transaction_count;
        }
        Some(None) => errors.push("getEpochInfo: unparseable".to_string()),
        None => errors.push("getEpochInfo: not available".to_string()),
    }
    match inputs.rpc_version.as_deref().map(parse_version) {
        // getVersion has no jito marker; the flag comes from config (issue #10).
        Some(Some(v)) => latest.version = Some(Version { jito: inputs.jito_client, ..v }),
        Some(None) => errors.push("getVersion: unparseable".to_string()),
        None => errors.push("getVersion: not available".to_string()),
    }
    match inputs.rpc_balance.as_deref().map(parse_balance) {
        Some(Some(sol)) => latest.identity_balance_sol = Some(sol),
        Some(None) => errors.push("getBalance: unparseable".to_string()),
        None => errors.push("getBalance: not available".to_string()),
    }

    // OS stats (issue #11, Source D): each reading independent, missing -> null field.
    match &inputs.os_stats {
        Some(os) => {
            let st = parse_os_stats(os, now);
            latest.system.ledger_disk = st.ledger_disk;
            latest.system.accounts_disk = st.accounts_disk;
            latest.system.memory = st.memory;
            latest.system.load_avg = st.load_avg;
            latest.system.cpu_cores = st.cpu_cores;
            latest.system.uptime_seconds = st.uptime_seconds;
            latest.system.process_active = st.process_active;
        }
        None => errors.push("os stats: not available".to_string()),
    }

    // Vote account (issue #11): fetched on a ~5-min cadence. Between fetches we carry the
    // last value forward and only mark it stale once it's genuinely old (fetches failing).
    match inputs.vote_account_json.as_deref().map(parse_vote_account) {
        Some(Some(d)) => {
            // Activated stake comes from getVoteAccounts (the CLI omits it); rest from the CLI.
            let activated = inputs
                .vote_accounts_json
                .as_deref()
                .and_then(parse_activated_stake);
            latest.vote_account = VoteAccount {
                stale: false,
                fetched_at: Some(generated_at.clone()),
                credits_lifetime: d.credits_lifetime,
                commission_pct: d.commission_pct,
                activated_stake_sol: activated.or(d.activated_stake_sol),
                epoch_credits: d.epoch_credits,
                recent_votes: d.recent_votes,
            };
        }
        Some(None) => errors.push("vote-account: unparseable json".to_string()),
        None => {
            match prev_state
                .and_then(|s| s.get("vote_account"))
                .and_then(|v| serde_json::from_value::<VoteAccount>(v.clone()).ok())
            {
                Some(prev) => {
                    let age = prev
                        .fetched_at
                        .as_deref()
                        .and_then(parse_iso_z)
                        .map(|t| (now - t).num_seconds());
                    let stale = age.is_none_or(|s| s > VOTE_STALE_AFTER_S);
                    latest.vote_account = VoteAccount { stale, ..prev };
                }
                None => errors.push("vote-account: not available".to_string()),
            }
        }
    }

    // Leader production (block-production section). The schedule (for the display epoch) is
    // carried in already parsed; getBlockProduction gives the produced/skipped split. Empty
    // (no leader_slots) until a schedule has been fetched — the frontend then shows its
    // awaiting state rather than fake zeros.
    {
        let identity = inputs
            .identity_pubkey
            .as_deref()
            .unwrap_or(config::IDENTITY_PUBKEY);
        let current = latest.epoch.absolute_slot.or(latest.slots.processed);
        let schedule = inputs.leader_slots.clone().unwrap_or_default();
        let counts = inputs
            .block_production_json
            .as_deref()
            .and_then(|j| parse_block_production(j, identity))
            .unwrap_or_default();
        let skip = skip_rate_pct(&counts);

        // Slot bounds of the display epoch, so the frontend can position ticks. The current
        // epoch spans [absolute - slot_index, +slots_in_epoch); the display epoch may be the
        // next one, so shift by that many epochs.
        let cur_epoch = latest.epoch.epoch;
        let disp_epoch = inputs.leader_epoch.or(cur_epoch);
        let slots_in_epoch = latest.epoch.slots_in_epoch;
        let cur_start = latest
            .epoch
            .absolute_slot
            .zip(latest.epoch.slot_index)
            .map(|(abs, idx)| abs - idx);
        let (epoch_start_slot, epoch_end_slot) = match (cur_start, slots_in_epoch, cur_epoch, disp_epoch) {
            (Some(cs), Some(len), Some(ce), Some(de)) => {
                let start = cs + (de - ce) * len;
                (Some(start), Some(start + len))
            }
            _ => (None, None),
        };

        // Skip history: carry the prior array forward and upsert the display epoch's current
        // rate, so each closed epoch keeps its last value and the current one updates live.
        let mut skip_history: Vec<EpochSkip> = prev_state
            .and_then(|s| s.get("leader_production"))
            .and_then(|lp| lp.get("skip_history"))
            .and_then(|h| serde_json::from_value::<Vec<EpochSkip>>(h.clone()).ok())
            .unwrap_or_default();
        if let (Some(ep), Some(rate)) = (disp_epoch, skip) {
            match skip_history.iter_mut().find(|e| e.epoch == ep) {
                Some(e) => e.skip_rate_pct = rate,
                None => skip_history.push(EpochSkip { epoch: ep, skip_rate_pct: rate }),
            }
            skip_history.sort_by_key(|e| e.epoch);
            let overflow = skip_history.len().saturating_sub(8);
            skip_history.drain(0..overflow);
        }

        latest.leader_production = LeaderProduction {
            epoch: disp_epoch,
            epoch_start_slot,
            epoch_end_slot,
            current_slot: current,
            next_leader_slot: current.and_then(|c| next_leader_slot(&schedule, c)),
            leader_slots: schedule,
            produced: counts.produced,
            skipped: counts.skipped,
            skip_rate_pct: skip,
            // Cluster comparison: getBlockProduction with no identity filter gives cluster
            // totals. Wired once verified on the box; None keeps the frontend honest until then.
            cluster_skip_rate_pct: None,
            skip_history,
        };
    }

    // The current point carries the datapoint -> derived values for this cycle.
    let point = HistoryPoint {
        t: generated_at.clone(),
        processed: latest.slots.processed,
        finalized: latest.slots.finalized,
        vote_lag: vote_lag(latest.vote.latest, latest.vote.root),
        identity_sol: latest.identity_balance_sol,
        mem_pct: latest.system.memory.pct,
        tx_per_slot,
        drop_rate_pct: drop_rate_pct(
            latest.block_production.produced,
            latest.block_production.dropped,
        ),
    };

    // Roll each window forward from its persisted series (issue #13): append at cadence,
    // trim to retention. State carries the full series between cycles.
    let mut history_1h = empty_history("1h", H1_RESOLUTION_S, &generated_at);
    history_1h.points = roll(
        read_points(prev_state, STATE_H1),
        point.clone(),
        now,
        H1_RESOLUTION_S,
        H1_WINDOW_S,
    );
    let mut history_24h = empty_history("24h", H24_RESOLUTION_S, &generated_at);
    history_24h.points = roll(
        read_points(prev_state, STATE_H24),
        point,
        now,
        H24_RESOLUTION_S,
        H24_WINDOW_S,
    );

    // Collector-generated errors carry no secrets today, but I/O sources (#10, #11) will
    // surface paths and peer addresses, so errors[] pass through the same redactor (#12).
    let errors: Vec<String> = errors.iter().map(|e| redactor.redact(e)).collect();

    latest.errors = errors.clone();

    // Persist the rolled windows so the next cycle continues the same series (issue #13).
    let mut new_state = prev_state.cloned().unwrap_or_default();
    new_state.insert(
        STATE_H1.into(),
        serde_json::to_value(&history_1h.points).unwrap(),
    );
    new_state.insert(
        STATE_H24.into(),
        serde_json::to_value(&history_24h.points).unwrap(),
    );
    // Keep the vote account so a cycle with no fresh fetch can carry it forward (#11).
    new_state.insert(
        "vote_account".into(),
        serde_json::to_value(&latest.vote_account).unwrap(),
    );

    SnapshotResult {
        latest,
        history_1h,
        history_24h,
        new_state,
        errors,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        "2026-07-08T09:59:07Z".parse().unwrap()
    }

    #[test]
    fn no_log_lines_yields_errors_and_null_fields() {
        let inputs = Inputs::new();
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.generated_at, "2026-07-08T09:59:07Z");
        assert!(out.latest.vote.latest.is_none());
        assert!(out.errors.contains(&"log: no lines available".to_string()));
        assert!(out.errors.contains(&"tower-vote: not found in log".to_string()));
        assert!(out.errors.contains(&"monitor: no output available".to_string()));
        assert!(out.latest.slots.processed.is_none());
        // errors on the payload mirror the returned errors vec.
        assert_eq!(out.latest.errors, out.errors);
        // First cycle seeds one point into each window (issue #13).
        assert_eq!(out.history_1h.points.len(), 1);
        assert_eq!(out.history_24h.points.len(), 1);
    }

    #[test]
    fn monitor_fills_slots_and_feeds_history_point() {
        let inputs = Inputs {
            monitor_output: Some(
                "⠉ 45:38:22 | Processed Slot: 420608112 | Confirmed Slot: 420608112 | \
Finalized Slot: 420608080 | Full Snapshot Slot: 420524209 | \
Incremental Snapshot Slot: 420608053"
                    .to_string(),
            ),
            ..Inputs::new()
        };
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.slots.processed, Some(420608112));
        assert_eq!(out.latest.slots.finalized, Some(420608080));
        assert_eq!(out.latest.slots.incremental_snapshot, Some(420608053));
        // slots flow into the current history point.
        let p = &out.history_1h.points[0];
        assert_eq!(p.processed, Some(420608112));
        assert_eq!(p.finalized, Some(420608080));
    }

    #[test]
    fn monitor_overrides_datapoint_slots() {
        // block-commitment-cache datapoint gives confirmed/finalized; monitor wins.
        let inputs = Inputs {
            log_lines: Some(vec![
                "datapoint: block-commitment-cache highest-confirmed-slot=1i highest-super-majority-root=2i".to_string(),
            ]),
            monitor_output: Some(
                "x | Processed Slot: 9 | Confirmed Slot: 99 | Finalized Slot: 999".to_string(),
            ),
            ..Inputs::new()
        };
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.slots.confirmed, Some(99));
        assert_eq!(out.latest.slots.finalized, Some(999));
    }

    #[test]
    fn rpc_fills_epoch_health_version() {
        let inputs = Inputs {
            rpc_health: Some(r#"{"result":"ok","id":1}"#.to_string()),
            rpc_epoch_info: Some(
                r#"{"result":{"absoluteSlot":420622837,"blockHeight":372696907,"epoch":986,"slotIndex":194581,"slotsInEpoch":432000,"transactionCount":690208996359},"id":1}"#
                    .to_string(),
            ),
            rpc_version: Some(r#"{"result":{"feature-set":3345198602,"solana-core":"4.1.1"},"id":1}"#.to_string()),
            ..Inputs::new()
        };
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.health.unwrap().rpc.as_deref(), Some("ok"));
        assert_eq!(out.latest.epoch.epoch, Some(986));
        assert_eq!(out.latest.epoch.slots_in_epoch, Some(432000));
        assert_eq!(out.latest.epoch.block_height, Some(372696907));
        assert_eq!(out.latest.slots.network_tx_total, Some(690208996359));
        let v = out.latest.version.unwrap();
        assert_eq!(v.version.as_deref(), Some("4.1.1"));
        assert_eq!(v.jito, None);
    }

    #[test]
    fn os_stats_fill_system_and_history_mem_pct() {
        let inputs = Inputs {
            os_stats: Some(crate::osstats::OsStatsInput {
                meminfo: Some("MemTotal: 100 kB\nMemAvailable: 25 kB\n".to_string()),
                loadavg: Some("6.42 6.01 5.67 2/1013 70431".to_string()),
                ..Default::default()
            }),
            ..Inputs::new()
        };
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.system.memory.pct, Some(75.0));
        assert_eq!(out.latest.system.load_avg, Some(vec![6.42, 6.01, 5.67]));
        assert_eq!(out.history_1h.points[0].mem_pct, Some(75.0));
    }

    #[test]
    fn vote_account_carries_forward_fresh_then_stale_when_old() {
        let json = r#"{"credits":2218603,"commission":100,
            "epochVotingHistory":[{"epoch":986,"slotsInEpoch":432000,"creditsEarned":978616,"maxCreditsPerSlot":16}]}"#;
        let fresh = Inputs {
            vote_account_json: Some(json.to_string()),
            ..Inputs::new()
        };
        let t0: DateTime<Utc> = "2026-07-08T00:00:00Z".parse().unwrap();
        let c0 = build_snapshot(&fresh, t0, None);
        assert!(!c0.latest.vote_account.stale);
        assert_eq!(c0.latest.vote_account.credits_lifetime, Some(2218603));

        // +2 min, no fresh fetch: carry forward, still fresh (within cadence).
        let t1: DateTime<Utc> = "2026-07-08T00:02:00Z".parse().unwrap();
        let c1 = build_snapshot(&Inputs::new(), t1, Some(&c0.new_state));
        assert!(!c1.latest.vote_account.stale);
        assert_eq!(c1.latest.vote_account.fetched_at, c0.latest.vote_account.fetched_at);

        // +15 min with still no fetch: now genuinely stale.
        let t2: DateTime<Utc> = "2026-07-08T00:15:00Z".parse().unwrap();
        let c2 = build_snapshot(&Inputs::new(), t2, Some(&c1.new_state));
        assert!(c2.latest.vote_account.stale);
        assert_eq!(c2.latest.vote_account.credits_lifetime, Some(2218603));
    }

    #[test]
    fn windows_roll_and_persist_across_cycles() {
        let inputs = Inputs::new();
        let t0: DateTime<Utc> = "2026-07-08T00:00:00Z".parse().unwrap();
        let c0 = build_snapshot(&inputs, t0, None);
        assert_eq!(c0.history_1h.points.len(), 1);

        // +10s: 1h cadence elapsed -> appends; 24h cadence (60s) not -> stays at 1.
        let t1: DateTime<Utc> = "2026-07-08T00:00:10Z".parse().unwrap();
        let c1 = build_snapshot(&inputs, t1, Some(&c0.new_state));
        assert_eq!(c1.history_1h.points.len(), 2);
        assert_eq!(c1.history_24h.points.len(), 1);

        // +60s from t0: 24h cadence now elapsed -> appends its second point.
        let t2: DateTime<Utc> = "2026-07-08T00:01:00Z".parse().unwrap();
        let c2 = build_snapshot(&inputs, t2, Some(&c1.new_state));
        assert_eq!(c2.history_24h.points.len(), 2);

        // A point older than the 1h retention span is trimmed on a later cycle.
        let t3: DateTime<Utc> = "2026-07-08T01:00:11Z".parse().unwrap();
        let c3 = build_snapshot(&inputs, t3, Some(&c2.new_state));
        assert!(c3
            .history_1h
            .points
            .iter()
            .all(|p| p.t != "2026-07-08T00:00:00Z"));
    }

    #[test]
    fn fills_fields_and_derives_from_datapoints() {
        let inputs = Inputs {
            log_lines: Some(vec![
                "datapoint: tower-vote latest=100i root=90i".to_string(),
                "datapoint: blocks_produced num_blocks_on_fork=95i num_dropped_blocks_on_fork=5i"
                    .to_string(),
                "datapoint: bank_weight fork_weight=0.5".to_string(),
                "datapoint: block-commitment-cache highest-confirmed-slot=200i highest-super-majority-root=180i".to_string(),
                "datapoint: replay-slot-stats total_transactions=1234i".to_string(),
            ]),
            ..Inputs::new()
        };
        let out = build_snapshot(&inputs, now(), None);
        assert_eq!(out.latest.vote.latest, Some(100));
        assert_eq!(out.latest.vote.root, Some(90));
        assert_eq!(out.latest.fork_weight, Some(0.5));
        assert_eq!(out.latest.slots.finalized, Some(180));

        let p = &out.history_1h.points[0];
        assert_eq!(p.vote_lag, Some(10));
        assert_eq!(p.finalized, Some(180));
        assert_eq!(p.tx_per_slot, Some(1234));
        assert_eq!(p.drop_rate_pct, Some(5.0));
        // bank-new_from_parent-heights absent -> recorded error.
        assert!(out
            .errors
            .contains(&"bank-new_from_parent-heights: not found in log".to_string()));
    }

    #[test]
    fn prev_state_is_carried_forward() {
        let mut prev = Map::new();
        prev.insert("seen".to_string(), Json::from(7));
        let out = build_snapshot(&Inputs::new(), now(), Some(&prev));
        assert_eq!(out.new_state["seen"], Json::from(7));
    }
}
