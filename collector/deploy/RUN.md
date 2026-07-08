# Running the collector on the validator box

The collector runs on the box as user `sol`, samples every source read-only, and writes
`latest.json` + `history-1h.json` + `history-24h.json` to **tmpfs (RAM)** every 10s. It
never opens a port, never writes to the validator's SSDs, and its output is size-bounded
(~630 KB steady state). Getting those files to a public URL (R2 / Tunnel) is a later step.

## 1. Get the code on the box

```bash
cd /home/sol
git clone https://github.com/vyralabshq/vyralabs.git   # or: git pull if already cloned
```

## 2. Install Rust (once)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

## 3. Build (release)

```bash
cd /home/sol/vyralabs/collector
cargo build --release
```

## 4. Smoke test with `--once`

Confirm it produces real data before running the loop:

```bash
mkdir -p /dev/shm/collector
OUT_DIR=/dev/shm/collector STATE_PATH=/dev/shm/collector/state.json \
  ./target/release/collector --daemon &   # let it run ~15s
sleep 15; kill %1
cat /dev/shm/collector/latest.json | head -40
```

Check `slots`, `epoch`, `health`, `vote` are populated (not all null). If the log-derived
fields (`vote`, `block_production`, `fork_weight`) are null, the datapoints aren't being
found — see **Log source** below.

## 5. Install as a service

```bash
sudo cp /home/sol/vyralabs/collector/deploy/collector.service /etc/systemd/system/
# Edit the PATH / LOG_FILE lines in the unit if needed (see comments in the file).
sudo systemctl daemon-reload
sudo systemctl enable --now collector
systemctl status collector
journalctl -u collector -f        # watch it; quiet on success, logs failing sources
```

## Log source (important)

The collector needs the validator's **metrics datapoint** log lines
(`datapoint: tower-vote ...`, `blocks_produced`, `bank_weight`, ...) for vote lag, drop
rate and fork weight. Find where your validator logs them:

```bash
journalctl -u sol.service | grep 'datapoint: tower-vote' | tail -1     # in journald?
grep 'datapoint: tower-vote' /mnt/ledger/validator.log | tail -1       # or a log file?
```

- If they're in **journald**, do nothing — the collector reads `journalctl -u sol.service`.
- If they're in a **file**, set `LOG_FILE=/path/to/that.log` in the unit.

## Config

Paths are baked in `collector/src/config.rs` and match this box:
`LEDGER_PATH=/mnt/ledger`, `ACCOUNTS_PATH=/mnt/accounts`, `SERVICE_NAME=sol.service`,
pubkeys as configured. Runtime env (`OUT_DIR`, `STATE_PATH`, `RPC_URL`, `LOG_FILE`,
`CYCLE_SECS`) is set in the unit.

## Going public (later)

The daemon writes JSON to `/dev/shm/collector`. To serve it to the dashboard, the upload
plugs into `publish()` in `src/main.rs` (R2), or point a Cloudflare Tunnel at a tiny static
server over that directory. Until then, `scp` the files to view locally.
