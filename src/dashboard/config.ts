// Single source of runtime config for the dashboard. Swapping the metrics origin
// (fixtures -> r2.dev -> custom domain) is a one-line change here, per the spec §5.

// Public on-chain pubkeys for the Vyra testnet validator. Both are safe to embed and
// double as the redactor base58 whitelist on the collector side.
export const IDENTITY_PUBKEY = "vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg";
export const VOTE_PUBKEY = "9LjQ5UC1gyebUySAbodzHJdLSkYAYgVeQcr2vv6FZP6E";

// Live metrics origin: the R2 r2.dev subdomain (later a custom domain). Empty until the
// collector (#8) is live; slice #7 sets this and wires the polling fetch. Changing the
// origin is a one-line change here.
export const METRICS_BASE_URL = "";

// The page never ships fabricated data. In local dev (and with no live URL configured)
// it renders the checked-in fixtures so the UI is buildable before the collector exists.
// In a production build it shows an honest "awaiting live data" state until METRICS_BASE_URL
// points at a real source.
export const USE_FIXTURES = import.meta.env.DEV && METRICS_BASE_URL === "";

/** True while a live metrics URL is configured (drives the future polling fetch). */
export const HAS_LIVE_SOURCE = METRICS_BASE_URL !== "";

/** Whole-page staleness bound (seconds): snapshot older than this dims the page. */
export const STALE_AFTER_SECONDS = 30;

/** Offline bound (seconds): past this the snapshot is treated as OFFLINE (#7). */
export const OFFLINE_AFTER_SECONDS = 90;

/** Live poll cadences (ms): latest every 10s, 1h history 30s, 24h history 5 min / tab focus. */
export const POLL_LATEST_MS = 10_000;
export const POLL_HISTORY_1H_MS = 30_000;
export const POLL_HISTORY_24H_MS = 5 * 60_000;

/** Approximate testnet slot time, used only for the epoch ETA estimate. */
export const SLOT_TIME_SECONDS = 0.4;
