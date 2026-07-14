// Dev/demo data source: serves the checked-in fixtures so the page is fully buildable
// before the collector exists. The live source (r2.dev) is wired in at slice #7.
//
// Pick a variant with ?fixture=healthy|null-heavy|vote-stale|old|alert. The live-ish
// variants are stamped with a fresh generated_at so the page reads as LIVE; "old" keeps its
// baked timestamp to demo the whole-page stale path. "alert" is synthetic — healthy data
// with its events pulled up to now so the ATTENTION feed renders its active (recent) state.

import healthy from "./fixtures/latest.healthy.json";
import nullHeavy from "./fixtures/latest.null-heavy.json";
import voteStale from "./fixtures/latest.vote-stale.json";
import old from "./fixtures/latest.old.json";
import type { RawLatest } from "./types";

const FIXTURES: Record<string, RawLatest> = {
  healthy: healthy as RawLatest,
  "null-heavy": nullHeavy as RawLatest,
  "vote-stale": voteStale as RawLatest,
  old: old as RawLatest,
};

const ALERT = "alert";

export const FIXTURE_NAMES = [...Object.keys(FIXTURES), ALERT];

export function selectedFixtureName(): string {
  const name = new URLSearchParams(window.location.search).get("fixture");
  return name && FIXTURE_NAMES.includes(name) ? name : "healthy";
}

// Shift the fixture's events so the newest lands a couple minutes ago and the rest step
// back within the hour — enough for the feed to treat them as recent activity.
function withRecentEvents(raw: RawLatest, now: Date): RawLatest {
  const events = (raw.events ?? []).map((e, i) => ({
    ...e,
    ts: new Date(now.getTime() - (2 + i * 6) * 60 * 1000).toISOString(),
  }));
  return { ...raw, generated_at: now.toISOString(), events };
}

/** Raw latest snapshot for the current fixture, timestamp-refreshed except for "old". */
export function loadFixtureLatest(now: Date): RawLatest {
  const name = selectedFixtureName();
  if (name === ALERT) return withRecentEvents(healthy as RawLatest, now);
  const raw = FIXTURES[name];
  return name === "old" ? raw : { ...raw, generated_at: now.toISOString() };
}
