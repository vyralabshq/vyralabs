//! Restart-safe rolling-window state (issue #13).
//!
//! `build_snapshot` is pure and takes `prev_state`/returns `new_state`; this module is the
//! thin disk edge that survives restarts. State is a JSON object (the rolled history
//! series live under `history_1h`/`history_24h`). A missing or corrupt file yields empty
//! state rather than a crash, so a bad `state.json` can never take the collector down —
//! it just loses history and rebuilds it.

use std::path::Path;

use serde_json::{Map, Value as Json};

/// Load state from `path`. Missing, unreadable, corrupt, or non-object -> empty state.
pub fn load_state(path: &Path) -> Map<String, Json> {
    match std::fs::read_to_string(path) {
        Ok(text) => match serde_json::from_str::<Json>(&text) {
            Ok(Json::Object(map)) => map,
            _ => Map::new(),
        },
        Err(_) => Map::new(),
    }
}

/// Write state to `path` as JSON. Returns any I/O error to the caller (the loop logs it).
pub fn save_state(path: &Path, state: &Map<String, Json>) -> std::io::Result<()> {
    let text = serde_json::to_string(state).expect("state is JSON-serializable");
    std::fs::write(path, text)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("collector-state-test-{name}.json"))
    }

    #[test]
    fn round_trips_state() {
        let path = tmp("roundtrip");
        let mut s = Map::new();
        s.insert("history_1h".into(), serde_json::json!([{"t": "2026-07-08T00:00:00Z"}]));
        save_state(&path, &s).unwrap();
        let back = load_state(&path);
        assert_eq!(back, s);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn missing_file_is_empty() {
        let path = tmp("does-not-exist-xyz");
        let _ = std::fs::remove_file(&path);
        assert!(load_state(&path).is_empty());
    }

    #[test]
    fn corrupt_file_is_empty_not_a_crash() {
        let path = tmp("corrupt");
        std::fs::write(&path, "{ not valid json ][").unwrap();
        assert!(load_state(&path).is_empty());
        let _ = std::fs::remove_file(&path);
    }
}
