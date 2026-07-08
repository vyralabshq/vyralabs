//! Redact secrets from free-text before it enters the snapshot JSON (issue #12).
//!
//! The box's raw logs and error strings carry host paths, IPs, sockets, peer gossip
//! addresses, URLs, and keypair-file locations. None of that may leave the box or land in
//! a committed fixture. This module is the single choke point: any free-text string
//! (`events[].msg`, `errors[]`, captured fixtures) passes through a `Redactor` first.
//!
//! Two guards:
//! - `is_denylisted` drops a whole line that names an obviously sensitive location
//!   (`/home/`, keypair files, an IP:port) — belt-and-braces before redaction runs.
//! - `redact` replaces every path / IP / socket / URL / non-whitelisted base58 pubkey with
//!   `[redacted]`. The node's own two pubkeys (identity + vote) are on-chain and survive.
//!
//! Pure, no I/O. A miss redacts too much, never too little. `[redacted]` contains no
//! redactable token, so redaction is idempotent.

use std::collections::HashSet;
use std::sync::OnceLock;

use regex::Regex;

const PLACEHOLDER: &str = "[redacted]";

/// Redacts secrets from text, keeping only whitelisted base58 pubkeys.
#[derive(Debug, Clone)]
pub struct Redactor {
    whitelist: HashSet<String>,
}

// Compiled once, reused across every call. Application order matters (see `redact`).
fn url_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[a-zA-Z][a-zA-Z0-9+.-]*://\S+").unwrap())
}

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

    /// True if the whole line should be dropped rather than redacted: it names a home
    /// directory, a keypair file, or an IP:port. Cheaper and stricter than trusting
    /// redaction to catch every shape.
    pub fn is_denylisted(&self, line: &str) -> bool {
        line.contains("/home/")
            || line.contains("identity.json")
            || line.contains("vote-account.json")
            || socket_re().is_match(line)
    }

    /// Return `text` with URLs, paths, IPs, sockets, and non-whitelisted pubkeys replaced
    /// by `[redacted]`. URLs first (they embed `//host/path` the path rule would half-eat);
    /// then sockets before bare IPs so the port goes too.
    pub fn redact(&self, text: &str) -> String {
        let out = url_re().replace_all(text, PLACEHOLDER);
        let out = path_re().replace_all(&out, PLACEHOLDER);
        let out = socket_re().replace_all(&out, PLACEHOLDER);
        let out = ipv4_re().replace_all(&out, PLACEHOLDER);
        let out = ipv6_re().replace_all(&out, PLACEHOLDER);
        let out = base58_re().replace_all(&out, |caps: &regex::Captures| {
            let m = &caps[0];
            if self.whitelist.contains(m) {
                m.to_string()
            } else {
                PLACEHOLDER.to_string()
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
    fn strips_paths_ips_urls() {
        let r = redactor();
        assert_eq!(r.redact("read /mnt/ledger/x failed"), "read [redacted] failed");
        assert_eq!(r.redact("bind 192.168.1.5"), "bind [redacted]");
        assert_eq!(r.redact("peer 10.0.0.1:8001 up"), "peer [redacted] up");
        assert_eq!(
            r.redact("GET https://api.testnet.solana.com/x now"),
            "GET [redacted] now"
        );
    }

    #[test]
    fn keeps_whitelisted_pubkeys_redacts_others() {
        let r = redactor();
        assert_eq!(r.redact(IDENTITY_PUBKEY), IDENTITY_PUBKEY);
        assert_eq!(r.redact(VOTE_PUBKEY), VOTE_PUBKEY);
        let foreign = "So11111111111111111111111111111111111111112";
        assert_eq!(r.redact(&format!("peer {foreign} joined")), "peer [redacted] joined");
    }

    #[test]
    fn leaves_ordinary_prose_and_timestamps_alone() {
        let r = redactor();
        let s = "tower-vote latest=420559488i and/or done at 12:34:56";
        assert_eq!(r.redact(s), s);
    }

    #[test]
    fn denylist_catches_home_keypairs_and_sockets() {
        let r = redactor();
        assert!(r.is_denylisted("loaded /home/sol/x"));
        assert!(r.is_denylisted("reading identity.json"));
        assert!(r.is_denylisted("reading vote-account.json"));
        assert!(r.is_denylisted("dial 10.0.0.1:8001"));
        assert!(!r.is_denylisted("everything fine here"));
    }

    #[test]
    fn is_idempotent() {
        let r = redactor();
        let once = r.redact("peer 10.0.0.1:8001 at /mnt/ledger/id.json via https://x/y");
        assert_eq!(r.redact(&once), once);
    }
}
