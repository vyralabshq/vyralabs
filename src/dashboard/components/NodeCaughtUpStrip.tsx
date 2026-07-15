import { fmtInt, fmtSol } from "../format";
import type { Status } from "../health";
import { Missing } from "./Missing";
import { InfoTip } from "./InfoTip";
import { StatStrip } from "./StatStrip";

// Sync + solvency vitals as a dense strip (matches NETWORK): is the node tracking the
// cluster tip, and can it still pay to vote. Finality lag and identity balance tint by
// status; processed slot carries the finalized slot below it as context.

const tone: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-accent-bright",
  down: "text-down",
};

export function NodeCaughtUpStrip({
  finalityLag,
  finalityStatus,
  processedSlot,
  finalizedSlot,
  identityBalanceSol,
  balanceStatus,
}: {
  finalityLag: number | null;
  finalityStatus: Status | null;
  processedSlot: number | null;
  finalizedSlot: number | null;
  identityBalanceSol: number | null;
  balanceStatus: Status | null;
}) {
  return (
    <StatStrip>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">to finality</span>
        <span className={`tabular-nums ${finalityStatus ? tone[finalityStatus] : "text-ink"}`}>
          {fmtInt(finalityLag) ?? <Missing />}
        </span>
        <span className="text-xs text-ink-secondary">slots behind</span>
        <InfoTip text="Gap between the slot your node has processed and the last finalized slot. Around 32 is normal; a growing gap means it's falling behind the cluster." />
      </span>

      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">processed</span>
        <span className="tabular-nums text-ink">{fmtInt(processedSlot) ?? <Missing />}</span>
        <span className="text-xs text-ink-secondary">finalized {fmtInt(finalizedSlot) ?? "?"}</span>
        <InfoTip text="The latest slot your node has processed (its view of the chain tip), with the last finalized slot alongside." />
      </span>

      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">identity</span>
        <span className={`tabular-nums ${balanceStatus ? tone[balanceStatus] : "text-ink"}`}>
          {fmtSol(identityBalanceSol, 2) ?? <Missing />}
        </span>
        <span className="text-xs text-ink-secondary">pays vote fees</span>
        <InfoTip text="SOL in the identity account. Every vote costs a small transaction fee, so this must never run dry or the node stops voting." />
      </span>
    </StatStrip>
  );
}
