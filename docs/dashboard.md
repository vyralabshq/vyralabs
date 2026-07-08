# Validator Dashboard

One doc for the `/dashboard` feature: the data contract, the words we use, and why it is
built this way. The JSON schema below is the single source of truth shared by the
frontend types (`src/dashboard/types.ts`) and, later, the collector
(`collector/src/schema.rs`). Edit both sides together when it changes. `schema_version` is `1`.

## Why static JSON, not a metrics backend

The validator box stays locked down: no new inbound ports, no service exposing internals,
read only access to the node. So a collector on the box **pushes** sanitized JSON to a
public Cloudflare R2 bucket, and the dashboard **polls** those static files. The bucket is
the only channel between box and page. No Prometheus/Grafana, no metrics API, no scrape
port. Redaction happens on the box before upload, so the public bucket is safe by
construction. Trade-off: resolution and history are bounded by what the collector
pre-aggregates (1h/24h windows), and freshness is polling-bound (~10s), which is fine for
a health view. The frontend degrades gracefully when the collector dies (last known values
dimmed, never blanked).

## Words

- **Collector**: the Python daemon on the box. Each **Cycle** (~10s) it samples every
  source read only, assembles sanitized JSON, and uploads to the bucket. Never touches the
  validator.
- **Snapshot**: the `latest.json` object, current state.
- **History Window**: rolling series the collector keeps, 1h at 10s resolution and 24h at
  60s, trimmed each Cycle.
- **Datapoint**: a metrics line the validator logs (`tower-vote`, `blocks_produced`,
  `bank_weight`, etc). The collector takes the most-recent of each.
- **Node Healthy**: the one up signal, `health.rpc === "ok"`.
- **Finality lag** = processed minus finalized (normal ~32). **Vote lag** = latest minus
  root. **Drop rate** = dropped / (produced + dropped), cumulative since restart. **Fork
  weight %** = the voted fork's `bank_weight` fraction times 100.
- **Stale**: two kinds. Whole-page = `now - generated_at > 30s`. Source = `vote_account.stale`
  (the 5-min public RPC failed; only that panel dims).

## Datapoint format

Agave metrics lines look like
`[<ISO8601>Z INFO  solana_metrics::metrics] datapoint: <name> k=v k=v`. Integers carry a
trailing `i`, floats do not, strings are quoted. Representative lines (format real, numbers
illustrative):

```text
datapoint: tower-vote latest=420000000i root=419999969i
datapoint: blocks_produced num_blocks_on_fork=365000i num_dropped_blocks_on_fork=7400i
datapoint: bank_weight slot=420000000i fork_stake=300000000000000000i fork_weight=0.95
datapoint: bank-new_from_parent-heights slot=420000000i block_height=372000000i
datapoint: replay-slot-stats slot=420000000i total_transactions=464i
```

`fork_weight` is a 0 to 1 fraction. The most-recent line is often the fresh tip slot with a
tiny weight, so "fork health %" should track the fork the node actually voted (align
`bank_weight.slot` with the latest `tower-vote.latest`). Pin the exact rule at #9 against
real logs. When #9 to #11 land, capture real source outputs on the box as local `cargo test`
fixtures; never commit host paths, IPs, sockets, peer addresses, or keypair locations
(the redactor at #12 exists because raw logs carry those).

## Pubkeys

Real on-chain pubkeys for the Vyra testnet validator (both public, safe to embed). They
anchor the fixtures and the redactor whitelist. Source of truth: `src/dashboard/config.ts`.

- identity: `vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg`
- vote: `9LjQ5UC1gyebUySAbodzHJdLSkYAYgVeQcr2vv6FZP6E`

## Schema

Every field is nullable unless noted. `null` means "this source failed this Cycle" and
renders as a placeholder, never `NaN`/`undefined`. Derived values (finality lag, vote lag,
drop rate, epoch progress, fork weight %) are computed by `parseSnapshot`, not stored, so
the two sides can never disagree.

### `latest.json`

```jsonc
{
  "schema_version": 1,
  "generated_at": "2026-07-08T12:34:56Z", // UTC; drives whole-page staleness
  "cluster": "testnet",
  "identity_pubkey": "<base58>",
  "vote_pubkey": "<base58>",

  "health": { "rpc": "ok" }, // Node Healthy = rpc === "ok"
  "version": { "version": "2.2.14", "jito": true },

  "slots": {
    "processed": 0,
    "confirmed": 0,
    "finalized": 0,
    "full_snapshot": 0,
    "incremental_snapshot": 0,
    "network_tx_total": 0,
  },
  "identity_balance_sol": 0.0,

  "epoch": {
    "epoch": 0,
    "slot_index": 0,
    "slots_in_epoch": 432000,
    "absolute_slot": 0,
    "block_height": 0,
  },

  "vote": { "latest": 0, "root": 0 }, // from tower-vote
  "block_production": { "produced": 0, "dropped": 0 }, // num_blocks_on_fork / num_dropped_blocks_on_fork
  "fork_weight": 0.95, // raw 0-1 fraction from bank_weight

  "system": {
    "ledger_disk": { "pct": 0.0, "used_gb": 0.0, "total_gb": 0.0 },
    "accounts_disk": { "pct": 0.0, "used_gb": 0.0, "total_gb": 0.0 },
    "memory": { "pct": 0.0, "used_gb": 0.0, "total_gb": 0.0 },
    "load_avg": [0.0, 0.0, 0.0], // 1 / 5 / 15 min
    "cpu_cores": 0,
    "uptime_seconds": 0,
    "process_active": true,
  },

  "vote_account": {
    "stale": false,
    "fetched_at": "2026-07-08T12:30:00Z", // own 5-min cadence
    "credits_lifetime": 0,
    "commission_pct": 100, // testnet config, not economic
    "activated_stake_sol": 0.0,
    "epoch_credits": [{ "epoch": 0, "credits": 0, "max": 0 }],
  },

  "events": [
    { "ts": "2026-07-08T12:34:00Z", "level": "WARN", "msg": "redacted" },
  ],
  "errors": [], // which sources failed this Cycle
}
```

Status pills: Node Healthy (`health.rpc === "ok"`), Process Active (`system.process_active`),
Jito Active (`version.jito`).

Field sources (verified against the box):

- `agave-validator --ledger <path> monitor` gives only the five slot numbers
  (`processed`, `confirmed`, `finalized`, `full_snapshot`, `incremental_snapshot`). Its
  leading `HH:MM:SS` is the monitor process's own runtime, not node uptime, and is ignored.
- `network_tx_total` comes from `getEpochInfo.transactionCount`, `identity_balance_sol` from
  `getBalance(identity)` (both cheap localhost RPC), not from monitor.
- `block_height`, `epoch`, health and version come from RPC / log datapoints; `uptime_seconds`
  from `systemctl`.

### `history-1h.json` / `history-24h.json`

```jsonc
{
  "schema_version": 1,
  "window": "1h", // or "24h"
  "resolution_seconds": 10, // 10 for 1h (~360 pts), 60 for 24h (~1440 pts)
  "generated_at": "2026-07-08T12:34:56Z",
  "points": [
    {
      "t": "2026-07-08T12:34:56Z",
      "processed": 0,
      "finalized": 0,
      "vote_lag": 0,
      "identity_sol": 0.0,
      "mem_pct": 0.0,
      "tx_per_slot": 0.0,
      "drop_rate_pct": 0.0,
    },
  ],
}
```

Any point field may be `null`; charts tolerate gaps.

## Seams

- Frontend: `parseSnapshot(raw, now)` and `parseHistory(raw)`. Pure, `now`-injected, never
  throw. The only tested frontend surface.
- Collector: `build_snapshot(inputs, now, prev_state)` and the pure parsers/redactor/window
  manager below it. The I/O shell (fetchers, S3 upload, loop) is thin and injected.

## Delivery

Second Vite entry `dashboard.html` served at `/dashboard` (keeps ECharts off the landing
bundle). Deployed on Vercel (`vercel.json` rewrites `/dashboard`). Cloudflare only hosts the
R2 bucket. `src/dashboard/config.ts` `METRICS_BASE_URL` is the single origin switch:
fixtures in dev, the r2.dev URL later (#7), a custom domain after that. With no live URL a
production build shows an honest "awaiting live data" state, never fabricated numbers.
