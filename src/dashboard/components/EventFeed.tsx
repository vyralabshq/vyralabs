import type { EventItem } from "../types";
import { fmtAge } from "../format";

// Redacted WARN/ERROR feed. Messages arrive already scrubbed from the collector, so this
// just displays them. A summary line frames the count ("0 in the last 10m" reads as good
// news), and an empty feed is stated positively rather than left as blank space.

function ago(ts: string | null, now: Date): string {
  if (!ts) return "";
  const t = Date.parse(ts);
  return Number.isNaN(t) ? "" : fmtAge((now.getTime() - t) / 1000);
}

function countWithin(events: EventItem[], now: Date, seconds: number): number {
  const cutoff = now.getTime() - seconds * 1000;
  return events.filter((e) => {
    const t = e.ts ? Date.parse(e.ts) : NaN;
    return !Number.isNaN(t) && t >= cutoff;
  }).length;
}

export function EventFeed({ events, now }: { events: EventItem[]; now: Date }) {
  const lastHour = countWithin(events, now, 3600);
  const last10m = countWithin(events, now, 600);

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-accent/12 bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] font-bold text-ink">Recent events</h3>
        <span className="font-mono text-[11px] text-ink-muted">
          {lastHour} in last hour · {last10m} in last 10m
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
          No recent errors
        </div>
      ) : (
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
              <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                {ago(e.ts, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
