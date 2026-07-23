//! Collector configuration constants.
//!
//! Only non-sensitive values live here. Host paths, R2 credentials, and anything else
//! that must not enter the repo are read from the environment / a chmod-600 .env on the
//! box (added in issue #14), never committed.

// Public on-chain pubkeys for the Vyra testnet validator (safe to embed; they double as
// the redactor base58 whitelist added in issue #12).
pub const IDENTITY_PUBKEY: &str = "vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg";
pub const VOTE_PUBKEY: &str = "9LjQ5UC1gyebUySAbodzHJdLSkYAYgVeQcr2vv6FZP6E";
pub const CLUSTER: &str = "testnet";

// Jito detection is NOT a config flag: it went stale when the client switched (jito ->
// agave) and the dashboard lied for 20h. It is detected at runtime from the live binary
// (`fetch::detect_jito_client`), so it can never disagree with reality again.

// Host paths for OS-stat gathering. Two separate NVMe drives on this box:
// ledger dir lives on / (nvme0n1p2), accounts on its own disk (nvme1n1 -> /mnt/accounts).
pub const LEDGER_PATH: &str = "/mnt/ledger";
pub const ACCOUNTS_PATH: &str = "/mnt/accounts";
pub const SERVICE_NAME: &str = "sol.service";
