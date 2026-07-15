import type { EventItem } from "../types";
import { fmtAge } from "../format";

// Redacted WARN/ERROR feed. Messages arrive already scrubbed from the collector, so this
// just displays them. Adaptive by design: a healthy node has nothing here 99% of the time,
// so when nothing has happened in the last hour it collapses to a quiet one-line all-clear
// strip instead of a big empty card. Only when there is recent activity does it expand to
// the full card — and it tints its border red if any recent event is an ERROR, so trouble
// asserts itself rather than hiding at the bottom of the page.

function ago(ts: string | null, now: Date): string {
  if (!ts) return "";
  const t = Date.parse(ts);
  return Number.isNaN(t) ? "" : fmtAge((now.getTime() - t) / 1000);
}

function tsMs(ts: string | null): number | null {
  const t = ts ? Date.parse(ts) : NaN;
  return Number.isNaN(t) ? null : t;
}

function countWithin(events: EventItem[], now: Date, seconds: number): number {
  const cutoff = now.getTime() - seconds * 1000;
  return events.filter((e) => {
    const t = tsMs(e.ts);
    return t !== null && t >= cutoff;
  }).length;
}

export function EventFeed({ events, now }: { events: EventItem[]; now: Date }) {
  const lastHour = countWithin(events, now, 3600);
  const last10m = countWithin(events, now, 600);
  const cutoff = now.getTime() - 3600 * 1000;
  const hasRecentError = events.some((e) => {
    const t = tsMs(e.ts);
    return t !== null && t >= cutoff && e.level === "ERROR";
  });

  // Calm: nothing in the last hour. Collapse to a thin all-clear strip; if older events
  // exist, note how long ago the last one was so the quiet is informative, not blank.
  if (lastHour === 0) {
    const newestTs = events.reduce<number | null>((max, e) => {
      const t = tsMs(e.ts);
      return t !== null && (max === null || t > max) ? t : max;
    }, null);
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-accent/10 bg-surface/40 px-4 py-2.5 font-mono text-[12px]">
        <span className="flex items-center gap-2 text-ink-secondary">
          <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
          no events in the last hour
        </span>
        {newestTs !== null && (
          <span className="text-ink-tertiary">
            last {ago(new Date(newestTs).toISOString(), now)}
          </span>
        )}
      </div>
    );
  }

  // Active: recent events. Full card; border reddens if any recent event is an ERROR.
  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-xl border bg-surface/60 p-5 ${
        hasRecentError ? "border-down/50" : "border-accent-bright/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-bold text-ink">Recent events</h3>
        <span className="font-mono text-[11px] text-ink-tertiary">
          {lastHour} in last hour · {last10m} in last 10m
        </span>
      </div>

      <ul className="flex max-h-44 flex-col gap-2.5 overflow-y-auto pr-1">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px]">
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] ${
                e.level === "ERROR"
                  ? "bg-down/15 text-down"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {e.level ?? "LOG"}
            </span>
            <span className="min-w-0 flex-1 break-words text-ink-secondary">
              {e.msg}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-ink-tertiary">
              {ago(e.ts, now)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
