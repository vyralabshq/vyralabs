//! Rolling history-window management (issue #13).
//!
//! `build_snapshot` runs once per collector cycle. Each window keeps a bounded, evenly
//! spaced series across cycles: a point is appended only when its cadence
//! (`resolution_seconds`) has elapsed since the last one, and points older than the
//! retention span are dropped. State lives in `prev_state`/`new_state`, so this stays
//! pure and `now`-injected. 1h keeps ~360 points at 10s; 24h keeps ~1440 at 60s.

use chrono::{DateTime, Duration, NaiveDateTime, Utc};

use crate::schema::HistoryPoint;

/// The point timestamp format used across the contract (`empty_*`/`iso_z`).
fn parse_t(s: &str) -> Option<DateTime<Utc>> {
    NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%SZ").ok().map(|n| n.and_utc())
}

/// Roll a window forward one cycle: maybe append `current`, then trim to retention.
///
/// - Append when the window is empty or `resolution_seconds` have passed since the last
///   point. Ticks that arrive faster than the cadence are dropped (keeps 24h coarse even
///   when the loop ticks every 10s).
/// - Trim any point older than `window_seconds` before `now`.
///
/// An unparseable timestamp is treated conservatively: it never blocks an append and is
/// never trimmed, so a bad point cannot silently empty the series.
pub fn roll(
    mut points: Vec<HistoryPoint>,
    current: HistoryPoint,
    now: DateTime<Utc>,
    resolution_seconds: i64,
    window_seconds: i64,
) -> Vec<HistoryPoint> {
    let should_append = match points.last().and_then(|p| parse_t(&p.t)) {
        Some(last_t) => (now - last_t).num_seconds() >= resolution_seconds,
        None => true,
    };
    if should_append {
        points.push(current);
    }

    let cutoff = now - Duration::seconds(window_seconds);
    points.retain(|p| match parse_t(&p.t) {
        Some(t) => t >= cutoff,
        None => true,
    });
    points
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pt(t: &str) -> HistoryPoint {
        HistoryPoint {
            t: t.to_string(),
            processed: None,
            finalized: None,
            vote_lag: None,
            identity_sol: None,
            mem_pct: None,
            tx_per_slot: None,
            drop_rate_pct: None,
        }
    }

    fn at(t: &str) -> DateTime<Utc> {
        parse_t(t).unwrap()
    }

    #[test]
    fn appends_into_empty_window() {
        let out = roll(vec![], pt("2026-07-08T00:00:00Z"), at("2026-07-08T00:00:00Z"), 10, 3600);
        assert_eq!(out.len(), 1);
    }

    #[test]
    fn skips_append_within_cadence() {
        let prev = vec![pt("2026-07-08T00:00:00Z")];
        // 5s later, cadence 10s -> no new point.
        let out = roll(prev, pt("2026-07-08T00:00:05Z"), at("2026-07-08T00:00:05Z"), 10, 3600);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].t, "2026-07-08T00:00:00Z");
    }

    #[test]
    fn appends_once_cadence_elapsed() {
        let prev = vec![pt("2026-07-08T00:00:00Z")];
        let out = roll(prev, pt("2026-07-08T00:00:10Z"), at("2026-07-08T00:00:10Z"), 10, 3600);
        assert_eq!(out.len(), 2);
        assert_eq!(out[1].t, "2026-07-08T00:00:10Z");
    }

    #[test]
    fn trims_points_older_than_retention() {
        // Two old points (>1h before now) and a fresh one; only fresh survives.
        let prev = vec![pt("2026-07-08T00:00:00Z"), pt("2026-07-08T00:30:00Z")];
        let out = roll(prev, pt("2026-07-08T01:00:10Z"), at("2026-07-08T01:00:10Z"), 10, 3600);
        // 00:00:00 is 3610s old -> dropped; 00:30:00 is 1810s old -> kept; plus the new one.
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].t, "2026-07-08T00:30:00Z");
        assert_eq!(out[1].t, "2026-07-08T01:00:10Z");
    }

    #[test]
    fn twentyfour_hour_cadence_stays_coarse_on_fast_ticks() {
        // 60s cadence, a tick 10s after the last point adds nothing.
        let prev = vec![pt("2026-07-08T00:00:00Z")];
        let out = roll(prev, pt("2026-07-08T00:00:10Z"), at("2026-07-08T00:00:10Z"), 60, 86400);
        assert_eq!(out.len(), 1);
    }
}
