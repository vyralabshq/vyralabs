import type { EpochCredit } from "../types";
import { fmtAge, fmtInt, fmtSol } from "../format";
import { Missing } from "./Missing";
import { InfoTip } from "./InfoTip";

// Vote performance. Commission carries a badge (not a footnote) so 100% reads as the
// testnet config it is, never a real economic setting. Per-epoch credits render as a
// column chart: epochs on the X-axis, percent-of-max on a fixed 0-100 Y-axis so short
// bars honestly show headroom. Completed epochs are "earned" (credits vs max); the
// current epoch is "on pace" (a projection: credits so far vs how far the epoch has run)
// and gets a dashed ghost to signal it is not a settled value. Bars are colored by tier
// so the ramp reads at a glance. This source has its own 5-minute cadence, so it shows
// its own "as of" age; when the collector marked it stale the whole panel dims.

// Color tiers by percent. One place to tune the red/amber/green cutoffs.
const CREDIT_TIERS = [
  { min: 75, bar: "bg-ok", text: "text-ok" },
  { min: 40, bar: "bg-accent", text: "text-accent" },
  { min: 0, bar: "bg-down", text: "text-down" },
];

function creditTier(pct: number) {
  return (
    CREDIT_TIERS.find((t) => pct >= t.min) ??
    CREDIT_TIERS[CREDIT_TIERS.length - 1]
  );
}

function CreditColumn({
  c,
  currentEpoch,
  progressPct,
}: {
  c: EpochCredit;
  currentEpoch: number | null;
  progressPct: number | null;
}) {
  const inProgress = c.epoch !== null && c.epoch === currentEpoch;
  const earned =
    c.credits !== null && c.max && c.max > 0 ? c.credits / c.max : null;
  const progressFrac = progressPct === null ? null : progressPct / 100;

  const onPace =
    inProgress && earned !== null && progressFrac && progressFrac > 0
      ? Math.min(1, earned / progressFrac)
      : null;

  const frac = inProgress ? onPace : earned;
  const pct = frac === null ? null : Math.max(0, Math.min(100, frac * 100));
  const tier = pct === null ? null : creditTier(pct);
  const label = pct === null ? "—" : `${Math.round(pct)}%`;

  return (
    <div className="flex w-12 flex-col items-center gap-2">
      {/* Bar cell: full-height track. Fill grows from the baseline to pct%; the label
          rides its top; the in-progress ghost dashes the whole track to mark the 100%
          target the on-pace projection is climbing toward. */}
      <div className="relative flex h-28 w-full justify-center">
        <div className="relative h-full w-7">
          {inProgress && (
            <div className="absolute inset-0 rounded-t border border-dashed border-ok/35" />
          )}
          <div
            className={`absolute bottom-0 w-full rounded-t ${tier ? tier.bar : "bg-elevated"} ${inProgress ? "opacity-90" : ""}`}
            style={{ height: `${pct ?? 0}%`, minHeight: pct === null ? 0 : 3 }}
          />
          <span
            className={`absolute w-full -translate-y-1 text-center font-mono text-[10px] tabular-nums ${tier ? tier.text : "text-ink-muted"}`}
            style={{ bottom: `${pct ?? 0}%` }}
          >
            {label}
          </span>
        </div>
      </div>
      {/* X-axis: epoch number, current epoch flagged. */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-[10px] text-ink-secondary">
          {c.epoch ?? "?"}
        </span>
        {inProgress && (
          <span className="rounded-full border border-accent/30 px-1 py-px text-[8px] leading-none text-accent">
            live
          </span>
        )}
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
      className={`flex h-full flex-col gap-4 panel p-4 transition-opacity sm:p-5 ${stale ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-[15px] font-bold text-ink">
          Vote credits
          <InfoTip text="Vote credits are how a validator earns rewards: one per vote that lands on time (up to 16 per slot). Lifetime is the running total; the bars below are per epoch." />
        </h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-tertiary">
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
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-tertiary">
            LIFETIME
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">
            {fmtInt(creditsLifetime) ?? <Missing />}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-tertiary">
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
          <div className="font-mono text-[10px] tracking-[0.1em] text-ink-tertiary">
            STAKE
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-ink">
            {fmtSol(activatedStakeSol, 0) ?? <Missing />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-cream/10 pt-3">
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-tertiary">
          CREDITS PER EPOCH
        </span>
        {epochCredits.length === 0 ? (
          <Missing />
        ) : (
          // Column chart: oldest → newest, left → right, capped to the newest 8 epochs
          // (~2 weeks) — enough to read the trend, few enough that each bar carries
          // signal. The scroll container is the outer element and the track sizes to its
          // content (w-max) with auto side margins: that centers a thin history like an
          // intentional cluster, but still scrolls to the oldest bar on narrow screens —
          // `justify-center` here would make the left overflow unreachable. pt gives the
          // tallest bar's label headroom; bars share a bottom baseline.
          <div className="overflow-x-auto pt-6">
            <div className="relative mx-auto flex w-max items-end gap-4 pl-5">
              {/* Y gridlines behind the bars: 25/50/75/100% reference so a bar's height
                  is readable without leaning on its label. Inside the track so they span
                  and scroll with the bars rather than decoupling from them; the track's
                  left padding is the axis gutter the labels sit in. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-28 flex-col justify-between">
                {[100, 75, 50, 25].map((v) => (
                  <div key={v} className="relative border-t border-cream/10">
                    <span className="absolute -top-1.5 left-0 font-mono text-[8px] text-ink-tertiary">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              {[...epochCredits]
                .sort((a, b) => (a.epoch ?? 0) - (b.epoch ?? 0))
                .slice(-8)
                .map((c, i) => (
                  <CreditColumn
                    key={c.epoch ?? i}
                    c={c}
                    currentEpoch={currentEpoch}
                    progressPct={progressPct}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
