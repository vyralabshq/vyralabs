// Dashboard page. Parsed fixture data across the mission-control layout, ordered by what
// an operator checks first: status, events, the health numbers, resources, history, then
// trivia. Live polling (the r2.dev cutover) lands in slice #7; for now it reads the
// checked-in fixtures and re-derives every tick.

import { USE_FIXTURES, SLOT_TIME_SECONDS } from "./config";
import { loadFixtureLatest } from "./fixtureSource";
import { parseSnapshot, parseHistory } from "./parse";
import { useNow } from "./hooks/useNow";
import { AwaitingState } from "./components/AwaitingState";
import { status, statusWord } from "./health";
import { fmtInt, fmtPct, fmtSol, fmtCompact } from "./format";
import { StatusPills } from "./components/StatusPills";
import { Freshness } from "./components/Freshness";
import { PubkeyChip } from "./components/PubkeyChip";
import { Banner } from "./components/Banner";
import { Disclaimer } from "./components/Disclaimer";
import { StatPanel } from "./components/StatPanel";
import { EpochCard } from "./components/EpochCard";
import { SystemStrip } from "./components/SystemStrip";
import { VoteCredits } from "./components/VoteCredits";
import { EventFeed } from "./components/EventFeed";
import { TimeSeriesChart } from "./charts/TimeSeriesChart";
import { CHART } from "./charts/echarts";
import history1h from "./fixtures/history-1h.json";

const container = "relative z-10 mx-auto max-w-[1100px] px-6";
const sectionLabel = "mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-muted";

function last<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n));
}

function behind(tip: number | null, snap: number | null): number | null {
  return tip === null || snap === null ? null : tip - snap;
}

export default function Dashboard() {
  const now = useNow();

  // Production has no live source yet, so it never renders fabricated data. Fixtures are
  // dev/demo only; live polling and the r2.dev cutover arrive in slice #7.
  if (!USE_FIXTURES) return <AwaitingState />;

  const s = parseSnapshot(loadFixtureLatest(now), now);
  const history = parseHistory(history1h);

  const pts = history.points;
  const spark = last(pts, 48);
  const times = pts.map((p) => p.t);
  const finalityLagSeries = pts.map((p) =>
    p.processed !== null && p.finalized !== null ? p.processed - p.finalized : null,
  );

  const fetchedAge =
    s.voteAccountFetchedAt === null
      ? null
      : (now.getTime() - s.voteAccountFetchedAt.getTime()) / 1000;

  const epochEta =
    s.slotsInEpoch !== null && s.slotIndex !== null
      ? (s.slotsInEpoch - s.slotIndex) * SLOT_TIME_SECONDS
      : null;

  const dropStatus = status.dropRate(s.dropRatePct);

  return (
    <>
      <div className="grid-bg" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <div className="sticky top-0 z-20 border-b border-accent/20 bg-elevated/85 px-6 py-1.5 text-center font-mono text-[11px] tracking-[0.14em] text-accent backdrop-blur">
        sample data (local dev), not the live validator
      </div>

      <header className={`${container} flex h-18 items-center justify-between`}>
        <a
          className="inline-flex items-center gap-1.5 rounded font-display text-[22px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          href="/"
          aria-label="Vyra home"
        >
          <img className="-ml-1.5 h-10 w-10 object-contain mix-blend-screen" src="/logo.png" alt="" />
          <span>
            v<span className="text-accent">y</span>ra
          </span>
        </a>
        <span className="rounded-full border border-accent/20 bg-surface px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-ink-secondary">
          {s.cluster ?? "testnet"}
        </span>
      </header>

      <main className={`${container} pt-6 pb-24`}>
        <div className="mb-8 flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.18em] text-accent">status</p>
          <h1 className="font-display text-[clamp(30px,4vw,42px)] font-bold tracking-[-0.02em]">
            How the node is doing
          </h1>
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-secondary">
            Live health of the Vyra validator on testnet, read straight from the box.
          </p>
        </div>

        {s.banner && (
          <div className="mb-6">
            <Banner message={s.banner} />
          </div>
        )}

        {/* Status row */}
        <div className="flex flex-col gap-5">
          <StatusPills
            nodeHealthy={s.nodeHealthy}
            processActive={s.processActive}
            jitoActive={s.jitoActive}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2.5">
              <PubkeyChip label="identity" value={s.identityPubkey} />
              <PubkeyChip label="vote" value={s.votePubkey} />
            </div>
            <Freshness ageSeconds={s.ageSeconds} stale={s.stale} />
          </div>
        </div>

        {/* Events first: the most actionable surface */}
        <section className="mt-10">
          <p className={sectionLabel}>ATTENTION</p>
          <EventFeed events={s.events} now={now} />
        </section>

        {/* Health numbers that actually carry a judgement */}
        <section className="mt-10">
          <p className={sectionLabel}>HEALTH</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <StatPanel
              label="FINALITY LAG"
              value={fmtInt(s.finalityLag)}
              unit="slots"
              status={status.finalityLag(s.finalityLag)}
              sub="normal around 32"
            />
            <StatPanel
              label="VOTE LAG"
              value={fmtInt(s.voteLag)}
              unit="slots"
              status={status.voteLag(s.voteLag)}
              spark={spark.map((p) => p.voteLag)}
            />
            <StatPanel
              label="DROP RATE"
              value={fmtPct(s.dropRatePct, 2)}
              status={dropStatus}
              sub={statusWord(dropStatus) ? `${statusWord(dropStatus)}, since restart` : "since restart"}
            />
            <StatPanel
              label="FORK WEIGHT"
              value={fmtPct(s.forkWeightPct, 1)}
              status={status.forkWeight(s.forkWeightPct)}
              sub="majority fork"
            />
            <StatPanel
              label="IDENTITY BALANCE"
              value={fmtSol(s.identityBalanceSol, 2)}
              status={status.balance(s.identityBalanceSol)}
              sub="pays vote fees"
            />
          </div>
        </section>

        {/* Machine resources: compact, percent only, disk-led */}
        <section className="mt-10">
          <p className={sectionLabel}>SYSTEM</p>
          <SystemStrip
            ledgerPct={s.ledgerDisk.pct}
            accountsPct={s.accountsDisk.pct}
            memoryPct={s.memory.pct}
            loadAvg={s.loadAvg}
            cpuCores={s.cpuCores}
            uptimeSeconds={s.uptimeSeconds}
          />
        </section>

        {/* Epoch + chain position */}
        <section className="mt-10">
          <p className={sectionLabel}>EPOCH &amp; CHAIN</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <EpochCard epoch={s.epoch} progressPct={s.epochProgressPct} etaSeconds={epochEta} />
            <StatPanel label="PROCESSED SLOT" value={fmtInt(s.processedSlot)} sub={<>finalized {fmtInt(s.finalizedSlot) ?? "?"}</>} />
            <StatPanel
              label="INCR SNAPSHOT"
              value={fmtInt(behind(s.processedSlot, s.incrementalSnapshotSlot))}
              unit="slots behind"
            />
            <StatPanel
              label="FULL SNAPSHOT"
              value={fmtInt(behind(s.processedSlot, s.fullSnapshotSlot))}
              unit="slots behind"
            />
          </div>
        </section>

        {/* History */}
        <section className="mt-10">
          <p className={sectionLabel}>LAST HOUR</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-accent/12 bg-surface/60 p-4 lg:col-span-3">
              <p className="mb-1 text-[13px] text-ink-secondary">
                Finality lag (slots behind, shaded band is normal)
              </p>
              <TimeSeriesChart
                times={times}
                height={180}
                yMin={0}
                yMax={80}
                band={[28, 40]}
                series={[{ name: "finality lag", data: finalityLagSeries, color: CHART.accent, area: true }]}
                yFormatter={(v) => `${Math.round(v)}`}
              />
            </div>
            <div className="rounded-xl border border-accent/12 bg-surface/60 p-4 lg:col-span-2">
              <p className="mb-1 text-[13px] text-ink-secondary">Vote lag (slots)</p>
              <TimeSeriesChart
                times={times}
                height={160}
                yMin={0}
                yMax={80}
                band={[28, 34]}
                series={[{ name: "vote lag", data: pts.map((p) => p.voteLag), color: CHART.accent, area: true }]}
                yFormatter={(v) => `${Math.round(v)}`}
              />
            </div>
            <div className="rounded-xl border border-accent/12 bg-surface/60 p-4">
              <p className="mb-1 text-[13px] text-ink-secondary">Drop rate (%)</p>
              <TimeSeriesChart
                times={times}
                height={160}
                yMin={0}
                yMax={5}
                band={[0, 3]}
                series={[{ name: "drop rate", data: pts.map((p) => p.dropRatePct), color: CHART.ok, area: true }]}
                yFormatter={(v) => `${v.toFixed(1)}%`}
              />
            </div>
          </div>
        </section>

        {/* Voting performance */}
        <section className="mt-10">
          <p className={sectionLabel}>VOTING</p>
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

        {/* Trivia last */}
        <section className="mt-10">
          <p className={sectionLabel}>NETWORK</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatPanel label="NETWORK TX TOTAL" value={fmtCompact(s.networkTxTotal)} />
            <StatPanel label="BLOCK HEIGHT" value={fmtInt(s.blockHeight)} />
            <StatPanel label="CLIENT" value={s.version} sub={s.jitoActive ? "jito" : undefined} />
          </div>
        </section>

        <footer className="mt-16 border-t border-accent/10 pt-8">
          <Disclaimer />
        </footer>
      </main>
    </>
  );
}
