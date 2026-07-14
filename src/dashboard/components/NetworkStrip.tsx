import { fmtCompact, fmtInt, fmtPct } from "../format";
import type { Status } from "../health";
import { Missing } from "./Missing";
import { Sparkline } from "./Sparkline";
import { InfoTip } from "./InfoTip";
import { StatStrip } from "./StatStrip";

// Network context (leader blocks, fork weight, cluster tx) is trivia relative to the vote
// vitals above, so it earns one dense inline strip, not three full cards. Each stat is a
// muted label + value; fork weight tints by status, cluster tx carries a throughput spark.

const tone: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-accent-bright",
  down: "text-down",
};

export function NetworkStrip({
  blocksProduced,
  blocksDropped,
  forkWeightPct,
  forkStatus,
  networkTxTotal,
  txHistory,
}: {
  blocksProduced: number | null;
  blocksDropped: number | null;
  forkWeightPct: number | null;
  forkStatus: Status | null;
  networkTxTotal: number | null;
  txHistory: (number | null)[];
}) {
  const noLeaderSlots = blocksProduced === 0 || blocksProduced === null;

  return (
    <StatStrip>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-muted">leader</span>
        <span className="tabular-nums text-ink">{fmtInt(blocksProduced) ?? <Missing />}</span>
        <span className="text-xs text-ink-secondary">
          {noLeaderSlots ? "no leader slots at 0 stake" : `${fmtInt(blocksDropped) ?? 0} skipped`}
        </span>
        <InfoTip text="Blocks this validator produced during its leader slots. Leader slots are handed out in proportion to stake, so with zero stake there are none yet." />
      </span>

      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-muted">fork</span>
        <span className={`tabular-nums ${forkStatus ? tone[forkStatus] : "text-ink"}`}>
          {fmtPct(forkWeightPct, 1) ?? <Missing />}
        </span>
        <span className="text-xs text-ink-secondary">majority share</span>
        <InfoTip text="Share of cluster stake voting on the same fork as your node. Near 100% means you are on the majority chain, not a minority fork." />
      </span>

      <span className="flex items-center gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-ink-muted">network tx</span>
        <span className="tabular-nums text-ink">{fmtCompact(networkTxTotal) ?? <Missing />}</span>
        <Sparkline data={txHistory} width={72} height={18} strokeClass="text-accent" />
        <InfoTip text="Total transactions the whole cluster has processed since genesis. Network-wide context, not specific to your node. The line is per-slot throughput over the last hour." />
      </span>
    </StatStrip>
  );
}
