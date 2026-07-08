//! Parse `agave-validator --ledger <path> monitor` output (issue #10).
//!
//! The command streams a status line per refresh; each carries the five slot numbers the
//! dashboard needs. A real line (verified against the box):
//!
//! ```text
//! ⠤ 45:38:20 | Processed Slot: 420608107 | Confirmed Slot: 420608106 | Finalized Slot: 420608075 | Full Snapshot Slot: 420524209 | Incremental Snapshot Slot: 420608053 |
//! ```
//!
//! The leading braille spinner and `HH:MM:SS` are the monitor process's own runtime, not
//! node uptime, and are ignored (docs/dashboard.md). Header lines (Ledger location,
//! Identity, Genesis Hash) are skipped. We take the most-recent status line. Pure, no I/O.

/// The five slot numbers a monitor status line reports. Any field is `None` if absent.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct MonitorSlots {
    pub processed: Option<i64>,
    pub confirmed: Option<i64>,
    pub finalized: Option<i64>,
    pub full_snapshot: Option<i64>,
    pub incremental_snapshot: Option<i64>,
}

/// The integer following `label` on `line`, e.g. "Processed Slot:" -> 420608107.
fn field(line: &str, label: &str) -> Option<i64> {
    let idx = line.find(label)?;
    let rest = &line[idx + label.len()..];
    let digits: String = rest
        .trim_start()
        .chars()
        .take_while(|c| c.is_ascii_digit())
        .collect();
    digits.parse().ok()
}

/// Slots from the most-recent status line in `output`, or `None` if there is none.
///
/// A status line is any line carrying "Processed Slot:"; the last one wins so a multi-line
/// capture reflects the freshest refresh. The longer labels ("Full Snapshot Slot:",
/// "Incremental Snapshot Slot:") are matched in full so they don't collide.
pub fn parse_monitor(output: &str) -> Option<MonitorSlots> {
    let line = output
        .lines()
        .rev()
        .find(|l| l.contains("Processed Slot:"))?;
    Some(MonitorSlots {
        processed: field(line, "Processed Slot:"),
        confirmed: field(line, "Confirmed Slot:"),
        finalized: field(line, "Finalized Slot:"),
        full_snapshot: field(line, "Full Snapshot Slot:"),
        incremental_snapshot: field(line, "Incremental Snapshot Slot:"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = "Ledger location: /mnt/ledger\n\
Identity: vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg\n\
Genesis Hash: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY\n\
⠤ 45:38:20 | Processed Slot: 420608107 | Confirmed Slot: 420608106 | Finalized Slot: 420608075 | Full Snapshot Slot: 420524209 | Incremental Snapshot Slot: 420608053 |\n\
⠉ 45:38:22 | Processed Slot: 420608112 | Confirmed Slot: 420608112 | Finalized Slot: 420608080 | Full Snapshot Slot: 420524209 | Incremental Snapshot Slot: 420608053\n";

    #[test]
    fn parses_latest_status_line() {
        let s = parse_monitor(SAMPLE).unwrap();
        assert_eq!(s.processed, Some(420608112));
        assert_eq!(s.confirmed, Some(420608112));
        assert_eq!(s.finalized, Some(420608080));
        assert_eq!(s.full_snapshot, Some(420524209));
        assert_eq!(s.incremental_snapshot, Some(420608053));
    }

    #[test]
    fn no_status_line_is_none() {
        assert!(parse_monitor("Ledger location: /mnt/ledger\nIdentity: x\n").is_none());
        assert!(parse_monitor("").is_none());
    }

    #[test]
    fn snapshot_labels_do_not_collide() {
        // "Full Snapshot Slot:" and "Incremental Snapshot Slot:" both contain
        // "Snapshot Slot:"; full-label matching keeps them distinct.
        let line = "x | Processed Slot: 1 | Full Snapshot Slot: 22 | Incremental Snapshot Slot: 333";
        let s = parse_monitor(line).unwrap();
        assert_eq!(s.full_snapshot, Some(22));
        assert_eq!(s.incremental_snapshot, Some(333));
    }
}
