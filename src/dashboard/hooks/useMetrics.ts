// Live metrics polling (#7). Thin shell over the pure parse seam: it fetches the three
// static JSON objects from the metrics origin on their own cadences, pauses while the tab
// is hidden, and on any fetch failure keeps the last-good raw payload. It holds no display
// logic — every derivation (health, liveness, staleness) lives in parseSnapshot, which is
// re-run against the ticking `now` so a snapshot ages LIVE -> STALE -> OFFLINE on its own,
// with no new fetch, exactly matching the graceful-degradation contract.

import { useEffect, useMemo, useState } from "react";

import {
  METRICS_BASE_URL,
  POLL_LATEST_MS,
  POLL_HISTORY_1H_MS,
  POLL_HISTORY_24H_MS,
} from "../config";
import { parseSnapshot, parseHistory } from "../parse";
import type { DashboardState, HistorySeries } from "../types";

export interface Metrics {
  snapshot: DashboardState;
  history1h: HistorySeries;
  history24h: HistorySeries;
  /** true once a latest.json has been fetched at least once. */
  hasData: boolean;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useMetrics(now: Date): Metrics {
  const [latestRaw, setLatestRaw] = useState<unknown>(null);
  const [h1Raw, setH1Raw] = useState<unknown>(null);
  const [h24Raw, setH24Raw] = useState<unknown>(null);

  useEffect(() => {
    // Inert until a live origin is configured; dev/demo uses fixtures instead (#7 cutover).
    if (!METRICS_BASE_URL) return;

    const timers: ReturnType<typeof setInterval>[] = [];
    let controllers: AbortController[] = [];

    // Fetch one file; on failure keep the last-good value (never clear it) so staleness
    // derivation flags the age instead of the page blanking.
    const poll = (path: string, set: (v: unknown) => void) => {
      const c = new AbortController();
      controllers.push(c);
      fetchJson(`${METRICS_BASE_URL}/${path}`, c.signal)
        .then(set)
        .catch(() => {
          /* keep last-good; liveness ages the snapshot out */
        });
    };

    const start = () => {
      // Immediate refresh of all three; the 24h refetch-on-resume is the "tab switch" path.
      poll("latest.json", setLatestRaw);
      poll("history-1h.json", setH1Raw);
      poll("history-24h.json", setH24Raw);
      timers.push(setInterval(() => poll("latest.json", setLatestRaw), POLL_LATEST_MS));
      timers.push(setInterval(() => poll("history-1h.json", setH1Raw), POLL_HISTORY_1H_MS));
      timers.push(setInterval(() => poll("history-24h.json", setH24Raw), POLL_HISTORY_24H_MS));
    };

    const stop = () => {
      timers.forEach(clearInterval);
      timers.length = 0;
      controllers.forEach((c) => c.abort());
      controllers = [];
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Re-derive every tick so age-driven liveness stays current without refetching.
  const snapshot = useMemo(() => parseSnapshot(latestRaw, now), [latestRaw, now]);
  const history1h = useMemo(() => parseHistory(h1Raw), [h1Raw]);
  const history24h = useMemo(() => parseHistory(h24Raw), [h24Raw]);

  return { snapshot, history1h, history24h, hasData: latestRaw !== null };
}
