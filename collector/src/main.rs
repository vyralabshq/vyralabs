//! Collector CLI.
//!
//! `--once`   one dry-run over injected input files -> writes the three JSON objects locally.
//! `--daemon` (issue #14) the production loop: every cycle it fetches every source on the
//!            box, assembles the snapshot, and publishes the JSON. Publishing is local-file
//!            for now; the R2 upload plugs into `publish` once the bucket exists.
//!
//! Both load/save rolling-window state so history survives restarts (issue #13).
//!
//! Usage:
//!   collector --once   [--log <file>] [--monitor <file>] [--rpc-* <file>] [--state <f>] [--out <dir>]
//!   collector --daemon
//!
//! Daemon env (all optional): RPC_URL (default http://localhost:8899), LOG_FILE, OUT_DIR
//! (default out), STATE_PATH (default state.json), CYCLE_SECS (default 10), VOTE_SECS
//! (vote-account fetch gate, default 60).

use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::time::{Duration, Instant};

use chrono::Utc;

use collector::blockproduction::{group_runs, parse_leader_schedule};
use collector::config::{
    ACCOUNTS_PATH, CLUSTER, IDENTITY_PUBKEY, LEDGER_PATH, SERVICE_NAME, VOTE_PUBKEY,
};
use collector::rpc::{parse_blocks, parse_epoch_info, parse_slot_number};
use collector::state::{load_state, save_state};
use collector::{build_snapshot, fetch, Inputs, SnapshotResult};

/// Value following `flag` in the args, if present (`--flag value`).
fn flag_value(args: &[String], flag: &str) -> Option<String> {
    args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1)).cloned()
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn write_json<T: serde::Serialize>(dir: &Path, name: &str, value: &T) -> std::io::Result<()> {
    let text = serde_json::to_string_pretty(value).expect("snapshot is JSON-serializable");
    // Write to a temp file then rename: rename is atomic on one filesystem, so a live
    // reader (Caddy serving to the dashboard) never sees a half-written file.
    let tmp = dir.join(format!(".{name}.tmp"));
    std::fs::write(&tmp, text)?;
    std::fs::rename(&tmp, dir.join(name))
}

/// Publish the snapshot. Local-file for now; the R2 upload (whole-object PUT with
/// Content-Type + Cache-Control per file) plugs in HERE once the bucket + creds exist (#14).
fn publish(dir: &Path, out: &SnapshotResult) -> std::io::Result<()> {
    write_json(dir, "latest.json", &out.latest)?;
    write_json(dir, "history-1h.json", &out.history_1h)?;
    write_json(dir, "history-24h.json", &out.history_24h)?;
    Ok(())
}

/// One dry-run over captured input files (issue #9). No network.
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
    let read_file = |flag: &str| -> Option<String> {
        flag_value(args, flag).and_then(|p| {
            std::fs::read_to_string(&p)
                .map_err(|e| eprintln!("warn: could not read {flag} {p}: {e}"))
                .ok()
        })
    };

    let inputs = Inputs {
        log_lines,
        monitor_output: read_file("--monitor"),
        rpc_health: read_file("--rpc-health"),
        rpc_epoch_info: read_file("--rpc-epoch"),
        rpc_version: read_file("--rpc-version"),
        rpc_balance: read_file("--rpc-balance"),
        jito_client: fetch::detect_jito_client(),
        os_stats: Some(fetch::gather_os_stats(LEDGER_PATH, ACCOUNTS_PATH, SERVICE_NAME)),
        vote_account_json: read_file("--vote-account"),
        vote_accounts_json: read_file("--get-vote-accounts"),
        leader_epoch: None,
        leader_slots: read_file("--leader-schedule")
            .map(|t| parse_leader_schedule(&t, IDENTITY_PUBKEY)),
        // Per-slot verification is daemon-only (it needs live getBlocks against the box).
        produced_slots: None,
        resolved_slots: None,
        block_production_text: read_file("--block-production"),
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
    if let Err(e) = publish(&out_dir, &out) {
        eprintln!("error: writing output: {e}");
        return ExitCode::FAILURE;
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

/// The production loop (issue #14): fetch every source each cycle, assemble, publish.
/// Guarded fetches mean any single failure becomes a null field, never a crashed loop.
fn run_daemon() -> ExitCode {
    let rpc_url = env_or("RPC_URL", "http://localhost:8899");
    // Block-history RPC for per-slot production checks. The validator's own RPC is the
    // minimal set (--private-rpc, no --full-rpc-api): getBlocks/getFirstAvailableBlock are
    // "Method not found" there. Block existence is cluster truth, so the public endpoint is
    // a fine source — ~12 range calls per cycle at worst while a fresh epoch backfills.
    let blocks_rpc = env_or("BLOCKS_RPC_URL", "https://api.testnet.solana.com");
    let out_dir = PathBuf::from(env_or("OUT_DIR", "out"));
    let state_path = PathBuf::from(env_or("STATE_PATH", "state.json"));
    let log_file = std::env::var("LOG_FILE").ok();
    let cycle = Duration::from_secs(env_or("CYCLE_SECS", "10").parse().unwrap_or(10));
    // getVoteAccounts / vote-account are a bit heavier, so fetch on their own gate (default
    // 60s) rather than every cycle. Localhost RPC has no rate limit, so 60s is fine.
    let vote_gate = Duration::from_secs(env_or("VOTE_SECS", "60").parse().unwrap_or(60));

    if let Err(e) = std::fs::create_dir_all(&out_dir) {
        eprintln!("fatal: cannot create OUT_DIR {}: {e}", out_dir.display());
        return ExitCode::FAILURE;
    }
    let mut state = load_state(&state_path);
    let mut last_vote_fetch: Option<Instant> = None;
    // Our leader schedule, parsed once and reused every cycle (the raw `solana
    // leader-schedule` output is the whole cluster ~26 MB, so we keep only our small Vec).
    // Keyed on the current chain epoch; the stored pair is (display_epoch, our_slots), where
    // display_epoch is the current epoch when it holds any of our slots, else the next epoch
    // — so the epoch before our first assignment still shows a useful "next leader".
    let mut leader_schedule: Option<(i64, i64, Vec<i64>)> = None;
    // Per-group ledger verification (which of our past leader slots actually have a block),
    // keyed on the display epoch. group start -> produced slots in that group, filled by one
    // getBlocks range call per group and kept for the epoch — a finalized group never
    // changes. Unresolvable groups (purged past getFirstAvailableBlock) stay absent, so the
    // snapshot reports them as unknown rather than guessing.
    let mut production_cache: Option<(i64, std::collections::HashMap<i64, Vec<i64>>)> = None;
    eprintln!(
        "collector daemon up: cycle {}s, out {}, rpc {rpc_url}",
        cycle.as_secs(),
        out_dir.display()
    );

    loop {
        let start = Instant::now();
        let do_vote = last_vote_fetch.is_none_or(|t| t.elapsed() >= vote_gate);

        // Epoch info drives both the snapshot and the leader-schedule cache, so fetch it once
        // and reuse it. On an epoch rollover (or first run) refetch the schedule and reparse
        // to our slots; otherwise keep the cached Vec.
        let rpc_epoch_info = fetch::curl_rpc(&rpc_url, "getEpochInfo", "[]");
        if let Some(ep) = rpc_epoch_info.as_deref().and_then(parse_epoch_info).and_then(|e| e.epoch)
        {
            // Re-resolve the schedule when the chain epoch changes. Prefer this epoch; if it
            // has none of our slots, look one epoch ahead so the countdown to our first ones
            // shows up early.
            if leader_schedule.as_ref().is_none_or(|(cached, _, _)| *cached != ep) {
                let fetch_ours = |e: i64| {
                    fetch::fetch_leader_schedule(e)
                        .map(|t| parse_leader_schedule(&t, IDENTITY_PUBKEY))
                        .unwrap_or_default()
                };
                let cur = fetch_ours(ep);
                if !cur.is_empty() {
                    leader_schedule = Some((ep, ep, cur));
                } else {
                    let next = fetch_ours(ep + 1);
                    if !next.is_empty() {
                        leader_schedule = Some((ep, ep + 1, next));
                    }
                }
            }
        }

        // Resolve past leader groups against cluster block history, a few per cycle. Gated
        // on the finalized tip (not processed): during a finality stall a produced block is
        // not yet in finalized getBlocks, and caching it as skipped would be a permanent lie.
        if let Some((_, disp, slots)) = leader_schedule.as_ref() {
            if production_cache.as_ref().is_none_or(|(e, _)| e != disp) {
                production_cache = Some((*disp, std::collections::HashMap::new()));
            }
            let cache = &mut production_cache.as_mut().expect("just set").1;
            let finalized =
                fetch::curl_rpc(&blocks_rpc, "getSlot", "[{\"commitment\":\"finalized\"}]")
                    .as_deref()
                    .and_then(parse_slot_number);
            if let Some(tip) = finalized {
                let unresolved: Vec<(i64, i64)> = group_runs(slots)
                    .into_iter()
                    .filter(|(start, end)| *end < tip && !cache.contains_key(start))
                    .collect();
                if !unresolved.is_empty() {
                    // Purge floor: below getFirstAvailableBlock the ledger has no evidence
                    // either way, so those groups are skipped here and stay unknown.
                    let floor = fetch::curl_rpc(&blocks_rpc, "getFirstAvailableBlock", "[]")
                        .as_deref()
                        .and_then(parse_slot_number);
                    if let Some(floor) = floor {
                        for (gs, ge) in unresolved.into_iter().filter(|(s, _)| *s >= floor).take(12)
                        {
                            let blocks =
                                fetch::curl_rpc(&blocks_rpc, "getBlocks", &format!("[{gs},{ge}]"))
                                    .as_deref()
                                    .and_then(parse_blocks);
                            if let Some(b) = blocks {
                                cache.insert(gs, b);
                            }
                        }
                    }
                }
            }
        }
        // Flatten the cache for the snapshot: resolved = every slot of a checked group,
        // produced = the subset that has a block.
        let (produced_slots, resolved_slots) = match (&production_cache, &leader_schedule) {
            (Some((_, cache)), Some((_, _, slots))) => {
                let mut produced: Vec<i64> = cache.values().flatten().copied().collect();
                produced.sort_unstable();
                let mut resolved: Vec<i64> = group_runs(slots)
                    .into_iter()
                    .filter(|(start, _)| cache.contains_key(start))
                    .flat_map(|(start, end)| start..=end)
                    .collect();
                resolved.sort_unstable();
                (Some(produced), Some(resolved))
            }
            _ => (None, None),
        };

        let inputs = Inputs {
            log_lines: fetch::read_log_lines(log_file.as_deref(), SERVICE_NAME, 500),
            monitor_output: fetch::fetch_monitor(LEDGER_PATH, "agave-validator"),
            rpc_health: fetch::curl_rpc(&rpc_url, "getHealth", "[]"),
            rpc_epoch_info,
            rpc_version: fetch::curl_rpc(&rpc_url, "getVersion", "[]"),
            rpc_balance: fetch::curl_rpc(
                &rpc_url,
                "getBalance",
                &format!("[\"{IDENTITY_PUBKEY}\"]"),
            ),
            os_stats: Some(fetch::gather_os_stats(LEDGER_PATH, ACCOUNTS_PATH, SERVICE_NAME)),
            vote_account_json: do_vote.then(|| fetch::fetch_vote_account(VOTE_PUBKEY)).flatten(),
            vote_accounts_json: do_vote
                .then(|| {
                    fetch::curl_rpc(
                        &rpc_url,
                        "getVoteAccounts",
                        &format!("[{{\"votePubkey\":\"{VOTE_PUBKEY}\"}}]"),
                    )
                })
                .flatten(),
            leader_epoch: leader_schedule.as_ref().map(|(_, disp, _)| *disp),
            leader_slots: leader_schedule.as_ref().map(|(_, _, s)| s.clone()),
            produced_slots,
            resolved_slots,
            // `solana block-production` table; snapshot filters to our identity's row.
            block_production_text: fetch::fetch_block_production(),
            // Runtime detection from the live process — never a stale config flag (issue #10).
            jito_client: fetch::detect_jito_client(),
            identity_pubkey: Some(IDENTITY_PUBKEY.to_string()),
            vote_pubkey: Some(VOTE_PUBKEY.to_string()),
            cluster: CLUSTER.to_string(),
        };
        if do_vote {
            last_vote_fetch = Some(Instant::now());
        }

        let out = build_snapshot(&inputs, Utc::now(), Some(&state));
        if let Err(e) = publish(&out_dir, &out) {
            eprintln!("publish error: {e}");
        }
        state = out.new_state;
        if let Err(e) = save_state(&state_path, &state) {
            eprintln!("state error: {e}");
        }
        // Quiet on success; surface which sources failed this cycle.
        if !out.errors.is_empty() {
            eprintln!("cycle: {} source error(s): {}", out.errors.len(), out.errors.join("; "));
        }

        let elapsed = start.elapsed();
        if elapsed < cycle {
            std::thread::sleep(cycle - elapsed);
        }
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--daemon") {
        run_daemon()
    } else if args.iter().any(|a| a == "--once") {
        run_once(&args)
    } else {
        eprintln!(
            "usage:\n  collector --daemon\n  collector --once [--log <f>] [--monitor <f>] \
             [--rpc-health <f>] [--rpc-epoch <f>] [--rpc-version <f>] [--rpc-balance <f>] \
             [--vote-account <f>] [--get-vote-accounts <f>] [--state <f>] [--out <dir>]"
        );
        ExitCode::FAILURE
    }
}
