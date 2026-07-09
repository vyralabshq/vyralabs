import type { EpochCredit } from "../types";
import { fmtAge, fmtInt, fmtSol } from "../format";
import { Missing } from "./Missing";

// Vote performance. Commission carries a badge (not a footnote) so 100% reads as the
// testnet config it is, never a real economic setting. Per-epoch credits are shown as a
// rate: the current epoch as "on pace" (credits vs how far the epoch has run), completed
// epochs as "earned" (credits vs max). This source has its own 5-minute cadence, so it
// shows its own "as of" age; when the collector marked it stale the whole panel dims.

function CreditRow({
  c,
  currentEpoch,
  progressPct,
}: {
  c: EpochCredit;
  currentEpoch: number | null;
  progressPct: number | null;
}) {
  const inProgress = c.epoch !== null && c.epoch === currentEpoch;
  const earned = c.credits !== null && c.max && c.max > 0 ? c.credits / c.max : null;
  const progressFrac = progressPct === null ? null : progressPct / 100;

  const onPace =
    inProgress && earned !== null && progressFrac && progressFrac > 0
      ? Math.min(1, earned / progressFrac)
      : null;

  const barFrac = inProgress ? onPace : earned;
  const rightLabel =
    inProgress && onPace !== null
      ? `on pace ${Math.round(onPace * 100)}%`
      : earned !== null
        ? `earned ${Math.round(earned * 100)}%`
        : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-1.5 text-ink-secondary">
          epoch {c.epoch ?? "?"}
          {inProgress && (
            <span className="rounded-full border border-accent/30 px-1.5 py-px text-[10px] text-accent">
              in progress
            </span>
          )}
        </span>
        <span className="text-ink-muted">{rightLabel}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${barFrac === null ? 0 : Math.max(0, Math.min(100, barFrac * 100))}%` }}
        />
      </div>
    </div>
  );
}

export function VoteCredits({
  stale,
  fetchedAgeSeconds,
  creditsLifetime,
  commissionPct,
  activatedStakeSol,
  epochCredits,
  currentEpoch,
  progressPct,
}: {
  stale: boolean;
  fetchedAgeSeconds: number | null;
  creditsLifetime: number | null;
  commissionPct: number | null;
  activatedStakeSol: number | null;
  epochCredits: EpochCredit[];
  currentEpoch: number | null;
  progressPct: number | null;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-xl border border-accent/12 bg-surface/60 p-4 transition-opacity sm:p-5 ${stale ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-bold text-ink">Vote credits</h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
          <span>as of {fmtAge(fetchedAgeSeconds)}</span>
          {stale && (
            <span className="rounded-full border border-down/40 px-1.5 py-0.5 text-down">
              stale
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-muted">
            LIFETIME
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">
            {fmtInt(creditsLifetime) ?? <Missing />}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-muted">
            COMMISSION
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">
            {commissionPct === null ? <Missing /> : `${commissionPct}%`}
          </div>
          <span className="mt-1.5 inline-block whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 px-1.5 py-px font-mono text-[9px] tracking-[0.06em] text-accent">
            testnet config
          </span>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-muted">
            STAKE
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">
            {fmtSol(activatedStakeSol, 0) ?? <Missing />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-accent/10 pt-3">
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-muted">
          CREDITS PER EPOCH
        </span>
        {epochCredits.length === 0 ? (
          <Missing />
        ) : (
          // Newest epoch on top.
          epochCredits
            .map((c, i) => ({ c, i }))
            .reverse()
            .map(({ c, i }) => (
              <CreditRow
                key={c.epoch ?? i}
                c={c}
                currentEpoch={currentEpoch}
                progressPct={progressPct}
              />
            ))
        )}
      </div>
    </div>
  );
}
