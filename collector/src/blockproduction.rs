//! Leader schedule + block production (issue: block-production section).
//!
//! Two sources feed the "is it producing" view:
//!
//! 1. `solana leader-schedule --epoch <N>` — the whole-epoch assignment. Plain-text, two
//!    columns (`  <absolute_slot>   <identity>`), one line per slot. Verified against real
//!    box output: 136 lines for our identity in epoch 992, first 423055092, last 423441223,
//!    in runs of 4 consecutive slots. We filter to our identity and collect the slots. The
//!    schedule is fixed for an epoch, so the caller fetches it once per epoch boundary.
//!
//! 2. `getBlockProduction` RPC — how many of those leader slots produced vs skipped so far.
//!    Returns `result.value.byIdentity[<id>] = [leaderSlots, blocksProduced]` over a range.
//!    Shape is the documented one, but per the collector's own history with 4.2's Tower
//!    nesting: VERIFY against the box before trusting it in production.
//!
//! Pure over the fetched text/JSON; no I/O here.

use serde_json::Value;

/// Parse `solana leader-schedule` text into the absolute slots assigned to `identity`,
/// sorted ascending. Lines look like `  423055092       vyRa8J7...`. Anything that does not
/// parse (headers, blank lines, a broken-pipe panic tail) is skipped.
pub fn parse_leader_schedule(text: &str, identity: &str) -> Vec<i64> {
    let mut slots: Vec<i64> = text
        .lines()
        .filter_map(|line| {
            let mut cols = line.split_whitespace();
            let slot = cols.next()?.parse::<i64>().ok()?;
            let who = cols.next()?;
            (who == identity).then_some(slot)
        })
        .collect();
    slots.sort_unstable();
    slots.dedup();
    slots
}

/// Produced/skipped counts for our identity from `getBlockProduction`. `skipped` is
/// `leaderSlots - blocksProduced` over the range the RPC covers (epoch start -> current).
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct BlockCounts {
    pub leader_slots: Option<i64>,
    pub produced: Option<i64>,
    pub skipped: Option<i64>,
}

/// Map `getBlockProduction` for `identity`. Returns None if the envelope is unparseable;
/// individual fields stay None if absent, so a partial response never panics.
pub fn parse_block_production(json: &str, identity: &str) -> Option<BlockCounts> {
    let v: Value = serde_json::from_str(json).ok()?;
    let by = &v["result"]["value"]["byIdentity"][identity];
    // byIdentity[id] is the pair [leaderSlots, blocksProduced].
    let leader_slots = by.get(0).and_then(Value::as_i64);
    let produced = by.get(1).and_then(Value::as_i64);
    let skipped = leader_slots
        .zip(produced)
        .map(|(l, p)| (l - p).max(0));
    Some(BlockCounts {
        leader_slots,
        produced,
        skipped,
    })
}

/// Skip rate over completed slots: skipped / (produced + skipped). None until at least one
/// leader slot has elapsed.
pub fn skip_rate_pct(counts: &BlockCounts) -> Option<f64> {
    let (p, s) = (counts.produced?, counts.skipped?);
    let done = p + s;
    (done > 0).then(|| (s as f64 / done as f64) * 100.0)
}

/// First scheduled slot still ahead of `current_slot` (the next time we lead), or None if
/// every assignment this epoch has already passed.
pub fn next_leader_slot(schedule: &[i64], current_slot: i64) -> Option<i64> {
    schedule.iter().copied().find(|&s| s > current_slot)
}
