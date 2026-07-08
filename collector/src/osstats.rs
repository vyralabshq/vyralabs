//! OS statistics parsers (issue #11, Source D).
//!
//! Pure parsers over captured command output: `df -B1 <path>`, `/proc/meminfo`,
//! `/proc/loadavg`, `nproc`, and `systemctl show <svc> -p ActiveEnterTimestamp` /
//! `is-active`. Each sub-reading is independent — a missing one yields a null field, not a
//! failure. Sizes are reported in GiB (what `df -h` / `free -h` show). Verified against
//! real box output.

use chrono::{DateTime, NaiveDateTime, Utc};

use crate::schema::Disk;

const GIB: f64 = 1024.0 * 1024.0 * 1024.0;

fn bytes_to_gib(b: u64) -> f64 {
    b as f64 / GIB
}
fn kb_to_gib(kb: u64) -> f64 {
    kb as f64 * 1024.0 / GIB
}

/// Captured OS-stat command outputs. Any field absent -> that reading is null.
#[derive(Debug, Clone, Default)]
pub struct OsStatsInput {
    pub df_ledger: Option<String>,
    pub df_accounts: Option<String>,
    pub meminfo: Option<String>,
    pub loadavg: Option<String>,
    pub nproc: Option<String>,
    /// `systemctl show <svc> -p ActiveEnterTimestamp` line (assumed UTC, as the box reports).
    pub active_enter: Option<String>,
    /// `systemctl is-active <svc>` output.
    pub is_active: Option<String>,
}

/// Parsed system block, ready to drop into `latest.system`.
pub struct OsStats {
    pub ledger_disk: Disk,
    pub accounts_disk: Disk,
    pub memory: Disk,
    pub load_avg: Option<Vec<f64>>,
    pub cpu_cores: Option<i64>,
    pub uptime_seconds: Option<i64>,
    pub process_active: Option<bool>,
}

/// Parse `df -B1 <path>` output into a Disk. Reads the data row from the right so a
/// wrapped/long device name can't shift the columns: [.. total used avail use% mount].
pub fn parse_df(out: &str) -> Disk {
    for line in out.lines().rev() {
        let t: Vec<&str> = line.split_whitespace().collect();
        // A data row ends in a mount point ("/", "/mnt/...") and has the 6 df columns.
        if t.len() >= 6 && t.last().is_some_and(|m| m.starts_with('/')) {
            let n = t.len();
            let total = t[n - 5].parse::<u64>().ok();
            let used = t[n - 4].parse::<u64>().ok();
            let pct = t[n - 2].trim_end_matches('%').parse::<f64>().ok();
            return Disk {
                pct,
                used_gb: used.map(bytes_to_gib),
                total_gb: total.map(bytes_to_gib),
            };
        }
    }
    Disk::empty()
}

fn meminfo_kb(out: &str, label: &str) -> Option<u64> {
    out.lines()
        .find(|l| l.starts_with(label))?
        .split_whitespace()
        .nth(1)?
        .parse::<u64>()
        .ok()
}

/// Parse `/proc/meminfo` into a Disk-shaped memory reading (used = total - available).
pub fn parse_meminfo(out: &str) -> Disk {
    let total = meminfo_kb(out, "MemTotal:");
    let avail = meminfo_kb(out, "MemAvailable:");
    match (total, avail) {
        (Some(t), Some(a)) if t > 0 => {
            let used = t.saturating_sub(a);
            Disk {
                pct: Some(used as f64 / t as f64 * 100.0),
                used_gb: Some(kb_to_gib(used)),
                total_gb: Some(kb_to_gib(t)),
            }
        }
        (Some(t), _) => Disk {
            pct: None,
            used_gb: None,
            total_gb: Some(kb_to_gib(t)),
        },
        _ => Disk::empty(),
    }
}

/// Parse `/proc/loadavg` into [1, 5, 15]-minute averages, or None if malformed.
pub fn parse_loadavg(out: &str) -> Option<Vec<f64>> {
    let v: Vec<f64> = out
        .split_whitespace()
        .take(3)
        .filter_map(|x| x.parse().ok())
        .collect();
    (v.len() == 3).then_some(v)
}

/// Seconds since the service's ActiveEnterTimestamp, given `now`. Assumes the timestamp is
/// UTC (the box reports UTC). A future or unparseable time yields None.
pub fn parse_uptime_seconds(active_enter: &str, now: DateTime<Utc>) -> Option<i64> {
    let val = active_enter.split('=').next_back().unwrap_or(active_enter);
    let toks: Vec<&str> = val.split_whitespace().collect();
    let date = toks.iter().find(|t| t.contains('-'))?;
    let time = toks.iter().find(|t| t.contains(':'))?;
    let dt = NaiveDateTime::parse_from_str(&format!("{date} {time}"), "%Y-%m-%d %H:%M:%S").ok()?;
    let secs = (now - dt.and_utc()).num_seconds();
    (secs >= 0).then_some(secs)
}

fn parse_process_active(is_active: &str) -> Option<bool> {
    match is_active.trim() {
        "" => None,
        v => Some(v == "active"),
    }
}

/// Parse the whole system block from captured command outputs.
pub fn parse_os_stats(input: &OsStatsInput, now: DateTime<Utc>) -> OsStats {
    OsStats {
        ledger_disk: input.df_ledger.as_deref().map(parse_df).unwrap_or_else(Disk::empty),
        accounts_disk: input.df_accounts.as_deref().map(parse_df).unwrap_or_else(Disk::empty),
        memory: input.meminfo.as_deref().map(parse_meminfo).unwrap_or_else(Disk::empty),
        load_avg: input.loadavg.as_deref().and_then(parse_loadavg),
        cpu_cores: input.nproc.as_deref().and_then(|s| s.trim().parse().ok()),
        uptime_seconds: input
            .active_enter
            .as_deref()
            .and_then(|s| parse_uptime_seconds(s, now)),
        process_active: input.is_active.as_deref().and_then(parse_process_active),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_real_df() {
        let out = "Filesystem        1B-blocks         Used    Available Use% Mounted on\n\
/dev/nvme0n1p2 943441641472 470451773440 424990371840  53% /\n";
        let d = parse_df(out);
        assert_eq!(d.pct, Some(53.0));
        assert!((d.total_gb.unwrap() - 878.6).abs() < 0.5);
        assert!((d.used_gb.unwrap() - 438.1).abs() < 0.5);
    }

    #[test]
    fn parses_real_meminfo() {
        let out = "MemTotal:       131501448 kB\nMemFree:         3247356 kB\nMemAvailable:   112329088 kB\n";
        let m = parse_meminfo(out);
        // used = 131501448 - 112329088 = 19172360 kB -> ~14.6%
        assert!((m.pct.unwrap() - 14.58).abs() < 0.1);
        assert!((m.total_gb.unwrap() - 125.4).abs() < 0.5);
    }

    #[test]
    fn parses_loadavg() {
        assert_eq!(parse_loadavg("6.42 6.01 5.67 2/1013 70431"), Some(vec![6.42, 6.01, 5.67]));
        assert_eq!(parse_loadavg("garbage"), None);
    }

    #[test]
    fn parses_uptime_from_active_enter() {
        let now: DateTime<Utc> = "2026-07-08T17:36:55Z".parse().unwrap();
        let secs = parse_uptime_seconds(
            "ActiveEnterTimestamp=Mon 2026-07-06 17:36:55 UTC",
            now,
        );
        // exactly two days.
        assert_eq!(secs, Some(2 * 86400));
    }

    #[test]
    fn process_active_reads_systemctl() {
        assert_eq!(parse_process_active("active\n"), Some(true));
        assert_eq!(parse_process_active("inactive"), Some(false));
        assert_eq!(parse_process_active(""), None);
    }

    #[test]
    fn missing_readings_are_null() {
        let now: DateTime<Utc> = "2026-07-08T00:00:00Z".parse().unwrap();
        let s = parse_os_stats(&OsStatsInput::default(), now);
        assert!(s.load_avg.is_none());
        assert!(s.cpu_cores.is_none());
        assert!(s.uptime_seconds.is_none());
        assert!(s.process_active.is_none());
        assert!(s.memory.pct.is_none());
    }
}
