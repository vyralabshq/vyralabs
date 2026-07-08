import { describe, it, expect } from "vitest";
import { parseSnapshot, parseHistory } from "./parse";
import healthy from "./fixtures/latest.healthy.json";
import nullHeavy from "./fixtures/latest.null-heavy.json";
import old from "./fixtures/latest.old.json";
import voteStale from "./fixtures/latest.vote-stale.json";
import history1h from "./fixtures/history-1h.json";

// The fixtures are stamped 2026-07-08T10:00:00Z (except "old" at 09:00:00Z).
const NOW_FRESH = new Date("2026-07-08T10:00:05Z"); // 5s after the healthy snapshot

describe("parseSnapshot", () => {
  it("parses the healthy fixture: pills up, fresh, pubkeys present", () => {
    const s = parseSnapshot(healthy, NOW_FRESH);
    expect(s.ok).toBe(true);
    expect(s.schemaMismatch).toBe(false);
    expect(s.banner).toBeNull();
    expect(s.nodeHealthy).toBe(true);
    expect(s.processActive).toBe(true);
    expect(s.jitoActive).toBe(true);
    expect(s.stale).toBe(false);
    expect(s.ageSeconds).toBeCloseTo(5, 5);
    expect(s.cluster).toBe("testnet");
    expect(s.identityPubkey).toBe(
      "vyRa8J7ULHfUAdnkTHP3YGhcLWaLURXLmD7CiZkMzWg",
    );
    expect(s.votePubkey).toBe("9LjQ5UC1gyebUySAbodzHJdLSkYAYgVeQcr2vv6FZP6E");
    expect(s.errors).toEqual([]);
  });

  it("flags a wrong schema_version as a safe fallback, not a throw", () => {
    const s = parseSnapshot({ ...healthy, schema_version: 2 }, NOW_FRESH);
    expect(s.ok).toBe(false);
    expect(s.schemaMismatch).toBe(true);
    expect(s.banner).toMatch(/schema/i);
    expect(s.stale).toBe(true);
    // no pubkeys leak through the fallback
    expect(s.identityPubkey).toBeNull();
  });

  it("derives whole-page staleness from an old timestamp", () => {
    // old fixture generated at 09:00:00Z, now 10:00:05Z => ~3605s old
    const s = parseSnapshot(old, NOW_FRESH);
    expect(s.ok).toBe(true);
    expect(s.stale).toBe(true);
    expect(s.ageSeconds).toBeGreaterThan(3600);
  });

  it("keeps missing sources as null pills without crashing (null-heavy)", () => {
    const s = parseSnapshot(nullHeavy, NOW_FRESH);
    expect(s.ok).toBe(true);
    expect(s.nodeHealthy).toBeNull(); // health: null
    expect(s.processActive).toBeNull(); // system.process_active: null
    expect(s.jitoActive).toBeNull(); // version: null
    expect(s.errors.length).toBeGreaterThan(0);
  });

  it("still parses when only the vote-account source is stale", () => {
    const s = parseSnapshot(voteStale, NOW_FRESH);
    expect(s.ok).toBe(true);
    expect(s.nodeHealthy).toBe(true); // node itself healthy
    expect(s.stale).toBe(false); // whole page still fresh
  });

  it.each([null, undefined, 42, "garbage", [], true])(
    "returns a defined fallback for malformed input %p (never throws)",
    (bad) => {
      const s = parseSnapshot(bad, NOW_FRESH);
      expect(s.ok).toBe(false);
      expect(s.banner).not.toBeNull();
      expect(s.stale).toBe(true);
    },
  );

  it("treats the staleness boundary correctly (30s bound)", () => {
    const gen = "2026-07-08T10:00:00Z";
    const under = parseSnapshot(
      { ...healthy, generated_at: gen },
      new Date("2026-07-08T10:00:29Z"),
    );
    const over = parseSnapshot(
      { ...healthy, generated_at: gen },
      new Date("2026-07-08T10:00:31Z"),
    );
    expect(under.stale).toBe(false);
    expect(over.stale).toBe(true);
  });

  it("treats a missing timestamp as stale", () => {
    const s = parseSnapshot({ ...healthy, generated_at: null }, NOW_FRESH);
    expect(s.ageSeconds).toBeNull();
    expect(s.stale).toBe(true);
  });
});

describe("parseSnapshot derivations", () => {
  it("derives the numeric fields from the healthy fixture", () => {
    const s = parseSnapshot(healthy, NOW_FRESH);
    expect(s.finalityLag).toBe(420559551 - 420559519); // 32
    expect(s.voteLag).toBe(420559550 - 420559519); // 31
    expect(s.dropRatePct).toBeCloseTo((7461 / (365517 + 7461)) * 100, 4);
    expect(s.forkWeightPct).toBeCloseTo(95.1168, 3);
    expect(s.epochProgressPct).toBeCloseTo((180351 / 432000) * 100, 4);
    expect(s.cpuCores).toBe(32);
    expect(s.creditsLifetime).toBe(1898792);
    expect(s.commissionPct).toBe(100);
    expect(s.epochCredits).toHaveLength(2);
    expect(s.events).toHaveLength(2);
    expect(s.loadAvg).toEqual([4.21, 3.98, 3.75]);
  });

  it("leaves every derivation null when its inputs are missing (null-heavy)", () => {
    const s = parseSnapshot(nullHeavy, NOW_FRESH);
    expect(s.finalityLag).toBeNull();
    expect(s.voteLag).toBeNull();
    expect(s.dropRatePct).toBeNull();
    expect(s.forkWeightPct).toBeNull();
    expect(s.epochProgressPct).toBeNull();
    expect(s.cpuCores).toBeNull();
    expect(s.loadAvg).toBeNull();
    expect(s.epochCredits).toEqual([]);
    expect(s.events).toEqual([]);
  });

  it("flags the vote-account source as stale without dimming the rest", () => {
    const s = parseSnapshot(voteStale, NOW_FRESH);
    expect(s.voteAccountStale).toBe(true);
    expect(s.creditsLifetime).toBe(1898792); // last-good value carried forward
    expect(s.nodeHealthy).toBe(true);
  });
});

describe("parseHistory", () => {
  it("normalizes the 1h window fixture", () => {
    const h = parseHistory(history1h);
    expect(h.ok).toBe(true);
    expect(h.window).toBe("1h");
    expect(h.resolutionSeconds).toBe(10);
    expect(h.points).toHaveLength(360);
    const p = h.points[0];
    expect(typeof p.processed).toBe("number");
    expect(p.t).toBeInstanceOf(Date);
  });

  it("tolerates missing point fields without crashing", () => {
    const h = parseHistory({
      schema_version: 1,
      window: "1h",
      resolution_seconds: 10,
      points: [{ t: "2026-07-08T10:00:00Z", processed: 1 }, {}, null],
    });
    expect(h.ok).toBe(true);
    expect(h.points).toHaveLength(3);
    expect(h.points[1].processed).toBeNull();
    expect(h.points[2].t).toBeNull();
  });

  it.each([null, 42, "x", { schema_version: 2 }])(
    "returns an empty series for unusable input %p",
    (bad) => {
      const h = parseHistory(bad);
      expect(h.ok).toBe(false);
      expect(h.points).toEqual([]);
    },
  );
});

describe("parseSnapshot liveness (#7)", () => {
  // healthy fixture is stamped 2026-07-08T10:00:00Z.
  const base = new Date("2026-07-08T10:00:00Z").getTime();
  const at = (secs: number) => new Date(base + secs * 1000);

  it("is LIVE within 30s", () => {
    expect(parseSnapshot(healthy, at(5)).liveness).toBe("LIVE");
    expect(parseSnapshot(healthy, at(30)).liveness).toBe("LIVE"); // boundary inclusive
  });

  it("is STALE between 30s and 90s", () => {
    expect(parseSnapshot(healthy, at(45)).liveness).toBe("STALE");
    expect(parseSnapshot(healthy, at(90)).liveness).toBe("STALE"); // boundary inclusive
  });

  it("is OFFLINE past 90s", () => {
    expect(parseSnapshot(healthy, at(120)).liveness).toBe("OFFLINE");
  });

  it("is OFFLINE when the timestamp is missing or the input is unusable", () => {
    expect(parseSnapshot({ schema_version: 1 }, at(5)).liveness).toBe("OFFLINE");
    expect(parseSnapshot("garbage", at(5)).liveness).toBe("OFFLINE");
    expect(parseSnapshot({ schema_version: 999 }, at(5)).liveness).toBe("OFFLINE");
  });
});
