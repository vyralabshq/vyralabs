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

/// Produced/skipped counts for our identity, read from `solana block-production` text.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct BlockCounts {
    pub leader_slots: Option<i64>,
    pub produced: Option<i64>,
    pub skipped: Option<i64>,
}

/// Parse `solana block-production` for `identity`. The output is a per-validator table:
///
/// ```text
///   <identity>   <leader_slots>   <blocks_produced>   <skipped>   <skip_pct>
/// ```
///
/// Verified against real box output (28/28/0/0.00% for us at epoch 992). We find our row and
/// read columns 1-3; the header and totals lines don't match our identity, so they're skipped.
/// Uses the CLI rather than the getBlockProduction RPC, whose response shape we couldn't
/// confirm — the CLI is the same source the operator checks by hand.
pub fn parse_block_production(text: &str, identity: &str) -> Option<BlockCounts> {
    text.lines().find_map(|line| {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.first() != Some(&identity) {
            return None;
        }
        Some(BlockCounts {
            leader_slots: cols.get(1).and_then(|s| s.parse().ok()),
            produced: cols.get(2).and_then(|s| s.parse().ok()),
            skipped: cols.get(3).and_then(|s| s.parse().ok()),
        })
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
