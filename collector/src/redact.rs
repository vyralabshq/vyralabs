//! Redact secrets from free-text before it enters the snapshot JSON (issue #12).
//!
//! The box's raw logs and error strings carry host paths, IPs, sockets, peer gossip
//! addresses, and keypair-file locations. None of that may leave the box or land in a
//! committed fixture. This module is the single choke point: any free-text string
//! (`errors[]`, `events[].msg`, captured fixtures) passes through a `Redactor` first.
//!
//! Whitelist: the validator's own two public pubkeys (identity + vote) are on-chain and
//! safe, so they survive; every other base58 blob is treated as a peer pubkey / keypair
//! reference and replaced. Pure, no I/O. A miss redacts too much, never too little.

use std::collections::HashSet;
use std::sync::OnceLock;

use regex::Regex;

/// Redacts secrets from text, keeping only whitelisted base58 pubkeys.
#[derive(Debug, Clone)]
pub struct Redactor {
    whitelist: HashSet<String>,
}

// Compiled once, reused across every `redact` call. Order of application matters
// (see `redact`), so each pattern is kept separate rather than alternated.
fn path_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    // An absolute unix path with >=2 segments: /home/sol/validator-keypair.json.
    // Requiring two segments avoids eating prose like "and/or".
    RE.get_or_init(|| Regex::new(r"(?:/[A-Za-z0-9._-]+){2,}/?").unwrap())
}

fn socket_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    // IPv4 with a port: 10.0.0.1:8001.
    RE.get_or_init(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}\b").unwrap())
}

fn ipv4_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b").unwrap())
}

fn ipv6_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    // Guarded to 4+ colon-separated hextets (or a `::`) so log timestamps like
    // 12:34:56 (two colons, decimal) are never mistaken for an address.
    RE.get_or_init(|| {
        Regex::new(r"\b(?:[0-9A-Fa-f]{1,4}:){4,7}[0-9A-Fa-f]{1,4}\b|\b[0-9A-Fa-f]{0,4}(?:::[0-9A-Fa-f]{0,4}){1,}\b").unwrap()
    })
}

fn base58_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    // base58 alphabet (no 0 O I l), pubkey-length blob. Signatures (~88 chars) are
    // out of range on purpose; we only care about 32..44-char account keys.
    RE.get_or_init(|| Regex::new(r"[1-9A-HJ-NP-Za-km-z]{32,44}").unwrap())
}

impl Redactor {
    /// Build a redactor whose whitelist is the given safe-to-keep base58 pubkeys.
    pub fn new<I, S>(whitelist: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Redactor {
            whitelist: whitelist.into_iter().map(Into::into).collect(),
        }
    }

    /// Return `text` with paths, IPs, sockets, and non-whitelisted pubkeys replaced by
    /// placeholders. Idempotent: the placeholders themselves contain no redactable tokens.
    pub fn redact(&self, text: &str) -> String {
        // Paths first: a keypair path may embed a base58 basename, and the path rule
        // should claim the whole span. Then sockets before bare IPs so the port goes too.
        let out = path_re().replace_all(text, "<path>");
        let out = socket_re().replace_all(&out, "<socket>");
        let out = ipv4_re().replace_all(&out, "<ip>");
        let out = ipv6_re().replace_all(&out, "<ip>");
        let out = base58_re().replace_all(&out, |caps: &regex::Captures| {
            let m = &caps[0];
            if self.whitelist.contains(m) {
                m.to_string()
            } else {
                "<pubkey>".to_string()
            }
        });
        out.into_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{IDENTITY_PUBKEY, VOTE_PUBKEY};

    fn redactor() -> Redactor {
        Redactor::new([IDENTITY_PUBKEY, VOTE_PUBKEY])
    }

    #[test]
    fn strips_paths() {
        let r = redactor();
        assert_eq!(
            r.redact("failed to read /home/sol/validator-keypair.json"),
            "failed to read <path>"
        );
        assert_eq!(r.redact("--ledger /mnt/ledger monitor"), "--ledger <path> monitor");
    }

    #[test]
    fn strips_ips_and_sockets() {
        let r = redactor();
        assert_eq!(r.redact("peer 10.0.0.1:8001 gossiping"), "peer <socket> gossiping");
        assert_eq!(r.redact("bind 192.168.1.5"), "bind <ip>");
    }

    #[test]
    fn keeps_whitelisted_pubkeys_redacts_others() {
        let r = redactor();
        // own identity + vote survive
        assert_eq!(r.redact(IDENTITY_PUBKEY), IDENTITY_PUBKEY);
        assert_eq!(r.redact(VOTE_PUBKEY), VOTE_PUBKEY);
        // a foreign peer pubkey is stripped, even mid-sentence
        let foreign = "So11111111111111111111111111111111111111112";
        assert_eq!(r.redact(&format!("peer {foreign} joined")), "peer <pubkey> joined");
    }

    #[test]
    fn leaves_ordinary_prose_and_timestamps_alone() {
        let r = redactor();
        let s = "[2026-07-08T09:59:07.314Z INFO] tower-vote latest=420559488i and/or done";
        assert_eq!(r.redact(s), s);
    }

    #[test]
    fn empty_whitelist_redacts_all_pubkeys() {
        let r = Redactor::new(Vec::<String>::new());
        assert_eq!(r.redact(IDENTITY_PUBKEY), "<pubkey>");
    }

    #[test]
    fn is_idempotent() {
        let r = redactor();
        let once = r.redact("peer 10.0.0.1:8001 at /home/sol/id.json");
        assert_eq!(r.redact(&once), once);
    }
}
