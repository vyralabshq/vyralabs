//! The I/O fetch shell (issue #14): gather raw source outputs on the box.
//!
//! Deliberately dependency-free — every source is a subprocess (`curl`, `agave-validator`,
//! `solana`, `df`, `nproc`, `systemctl`, `journalctl`) or a `/proc` read, the same commands
//! run by hand. Each fetch is guarded and returns `None` on any failure, so a stuck or
//! missing source becomes a null field + errors[] entry in `build_snapshot`, never a crash.
//! The monitor fetch is bounded by a 5s timeout so one hung source can't stall the cycle.

use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::Duration;

use crate::osstats::OsStatsInput;

/// Run a command, returning stdout on success (exit 0), else None.
fn run(cmd: &str, args: &[&str]) -> Option<String> {
    let out = Command::new(cmd).args(args).output().ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).into_owned())
}

/// A localhost JSON-RPC call via `curl` (already on the box; keeps the collector crate-free).
/// `params` is a JSON array literal, e.g. `"[]"` or `"[\"<pubkey>\"]"`.
pub fn curl_rpc(url: &str, method: &str, params: &str) -> Option<String> {
    let body = format!(r#"{{"jsonrpc":"2.0","id":1,"method":"{method}","params":{params}}}"#);
    let out = run(
        "curl",
        &["-s", url, "-X", "POST", "-H", "content-type: application/json", "-d", &body],
    )?;
    (!out.trim().is_empty()).then_some(out)
}

/// The last `n` lines of the validator log. Prefers tailing a log file (reads only the tail,
/// survives rotation by never scanning the whole file); falls back to journalctl.
pub fn read_log_lines(log_file: Option<&str>, service: &str, n: usize) -> Option<Vec<String>> {
    if let Some(path) = log_file {
        if let Some(lines) = tail_file(path, n) {
            return Some(lines);
        }
    }
    let out = run("journalctl", &["-u", service, "-n", &n.to_string(), "--no-pager", "-o", "cat"])?;
    Some(out.lines().map(str::to_string).collect())
}

/// Read only the last ~256 KiB of a file and return its last `n` lines. The first line may
/// be a partial (we seek mid-line); the datapoint parser ignores non-datapoint lines anyway.
fn tail_file(path: &str, n: usize) -> Option<Vec<String>> {
    let mut f = std::fs::File::open(path).ok()?;
    let len = f.metadata().ok()?.len();
    let window = len.min(256 * 1024);
    f.seek(SeekFrom::Start(len - window)).ok()?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf).ok()?;
    let text = String::from_utf8_lossy(&buf);
    let lines: Vec<String> = text.lines().map(str::to_string).collect();
    let start = lines.len().saturating_sub(n);
    Some(lines[start..].to_vec())
}

/// Stream `agave-validator monitor`, return the first full status line, then kill the child.
/// Bounded at 5s: on timeout/failure the caller gets None (slots become null + errors[]).
pub fn fetch_monitor(ledger: &str, bin: &str) -> Option<String> {
    let mut child = Command::new(bin)
        .args(["--ledger", ledger, "monitor"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    let stdout = child.stdout.take()?;
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if line.contains("Processed Slot:") {
                let _ = tx.send(line);
                break;
            }
        }
    });
    let result = rx.recv_timeout(Duration::from_secs(5)).ok();
    let _ = child.kill();
    let _ = child.wait();
    result
}

/// `solana vote-account <vote-pubkey> --output json` (credits/commission/epoch history).
pub fn fetch_vote_account(vote_pubkey: &str) -> Option<String> {
    run("solana", &["vote-account", vote_pubkey, "--output", "json"])
}

/// `solana leader-schedule --epoch <N>` — the whole-cluster schedule as text (`<slot>
/// <identity>` per line). Large; the caller parses to our slots and caches per epoch. `-ut`
/// selects testnet, matching the box commands.
pub fn fetch_leader_schedule(epoch: i64) -> Option<String> {
    run("solana", &["-ut", "leader-schedule", "--epoch", &epoch.to_string()])
}

/// `solana block-production` — the per-validator produced/skipped table for the current
/// epoch. The caller filters to our identity. Used instead of the getBlockProduction RPC,
/// whose response shape we couldn't verify.
pub fn fetch_block_production() -> Option<String> {
    run("solana", &["-ut", "block-production"])
}

/// Gather OS stats by running local commands / reading /proc. Each field independent;
/// anything unavailable (e.g. on non-Linux dev) is simply None.
pub fn gather_os_stats(ledger_path: &str, accounts_path: &str, service: &str) -> OsStatsInput {
    OsStatsInput {
        df_ledger: run("df", &["-B1", ledger_path]),
        df_accounts: run("df", &["-B1", accounts_path]),
        meminfo: std::fs::read_to_string("/proc/meminfo").ok(),
        loadavg: std::fs::read_to_string("/proc/loadavg").ok(),
        nproc: run("nproc", &[]),
        active_enter: run("systemctl", &["show", service, "-p", "ActiveEnterTimestamp"]),
        is_active: run("systemctl", &["is-active", service]),
    }
}
