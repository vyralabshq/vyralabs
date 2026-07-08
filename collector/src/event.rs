//! Build the redacted event feed (issue #12).
//!
//! From injected log lines, take the last <=10 lines at ` WARN ` or ` ERROR `, map each to
//! `{ts, level, msg}` where `msg` is the text after the module path (the closing `]` of the
//! log prefix), and sanitize: drop any denylisted line outright, then redact the surviving
//! message. `msg` is truncated to 200 chars. Pure, no I/O.
//!
//! A log line looks like:
//!     [2026-07-08T12:34:00.123Z WARN  solana_core::foo] something happened
//! -> ts = "2026-07-08T12:34:00.123Z", level = "WARN", msg = "something happened".

use crate::redact::Redactor;
use crate::schema::Event;

const MAX_EVENTS: usize = 10;
const MAX_MSG_CHARS: usize = 200;

/// Split a log line into (timestamp, message) around the log prefix `[...]`.
/// `ts` is the first whitespace token inside the brackets; `msg` is everything after `]`.
/// A line without a bracketed prefix yields `(None, whole line)`.
fn split_prefix(line: &str) -> (Option<String>, &str) {
    if let (Some(open), Some(close)) = (line.find('['), line.find(']')) {
        if open < close {
            let ts = line[open + 1..close]
                .split_whitespace()
                .next()
                .map(str::to_string);
            return (ts, line[close + 1..].trim_start());
        }
    }
    (None, line)
}

fn level_of(line: &str) -> Option<&'static str> {
    if line.contains(" ERROR ") {
        Some("ERROR")
    } else if line.contains(" WARN ") {
        Some("WARN")
    } else {
        None
    }
}

/// The redacted event feed: the last <=10 WARN/ERROR lines, denylisted lines dropped,
/// surviving messages redacted and truncated to 200 chars.
pub fn build_events(lines: &[String], redactor: &Redactor) -> Vec<Event> {
    // The last <=10 WARN/ERROR lines, in original order.
    let mut recent: Vec<&String> = lines.iter().filter(|l| level_of(l).is_some()).collect();
    let overflow = recent.len().saturating_sub(MAX_EVENTS);
    recent.drain(..overflow);

    recent
        .into_iter()
        .filter(|l| !redactor.is_denylisted(l))
        .map(|line| {
            let level = level_of(line).map(str::to_string);
            let (ts, raw_msg) = split_prefix(line);
            let msg: String = redactor.redact(raw_msg).chars().take(MAX_MSG_CHARS).collect();
            Event {
                ts,
                level,
                msg: Some(msg),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{IDENTITY_PUBKEY, VOTE_PUBKEY};

    fn redactor() -> Redactor {
        Redactor::new([IDENTITY_PUBKEY, VOTE_PUBKEY])
    }

    fn lines(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn maps_warn_error_to_ts_level_msg() {
        let input = lines(&[
            "[2026-07-08T12:00:00.000Z INFO  solana_core::x] not an event",
            "[2026-07-08T12:34:00.123Z WARN  solana_core::foo] fell behind",
            "[2026-07-08T12:35:00.000Z ERROR solana_core::bar] replay failed",
        ]);
        let evs = build_events(&input, &redactor());
        assert_eq!(evs.len(), 2);
        assert_eq!(evs[0].level.as_deref(), Some("WARN"));
        assert_eq!(evs[0].ts.as_deref(), Some("2026-07-08T12:34:00.123Z"));
        assert_eq!(evs[0].msg.as_deref(), Some("fell behind"));
        assert_eq!(evs[1].level.as_deref(), Some("ERROR"));
        assert_eq!(evs[1].msg.as_deref(), Some("replay failed"));
    }

    #[test]
    fn drops_denylisted_and_redacts_survivors() {
        let input = lines(&[
            "[t WARN  m] loaded keypair /home/sol/identity.json",
            "[t ERROR m] peer 10.0.0.1:8001 dropped",
            "[t WARN  m] talking to https://api.testnet.solana.com now",
        ]);
        let evs = build_events(&input, &redactor());
        // both the /home/ line and the IP:port line are denylisted -> dropped.
        assert_eq!(evs.len(), 1);
        assert_eq!(evs[0].msg.as_deref(), Some("talking to [redacted] now"));
    }

    #[test]
    fn preserves_known_pubkeys_in_events() {
        let input = lines(&[&format!("[t WARN  m] our vote key {VOTE_PUBKEY} is fine")]);
        let evs = build_events(&input, &redactor());
        assert_eq!(
            evs[0].msg.as_deref(),
            Some(format!("our vote key {VOTE_PUBKEY} is fine").as_str())
        );
    }

    #[test]
    fn keeps_only_last_ten() {
        let input: Vec<String> = (0..15)
            .map(|i| format!("[t WARN  m] event {i}"))
            .collect();
        let evs = build_events(&input, &redactor());
        assert_eq!(evs.len(), 10);
        assert_eq!(evs[0].msg.as_deref(), Some("event 5"));
        assert_eq!(evs[9].msg.as_deref(), Some("event 14"));
    }

    #[test]
    fn truncates_msg_to_200_chars() {
        // Short words + spaces so nothing looks like a base58 blob to the redactor.
        let long = "slow ".repeat(100); // 500 chars, no redactable token
        let input = lines(&[&format!("[t ERROR m] {long}")]);
        let evs = build_events(&input, &redactor());
        assert_eq!(evs[0].msg.as_ref().unwrap().chars().count(), 200);
    }

    #[test]
    fn empty_input_yields_empty_feed() {
        assert!(build_events(&[], &redactor()).is_empty());
        assert!(build_events(&lines(&["[t INFO m] nothing"]), &redactor()).is_empty());
    }
}
