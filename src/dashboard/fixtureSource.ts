// Dev/demo data source: serves the checked-in fixtures so the page is fully buildable
// before the collector exists. The live source (r2.dev) is wired in at slice #7.
//
// Pick a variant with ?fixture=healthy|null-heavy|vote-stale|old. The live-ish variants
// are stamped with a fresh generated_at so the page reads as LIVE; "old" keeps its baked
// timestamp to demo the whole-page stale path.

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

export const FIXTURE_NAMES = Object.keys(FIXTURES);

export function selectedFixtureName(): string {
  const name = new URLSearchParams(window.location.search).get("fixture");
  return name && name in FIXTURES ? name : "healthy";
}

/** Raw latest snapshot for the current fixture, timestamp-refreshed except for "old". */
export function loadFixtureLatest(now: Date): RawLatest {
  const name = selectedFixtureName();
  const raw = FIXTURES[name];
  return name === "old" ? raw : { ...raw, generated_at: now.toISOString() };
}
