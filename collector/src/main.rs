//! Collector CLI (issue #9 `--once` dry-run; the daemon loop + R2 upload are issue #14).
//!
//! `--once` runs `build_snapshot` against injected input files and writes the three JSON
//! objects locally — no network, no R2. It loads/saves rolling-window state so repeated
//! runs continue the same history series (issue #13).
//!
//! Usage:
//!   collector --once [--log <file>] [--monitor <file>] [--state <file>] [--out <dir>]
//!
//! `--log` and `--monitor` are captured source outputs (e.g. `agave-validator monitor >
//! monitor.txt`); omitted sources become null fields + errors[] entries, never a failure.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use chrono::Utc;

use collector::config::{CLUSTER, IDENTITY_PUBKEY, VOTE_PUBKEY};
use collector::state::{load_state, save_state};
use collector::{build_snapshot, Inputs};

/// Value following `flag` in the args, if present (`--flag value`).
fn flag_value(args: &[String], flag: &str) -> Option<String> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn write_json<T: serde::Serialize>(dir: &Path, name: &str, value: &T) -> std::io::Result<()> {
    let text = serde_json::to_string_pretty(value).expect("snapshot is JSON-serializable");
    std::fs::write(dir.join(name), text)
}

fn run_once(args: &[String]) -> ExitCode {
    let out_dir = PathBuf::from(flag_value(args, "--out").unwrap_or_else(|| ".".to_string()));
    let state_path =
        PathBuf::from(flag_value(args, "--state").unwrap_or_else(|| "state.json".to_string()));

    let log_lines = flag_value(args, "--log").map(|p| match std::fs::read_to_string(&p) {
        Ok(text) => text.lines().map(str::to_string).collect::<Vec<_>>(),
        Err(e) => {
            eprintln!("warn: could not read --log {p}: {e}");
            Vec::new()
        }
    });
    let monitor_output = flag_value(args, "--monitor").and_then(|p| {
        std::fs::read_to_string(&p)
            .map_err(|e| eprintln!("warn: could not read --monitor {p}: {e}"))
            .ok()
    });

    let inputs = Inputs {
        log_lines,
        monitor_output,
        identity_pubkey: Some(IDENTITY_PUBKEY.to_string()),
        vote_pubkey: Some(VOTE_PUBKEY.to_string()),
        cluster: CLUSTER.to_string(),
    };

    let prev_state = load_state(&state_path);
    let out = build_snapshot(&inputs, Utc::now(), Some(&prev_state));

    if let Err(e) = std::fs::create_dir_all(&out_dir) {
        eprintln!("error: cannot create --out {}: {e}", out_dir.display());
        return ExitCode::FAILURE;
    }
    let writes = [
        write_json(&out_dir, "latest.json", &out.latest),
        write_json(&out_dir, "history-1h.json", &out.history_1h),
        write_json(&out_dir, "history-24h.json", &out.history_24h),
    ];
    for w in writes {
        if let Err(e) = w {
            eprintln!("error: writing output: {e}");
            return ExitCode::FAILURE;
        }
    }
    if let Err(e) = save_state(&state_path, &out.new_state) {
        eprintln!("error: writing state {}: {e}", state_path.display());
        return ExitCode::FAILURE;
    }

    eprintln!(
        "wrote latest.json + 2 history files to {} ({} source error(s), 1h points: {})",
        out_dir.display(),
        out.errors.len(),
        out.history_1h.points.len()
    );
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--once") {
        run_once(&args)
    } else {
        eprintln!(
            "collector: only --once is implemented (the daemon loop + R2 upload land in #14)\n\
             usage: collector --once [--log <file>] [--monitor <file>] [--state <file>] [--out <dir>]"
        );
        ExitCode::FAILURE
    }
}
