//! The JSON contract, mirrored from docs/dashboard.md (Schema).
//!
//! This is the Rust side of the same contract the frontend types in
//! src/dashboard/types.ts mirror. Edit both together when the schema changes.
//! Every field is `null` until its source fills it; derivations are done by the
//! frontend for latest.json and by the collector for history points.
//!
//! `Option::None` serializes to JSON `null` (no `skip_serializing_if`), so a
//! source-unfilled field stays present-and-null in the output, as the contract requires.

use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u32 = 1;

/// A redacted log event for the feed (issue #12). Mirrors `RawEvent` in types.ts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Event {
    pub ts: Option<String>,
    pub level: Option<String>,
    pub msg: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Disk {
    pub pct: Option<f64>,
    pub used_gb: Option<f64>,
    pub total_gb: Option<f64>,
}

impl Disk {
    pub fn empty() -> Self {
        Disk {
            pct: None,
            used_gb: None,
            total_gb: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Slots {
    pub processed: Option<i64>,
    pub confirmed: Option<i64>,
    pub finalized: Option<i64>,
    pub full_snapshot: Option<i64>,
    pub incremental_snapshot: Option<i64>,
    pub network_tx_total: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Epoch {
    pub epoch: Option<i64>,
    pub slot_index: Option<i64>,
    pub slots_in_epoch: Option<i64>,
    pub absolute_slot: Option<i64>,
    pub block_height: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Vote {
    pub latest: Option<i64>,
    pub root: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BlockProduction {
    pub produced: Option<i64>,
    pub dropped: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct System {
    pub ledger_disk: Disk,
    pub accounts_disk: Disk,
    pub memory: Disk,
    /// [1, 5, 15]-minute load averages, or null. Mirrors `load_avg: number[] | null`.
    pub load_avg: Option<Vec<f64>>,
    pub cpu_cores: Option<i64>,
    pub uptime_seconds: Option<i64>,
    pub process_active: Option<bool>,
}

/// Per-epoch vote credits. Mirrors `RawEpochCredit` in types.ts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EpochCredit {
    pub epoch: Option<i64>,
    pub credits: Option<i64>,
    pub max: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteAccount {
    pub stale: bool,
    pub fetched_at: Option<String>,
    pub credits_lifetime: Option<i64>,
    pub commission_pct: Option<f64>,
    pub activated_stake_sol: Option<f64>,
    pub epoch_credits: Option<Vec<EpochCredit>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Latest {
    pub schema_version: u32,
    pub generated_at: String,
    pub cluster: String,
    pub identity_pubkey: Option<String>,
    pub vote_pubkey: Option<String>,
    pub health: Option<String>,
    pub version: Option<String>,
    pub slots: Slots,
    pub identity_balance_sol: Option<f64>,
    pub epoch: Epoch,
    pub vote: Vote,
    pub block_production: BlockProduction,
    pub fork_weight: Option<f64>,
    pub system: System,
    pub vote_account: VoteAccount,
    pub events: Vec<Event>,
    pub errors: Vec<String>,
}

/// A schema-valid latest.json with every source-filled field null.
pub fn empty_latest(
    generated_at: &str,
    identity_pubkey: Option<String>,
    vote_pubkey: Option<String>,
    cluster: &str,
) -> Latest {
    Latest {
        schema_version: SCHEMA_VERSION,
        generated_at: generated_at.to_string(),
        cluster: cluster.to_string(),
        identity_pubkey,
        vote_pubkey,
        health: None,
        version: None,
        slots: Slots {
            processed: None,
            confirmed: None,
            finalized: None,
            full_snapshot: None,
            incremental_snapshot: None,
            network_tx_total: None,
        },
        identity_balance_sol: None,
        epoch: Epoch {
            epoch: None,
            slot_index: None,
            slots_in_epoch: None,
            absolute_slot: None,
            block_height: None,
        },
        vote: Vote {
            latest: None,
            root: None,
        },
        block_production: BlockProduction {
            produced: None,
            dropped: None,
        },
        fork_weight: None,
        system: System {
            ledger_disk: Disk::empty(),
            accounts_disk: Disk::empty(),
            memory: Disk::empty(),
            load_avg: None,
            cpu_cores: None,
            uptime_seconds: None,
            process_active: None,
        },
        vote_account: VoteAccount {
            stale: false,
            fetched_at: None,
            credits_lifetime: None,
            commission_pct: None,
            activated_stake_sol: None,
            epoch_credits: None,
        },
        events: Vec::new(),
        errors: Vec::new(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryPoint {
    pub t: String,
    pub processed: Option<i64>,
    pub finalized: Option<i64>,
    pub vote_lag: Option<i64>,
    pub identity_sol: Option<f64>,
    pub mem_pct: Option<f64>,
    pub tx_per_slot: Option<i64>,
    pub drop_rate_pct: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct History {
    pub schema_version: u32,
    pub window: String,
    pub resolution_seconds: i64,
    pub generated_at: String,
    pub points: Vec<HistoryPoint>,
}

/// A schema-valid, empty history window. Windows are filled in issue #13.
pub fn empty_history(window: &str, resolution_seconds: i64, generated_at: &str) -> History {
    History {
        schema_version: SCHEMA_VERSION,
        window: window.to_string(),
        resolution_seconds,
        generated_at: generated_at.to_string(),
        points: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_latest_is_null_but_present() {
        let latest = empty_latest("2026-07-08T00:00:00Z", None, None, "testnet");
        let v = serde_json::to_value(&latest).unwrap();
        assert_eq!(v["schema_version"], 1);
        assert!(v["vote"]["latest"].is_null());
        assert!(v["system"]["ledger_disk"]["pct"].is_null());
        assert_eq!(v["vote_account"]["stale"], false);
        assert!(v["events"].as_array().unwrap().is_empty());
    }

    #[test]
    fn empty_history_carries_window_metadata() {
        let h = empty_history("1h", 10, "2026-07-08T00:00:00Z");
        let v = serde_json::to_value(&h).unwrap();
        assert_eq!(v["window"], "1h");
        assert_eq!(v["resolution_seconds"], 10);
        assert!(v["points"].as_array().unwrap().is_empty());
    }
}
