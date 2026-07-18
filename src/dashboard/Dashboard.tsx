// Dashboard page. Parsed data across the mission-control layout, ordered by what an
// operator checks first: status, events, the health numbers, resources, history, then
// trivia. When a live metrics origin is configured (#7) it polls that; otherwise dev
// serves the checked-in fixtures. Either way the state is re-derived every tick so a
// snapshot ages LIVE -> STALE -> OFFLINE on its own, values dimmed but never hidden.

import { USE_FIXTURES, HAS_LIVE_SOURCE } from "./config";
import { loadFixtureLatest } from "./fixtureSource";
import { parseSnapshot, parseHistory } from "./parse";
import { useNow } from "./hooks/useNow";
import { useMetrics } from "./hooks/useMetrics";
import { AwaitingState } from "./components/AwaitingState";
import { status, type Status } from "./health";
import { fmtInt, fmtPct, fmtCompact } from "./format";
import { StatusPills } from "./components/StatusPills";
import { StatusHero, type Verdict } from "./components/StatusHero";
import { PubkeyChip } from "./components/PubkeyChip";
import type { DashboardState } from "./types";
import { Banner } from "./components/Banner";
import { Disclaimer } from "./components/Disclaimer";
import { StatPanel } from "./components/StatPanel";
import { InfoTip } from "./components/InfoTip";
import { RecentVotes } from "./components/RecentVotes";
import { IconVote } from "./components/icons";
import { SystemStrip } from "./components/SystemStrip";
import { NetworkStrip } from "./components/NetworkStrip";
import { StatStrip } from "./components/StatStrip";
import { LeaderTimeline } from "./components/LeaderTimeline";
import { LeaderSlots } from "./components/LeaderSlots";
import {
  LEADER_GROUPS,
  BLOCK_STATS,
  NEXT_LEADER_SLOT,
  RECENT_LEADER_SLOTS,
  CURRENT_SLOT,
  EPOCH_START,
  EPOCH_END,
  CLUSTER_SKIP_PCT,
} from "./demoBlocks";
import { NodeCaughtUpStrip } from "./components/NodeCaughtUpStrip";
import { VoteCredits } from "./components/VoteCredits";
import { EventFeed } from "./components/EventFeed";
import { lazy, Suspense } from "react";
import { CHART } from "./charts/palette";
import history1h from "./fixtures/history-1h.json";

// ECharts loads on demand (below the fold) so it stays out of the eager dashboard chunk.
const TimeSeriesChart = lazy(() =>
  import("./charts/TimeSeriesChart").then((m) => ({
    default: m.TimeSeriesChart,
  })),
);
const DonutChart = lazy(() =>
  import("./charts/RadialChart").then((m) => ({ default: m.DonutChart })),
);

const container = "relative z-10 mx-auto max-w-[1100px] px-4 sm:px-6";
const sectionLabel =
  "mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-tertiary";

const headlineTone: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-accent-bright",
  down: "text-down",
};

// Headline number for a LAST HOUR chart: gives each trend a current-value callout so the
// chart is the supporting viz, not an orphan. Tinted + worded by status.
function ChartHeadline({
  value,
  unit,
  status: st,
  words,
}: {
  value: string | null;
  unit: string;
  status: Status | null;
  words: Record<Status, string>;
}) {
  const tone = st ? headlineTone[st] : "text-ink";
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-display text-lg font-bold leading-none tabular-nums ${tone}`}>
        {value ?? "—"}
      </span>
      <span className="font-mono text-[11px] text-ink-secondary">{unit}</span>
      {st && value !== null && (
        <span className={`font-mono text-[10px] ${tone}`}>{words[st]}</span>
      )}
    </span>
  );
}

function behind(tip: number | null, snap: number | null): number | null {
  return tip === null || snap === null ? null : tip - snap;
}

// Light exponential smoothing for the chart line only (the cards show raw values). Rounds
// single-sample jitter from the 10s poll into a flowing line, while a real sustained spike
// still lifts the curve. Gaps (nulls) reset the filter so a failed cycle stays a gap.
function ema(data: (number | null)[], alpha: number): (number | null)[] {
  let prev: number | null = null;
  return data.map((v) => {
    if (v === null) {
      prev = null;
      return null;
    }
    prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
    return prev;
  });
}

// Roll every signal into one headline verdict. Liveness wins first (stale/offline data
// makes any judgement meaningless), then the worst of the process signals and the metric
// thresholds decides operational / degraded / critical.
function rollup(s: DashboardState): {
  word: string;
  tone: Verdict;
  detail: string;
} {
  if (s.liveness === "OFFLINE")
    return {
      word: "OFFLINE",
      tone: "down",
      detail: "no fresh data from the box",
    };
  if (s.liveness === "STALE")
    return {
      word: "STALE",
      tone: "warn",
      detail: "data is behind — showing last known",
    };

  const metrics = [
    status.finalityLag(s.finalityLag),
    status.voteDistance(behind(s.processedSlot, s.voteLatest)),
    status.dropRate(s.dropRatePct),
    status.forkWeight(s.forkWeightPct),
    status.balance(s.identityBalanceSol),
  ];
  const downSignals = [s.nodeHealthy, s.processActive, s.jitoActive].filter(
    (x) => x === false,
  ).length;
  const down = metrics.filter((m) => m === "down").length + downSignals;
  const warn = metrics.filter((m) => m === "warn").length;

  if (down > 0)
    return {
      word: "CRITICAL",
      tone: "down",
      detail: `${down} ${down === 1 ? "check" : "checks"} need attention`,
    };
  if (warn > 0)
    return {
      word: "DEGRADED",
      tone: "warn",
      detail: `${warn} ${warn === 1 ? "metric" : "metrics"} elevated`,
    };
  return { word: "OPERATIONAL", tone: "ok", detail: "all systems normal" };
}

export default function Dashboard() {
  const now = useNow();
  const live = useMetrics(now); // inert unless METRICS_BASE_URL is set

  // Live origin wins once it has data; else dev fixtures; else the honest awaiting state.
  // Hooks above always run, so the early return here is safe.
  const useLive = HAS_LIVE_SOURCE && live.hasData;
  if (!useLive && !USE_FIXTURES) return <AwaitingState />;

  const s = useLive
    ? live.snapshot
    : parseSnapshot(loadFixtureLatest(now), now);
  const history = useLive ? live.history1h : parseHistory(history1h);

  // STALE/OFFLINE dims the whole page but never hides values (#7 degradation contract).
  const dimmed = s.liveness !== "LIVE";

  const pts = history.points;
  const times = pts.map((p) => p.t);
  const finalityLagSeries = pts.map((p) =>
    p.processed !== null && p.finalized !== null
      ? p.processed - p.finalized
      : null,
  );

  const fetchedAge =
    s.voteAccountFetchedAt === null
      ? null
      : (now.getTime() - s.voteAccountFetchedAt.getTime()) / 1000;

  // Vote distance: how many slots behind the chain tip our last vote landed. This is the
  // real "is it keeping up" signal (unlike tower depth, which sits near 31 always).
  const voteDistance = behind(s.processedSlot, s.voteLatest);
  const voteWord =
    voteDistance === null
      ? null
      : voteDistance <= 64
        ? "voting"
        : voteDistance <= 128
          ? "lagging"
          : "delinquent";

  // Smoothed finality-lag line for the history chart.
  const finalityLagChart = ema(finalityLagSeries, 0.35);

  // DEMO block-production derivations (see demoBlocks.ts). Slot count -> ETA at 400ms/slot,
  // and the three-way donut split. Replaced by collector data when block production lands.
  const nextLeaderIn =
    NEXT_LEADER_SLOT === null ? null : NEXT_LEADER_SLOT - CURRENT_SLOT;
  const nextLeaderMin =
    nextLeaderIn === null ? null : Math.round((nextLeaderIn * 0.4) / 60);
  const blockDonut = [
    { name: "produced", value: BLOCK_STATS.produced, color: CHART.ok },
    { name: "skipped", value: BLOCK_STATS.skipped, color: CHART.down },
    { name: "upcoming", value: BLOCK_STATS.upcoming, color: CHART.inkMuted },
  ];

  // Vote-credit economics for the current epoch (the SFDP-relevant view), derived from the
  // one in-progress epoch row. Efficiency = credits captured vs the theoretical max for the
  // slots elapsed so far (the "on pace" rate). The donut splits the epoch's ceiling into
  // earned / missed-so-far / still-earnable.
  const curCredit = s.epochCredits.find((c) => c.epoch === s.epoch);
  const progFrac =
    s.epochProgressPct === null ? null : s.epochProgressPct / 100;
  const voteEfficiency =
    curCredit &&
    curCredit.credits !== null &&
    curCredit.max &&
    progFrac &&
    progFrac > 0
      ? Math.min(100, (curCredit.credits / curCredit.max / progFrac) * 100)
      : null;

  const DIM = "rgba(184,146,116,0.20)";
  const creditDonut =
    curCredit &&
    curCredit.credits !== null &&
    curCredit.max &&
    progFrac !== null
      ? (() => {
          const max = curCredit.max!;
          const earned = curCredit.credits!;
          const elapsedMax = max * progFrac;
          const missed = Math.max(0, elapsedMax - earned);
          const remaining = Math.max(0, max - elapsedMax);
          return {
            earned,
            max,
            segments: [
              { name: "earned", value: earned, color: CHART.accent },
              { name: "missed", value: missed, color: CHART.down },
              { name: "still earnable", value: remaining, color: DIM },
            ],
          };
        })()
      : null;

  const verdict = rollup(s);

  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      {!useLive && (
        <div className="sticky top-0 z-20 border-b border-accent/20 bg-elevated/85 px-6 py-1.5 text-center font-mono text-[11px] tracking-[0.14em] text-accent backdrop-blur">
          sample data (local dev), not the live validator
        </div>
      )}

      <header className={`${container} flex h-18 items-center`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="/"
          aria-label="Vyra home"
        >
          <img
            className="-ml-1.5 h-10 w-10 object-contain mix-blend-screen"
            src="/logo.png"
            alt=""
          />
          <span>
            v<span className="text-accent">y</span>ra
          </span>
        </a>
      </header>

      <main
        className={`${container} pt-6 pb-24 transition-opacity duration-500 ${dimmed ? "opacity-55" : "opacity-100"}`}
      >
        {/* Hero: intro left, rolled-up verdict right — one balanced block, no dead space */}
        <div className="mb-6 grid gap-6 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-[0.18em] text-accent">
              status
            </p>
            <h1 className="font-display text-[clamp(30px,4vw,42px)] font-bold tracking-[-0.02em]">
              How the node is doing
            </h1>
            <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-secondary">
              Live health of the Vyra validator on testnet, read straight from
              the box.
            </p>
          </div>
          <StatusHero
            word={verdict.word}
            tone={verdict.tone}
            detail={verdict.detail}
            cluster={s.cluster}
            ageSeconds={s.ageSeconds}
            liveness={s.liveness}
          />
        </div>

        {s.banner && (
          <div className="mb-6">
            <Banner message={s.banner} />
          </div>
        )}

        {/* Identity + liveness band: full width, so the left column above stays uncluttered */}
        <div className="flex flex-wrap items-center justify-between gap-4 panel px-5 py-4">
          <StatusPills
            nodeHealthy={s.nodeHealthy}
            processActive={s.processActive}
            version={s.version}
          />
          <div className="flex flex-wrap gap-2.5">
            <PubkeyChip label="identity" value={s.identityPubkey} />
            <PubkeyChip label="vote" value={s.votePubkey} />
          </div>
        </div>

        {/* Is it voting: the validator's actual job, answered first and in plain words */}
        <section className="mt-10">
          <p className={sectionLabel}>IS IT VOTING</p>
          <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 md:grid-cols-3">
            <StatPanel
              label="VOTE DISTANCE"
              value={fmtInt(voteDistance)}
              unit="slots behind tip"
              status={status.voteDistance(voteDistance)}
              icon={<IconVote />}
              info="How many slots behind the chain tip your last vote landed. 1-2 means the node is keeping up; above ~128 the cluster marks it delinquent."
              sub={
                voteWord
                  ? `${voteWord} · last vote vs chain tip`
                  : "last vote vs chain tip"
              }
            />
            <StatPanel
              label="VOTE SUCCESS"
              value={
                voteEfficiency === null
                  ? null
                  : `${Math.round(voteEfficiency)}%`
              }
              status={status.voteSuccess(voteEfficiency)}
              info="Share of this epoch's possible vote credits earned so far. 100% means every vote landed at the earliest slot; low means votes are landing late."
              sub={
                <>
                  <div>credits earned vs possible</div>
                  <div className="mt-1 font-mono text-[13px] text-ink-secondary">
                    epoch{" "}
                    <span className="font-display text-[17px] font-bold tabular-nums text-ink">
                      {fmtInt(s.epoch) ?? "?"}
                    </span>
                    {s.epochProgressPct !== null && (
                      <span className="text-ink-tertiary">
                        {" "}
                        · {Math.round(s.epochProgressPct)}% in
                      </span>
                    )}
                  </div>
                </>
              }
            />
            <StatPanel
              label="LAST VOTE SLOT"
              value={fmtInt(s.voteLatest)}
              info="The slot of your most recent landed vote, shown next to the current chain tip so you can see how close they are."
              sub={<>chain tip {fmtInt(s.processedSlot) ?? "?"}</>}
            />
          </div>
        </section>

        {/* Is it producing: the block-side mirror of "is it voting". DEMO data — the
            collector does not emit leader-schedule / block-production yet, so this section
            wears a "preview" badge and runs off demoBlocks.ts until that lands. */}
        <section className="mt-10">
          <p className={`${sectionLabel} flex items-center gap-2`}>
            IS IT PRODUCING
            <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-px text-[9px] tracking-[0.06em] text-accent">
              preview · demo data
            </span>
          </p>

          <div className="mb-3">
            <StatStrip>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">
                  next leader
                </span>
                <span className="tabular-nums text-ink">
                  {fmtInt(NEXT_LEADER_SLOT) ?? "—"}
                </span>
                <span className="text-xs text-ink-secondary">
                  {nextLeaderIn === null ? "—" : `in ${fmtInt(nextLeaderIn)} slots · ~${nextLeaderMin}m`}
                </span>
                <InfoTip text="The next slot your validator is scheduled to lead. The single most-checked number for an operator with stake: it tells you when the node next has to produce blocks." />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">skip rate</span>
                <span className="tabular-nums text-ok">
                  {fmtPct(BLOCK_STATS.skipRatePct, 1)}
                </span>
                <span className="text-xs text-ink-secondary">
                  cluster {CLUSTER_SKIP_PCT}%
                </span>
                <InfoTip text="Share of your leader slots that were skipped rather than produced, against the cluster average. SFDP's bonus needs it under ~40.8%; a healthy node lands 0-5%." />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[11px] tracking-[0.08em] text-ink-tertiary">blocks</span>
                <span className="tabular-nums text-ink">{fmtInt(BLOCK_STATS.produced)}</span>
                <span className="text-xs text-ink-secondary">
                  of {fmtInt(BLOCK_STATS.leaderSlots)} leader slots
                </span>
              </span>
            </StatStrip>
          </div>

          <div className="mb-3">
            <LeaderTimeline
              groups={LEADER_GROUPS}
              epochStart={EPOCH_START}
              epochEnd={EPOCH_END}
              currentSlot={CURRENT_SLOT}
            />
          </div>

          <Suspense
            fallback={<div className="h-56 panel" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <LeaderSlots slots={RECENT_LEADER_SLOTS} />
              <div className="panel p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
                  Block production
                  <InfoTip text="This epoch's leader slots split three ways: blocks produced, slots skipped, and slots still upcoming in the schedule." />
                </p>
                <DonutChart
                  segments={blockDonut}
                  centerTop={fmtInt(BLOCK_STATS.produced) ?? ""}
                  centerBottom="produced"
                />
                <div className="mt-2 flex flex-col gap-1">
                  {blockDonut.map((seg) => (
                    <div
                      key={seg.name}
                      className="flex items-center justify-between font-mono text-[11px]"
                    >
                      <span className="flex items-center gap-1.5 text-ink-secondary">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.name}
                      </span>
                      <span className="tabular-nums text-ink-tertiary">
                        {Math.round((seg.value / BLOCK_STATS.leaderSlots) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Suspense>
        </section>

        {/* This epoch: how credits are actually accruing, epoch by epoch */}
        <section className="mt-10">
          <p className={sectionLabel}>THIS EPOCH</p>
          <Suspense
            fallback={
              <div className="mb-3 h-56 panel" />
            }
          >
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <RecentVotes
                recentVotes={s.recentVotes}
                stale={s.voteAccountStale}
              />
              <div className="panel p-4">
                <p className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
                  Epoch credits
                  <InfoTip text="This epoch's vote credits split three ways: earned so far, missed (slots elapsed but not credited), and still earnable in the slots left." />
                </p>
                {creditDonut === null ? (
                  <div className="flex h-[190px] items-center justify-center font-mono text-ink-muted">
                    —
                  </div>
                ) : (
                  <>
                    <DonutChart
                      segments={creditDonut.segments}
                      centerTop={fmtCompact(creditDonut.earned) ?? ""}
                      centerBottom="earned"
                    />
                    <div className="mt-2 flex flex-col gap-1">
                      {creditDonut.segments.map((seg) => (
                        <div
                          key={seg.name}
                          className="flex items-center justify-between font-mono text-[11px]"
                        >
                          <span className="flex items-center gap-1.5 text-ink-secondary">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: seg.color }}
                            />
                            {seg.name}
                          </span>
                          <span className="tabular-nums text-ink-tertiary">
                            {Math.round((seg.value / creditDonut.max) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Suspense>
          <VoteCredits
            stale={s.voteAccountStale}
            fetchedAgeSeconds={fetchedAge}
            creditsLifetime={s.creditsLifetime}
            commissionPct={s.commissionPct}
            activatedStakeSol={s.activatedStakeSol}
            epochCredits={s.epochCredits}
            currentEpoch={s.epoch}
            progressPct={s.epochProgressPct}
          />
        </section>

        {/* Node caught up: is it synced with the cluster and can it pay to vote */}
        <section className="mt-10">
          <p className={sectionLabel}>NODE CAUGHT UP</p>
          <NodeCaughtUpStrip
            finalityLag={s.finalityLag}
            finalityStatus={status.finalityLag(s.finalityLag)}
            processedSlot={s.processedSlot}
            finalizedSlot={s.finalizedSlot}
            identityBalanceSol={s.identityBalanceSol}
            balanceStatus={status.balance(s.identityBalanceSol)}
          />
        </section>

        {/* History: finality lag and drop rate over the last hour */}
        <section className="mt-10">
          <p className={sectionLabel}>LAST HOUR</p>
          <Suspense
            fallback={
              <div className="h-64 panel" />
            }
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="panel p-4 lg:col-span-2">
                <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <p className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                    Finality lag (slots behind, shaded band is normal)
                    <InfoTip text="Slots between the processed tip and the finalized tip, over the last hour. A steady line inside the shaded band means the node is tracking the cluster." />
                  </p>
                  <ChartHeadline
                    value={fmtInt(s.finalityLag)}
                    unit="slots"
                    status={status.finalityLag(s.finalityLag)}
                    words={{ ok: "in band", warn: "elevated", down: "high" }}
                  />
                </div>
                <TimeSeriesChart
                  times={times}
                  height={180}
                  yMin={0}
                  yMax={80}
                  band={[28, 40]}
                  series={[
                    {
                      name: "finality lag",
                      data: finalityLagChart,
                      color: CHART.accent,
                      area: true,
                    },
                  ]}
                  yFormatter={(v) => `${Math.round(v)}`}
                />
              </div>
              <div className="panel p-4">
                <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <p className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                    Drop rate (%)
                    <InfoTip text="Share of this node's leader blocks that were skipped rather than produced, over the last hour. At zero stake there are no leader slots, so it stays flat." />
                  </p>
                  <ChartHeadline
                    value={fmtPct(s.dropRatePct, 1)}
                    unit=""
                    status={status.dropRate(s.dropRatePct)}
                    words={{ ok: "nominal", warn: "elevated", down: "high" }}
                  />
                </div>
                <TimeSeriesChart
                  times={times}
                  height={180}
                  yMin={0}
                  yMax={5}
                  band={[0, 3]}
                  series={[
                    {
                      name: "drop rate",
                      data: pts.map((p) => p.dropRatePct),
                      color: CHART.ok,
                      area: true,
                    },
                  ]}
                  yFormatter={(v) => `${v.toFixed(1)}%`}
                />
              </div>
            </div>
          </Suspense>
        </section>

        {/* Machine resources + snapshot lag: the ops layer, below the validator vitals.
            One dense panel — snapshot lag as a header row, disks, then load/uptime. */}
        <section className="mt-10">
          <p className={sectionLabel}>SYSTEM</p>
          <SystemStrip
            ledgerPct={s.ledgerDisk.pct}
            accountsPct={s.accountsDisk.pct}
            memoryPct={s.memory.pct}
            incrBehind={behind(s.processedSlot, s.incrementalSnapshotSlot)}
            fullBehind={behind(s.processedSlot, s.fullSnapshotSlot)}
            loadAvg={s.loadAvg}
            cpuCores={s.cpuCores}
            uptimeSeconds={s.uptimeSeconds}
          />
        </section>

        {/* Recent warnings/errors: diagnostics, below the vitals */}
        <section className="mt-10">
          <p className={sectionLabel}>ATTENTION</p>
          <EventFeed events={s.events} now={now} />
        </section>

        {/* Trivia + advanced signals last: one dense strip, not three cards */}
        <section className="mt-10">
          <p className={sectionLabel}>NETWORK</p>
          <NetworkStrip
            blocksProduced={s.blocksProduced}
            blocksDropped={s.blocksDropped}
            forkWeightPct={s.forkWeightPct}
            forkStatus={status.forkWeight(s.forkWeightPct)}
            networkTxTotal={s.networkTxTotal}
            txHistory={pts.map((p) => p.txPerSlot)}
          />
        </section>

        <footer className="mt-16 border-t border-accent/10 pt-8">
          <Disclaimer />
        </footer>
      </main>
    </>
  );
}
