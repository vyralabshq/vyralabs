import type { ReactNode } from "react";
import type { Status } from "../health";
import { Missing } from "./Missing";
import { Sparkline } from "./Sparkline";
import { StatusDot } from "./StatusDot";

// A headline number with a label, optional status-tinted icon, trend delta, sub-line and
// sparkline. A null value renders the shared placeholder, never NaN/undefined.

/** A small trend chip: an arrow + text, green when the move is in the good direction. */
export interface Delta {
  arrow: "up" | "down";
  text: string;
  good: boolean;
}

const iconTone: Record<Status, string> = {
  ok: "text-ok",
  warn: "text-accent-bright",
  down: "text-down",
};

export function StatPanel({
  label,
  value,
  unit,
  sub,
  status,
  icon,
  delta,
  spark,
  sparkClass,
  dim = false,
}: {
  label: string;
  value: string | null;
  unit?: string;
  sub?: ReactNode;
  status?: Status | null;
  icon?: ReactNode;
  delta?: Delta;
  spark?: (number | null)[];
  sparkClass?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-accent/12 bg-surface/60 p-4 transition-opacity ${dim ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-ink-muted">
          {icon ? (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated ${status ? iconTone[status] : "text-accent"}`}
            >
              {icon}
            </span>
          ) : (
            status !== undefined && <StatusDot status={status} />
          )}
          {label}
        </span>
        {delta ? (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-elevated px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${delta.good ? "text-ok" : "text-down"}`}
          >
            <span aria-hidden="true">{delta.arrow === "up" ? "↑" : "↓"}</span>
            {delta.text}
          </span>
        ) : (
          spark && <Sparkline data={spark} strokeClass={sparkClass ?? "text-accent"} />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        {value === null ? (
          <Missing className="mb-1.5" />
        ) : (
          <span className="font-display text-[20px] font-bold leading-none tracking-[-0.01em] text-ink tabular-nums sm:text-[26px]">
            {value}
          </span>
        )}
        {unit && value !== null && (
          <span className="font-mono text-xs text-ink-secondary">{unit}</span>
        )}
      </div>
      {sub && <div className="mt-1.5 text-xs text-ink-secondary">{sub}</div>}
    </div>
  );
}
