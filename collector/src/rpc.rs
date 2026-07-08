//! Localhost RPC mappers (issue #10, Source B).
//!
//! Pure parsers over the JSON-RPC responses of the cheap localhost methods:
//! `getHealth`, `getEpochInfo`, `getVersion`. Each takes the raw response body and reads
//! the `result` field. Verified against real box output.
//!
//! Jito note: `getVersion` returns only `solana-core` + `feature-set` — there is no jito
//! marker in RPC, so `Version.jito` is always None here. Real jito detection needs the
//! service cmdline / config, wired in the I/O shell (#14).

use serde_json::Value;

use crate::schema::{Health, Version};

/// The five epoch/chain numbers from `getEpochInfo.result`.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct EpochInfo {
    pub epoch: Option<i64>,
    pub slot_index: Option<i64>,
    pub slots_in_epoch: Option<i64>,
    pub absolute_slot: Option<i64>,
    pub block_height: Option<i64>,
    pub transaction_count: Option<i64>,
}

/// Map `getHealth`. `{"result":"ok"}` -> rpc="ok"; an error envelope -> rpc="behind"
/// (anything not "ok" reads as unhealthy on the pill); unparseable -> None.
pub fn parse_health(json: &str) -> Option<Health> {
    let v: Value = serde_json::from_str(json).ok()?;
    let rpc = match &v["result"] {
        Value::String(s) => Some(s.clone()),
        _ if v.get("error").is_some() => Some("behind".to_string()),
        _ => None,
    };
    Some(Health { rpc })
}

/// Map `getEpochInfo.result` -> the five numbers + transaction count. Unparseable -> None.
pub fn parse_epoch_info(json: &str) -> Option<EpochInfo> {
    let v: Value = serde_json::from_str(json).ok()?;
    let r = &v["result"];
    if !r.is_object() {
        return None;
    }
    Some(EpochInfo {
        epoch: r["epoch"].as_i64(),
        slot_index: r["slotIndex"].as_i64(),
        slots_in_epoch: r["slotsInEpoch"].as_i64(),
        absolute_slot: r["absoluteSlot"].as_i64(),
        block_height: r["blockHeight"].as_i64(),
        transaction_count: r["transactionCount"].as_i64(),
    })
}

/// Map `getVersion.result` -> client version. `jito` is always None (see module note).
pub fn parse_version(json: &str) -> Option<Version> {
    let v: Value = serde_json::from_str(json).ok()?;
    let r = &v["result"];
    if !r.is_object() {
        return None;
    }
    Some(Version {
        version: r["solana-core"].as_str().map(str::to_string),
        jito: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_get_health() {
        assert_eq!(
            parse_health(r#"{"jsonrpc":"2.0","result":"ok","id":1}"#),
            Some(Health { rpc: Some("ok".into()) })
        );
        // an error envelope reads as unhealthy, not unknown.
        assert_eq!(
            parse_health(r#"{"jsonrpc":"2.0","error":{"code":-32005},"id":1}"#),
            Some(Health { rpc: Some("behind".into()) })
        );
        assert!(parse_health("nonsense").is_none());
    }

    #[test]
    fn parses_get_epoch_info() {
        let out = r#"{"jsonrpc":"2.0","result":{"absoluteSlot":420622837,"blockHeight":372696907,"epoch":986,"slotIndex":194581,"slotsInEpoch":432000,"transactionCount":690208996359},"id":1}"#;
        let e = parse_epoch_info(out).unwrap();
        assert_eq!(e.epoch, Some(986));
        assert_eq!(e.slot_index, Some(194581));
        assert_eq!(e.slots_in_epoch, Some(432000));
        assert_eq!(e.absolute_slot, Some(420622837));
        assert_eq!(e.block_height, Some(372696907));
        assert_eq!(e.transaction_count, Some(690208996359));
    }

    #[test]
    fn parses_get_version() {
        let out = r#"{"jsonrpc":"2.0","result":{"feature-set":3345198602,"solana-core":"4.1.1"},"id":1}"#;
        assert_eq!(
            parse_version(out),
            Some(Version { version: Some("4.1.1".into()), jito: None })
        );
    }
}
