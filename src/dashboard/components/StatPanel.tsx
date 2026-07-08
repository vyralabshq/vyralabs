import type { ReactNode } from "react";
import type { Status } from "../health";
import { Missing } from "./Missing";
import { Sparkline } from "./Sparkline";
import { StatusDot } from "./StatusDot";

// A headline number with a label, optional health dot, sub-line and trend sparkline.
// A null value renders the shared placeholder, never NaN/undefined.

export function StatPanel({
  label,
  value,
  unit,
  sub,
  status,
  spark,
  sparkClass,
  dim = false,
}: {
  label: string;
  value: string | null;
  unit?: string;
  sub?: ReactNode;
  status?: Status | null;
  spark?: (number | null)[];
  sparkClass?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-accent/12 bg-surface/60 p-4 transition-opacity ${dim ? "opacity-45" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] text-ink-muted">
          {status !== undefined && <StatusDot status={status} />}
          {label}
        </span>
        {spark && <Sparkline data={spark} strokeClass={sparkClass ?? "text-accent"} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        {value === null ? (
          <Missing className="mb-1.5" />
        ) : (
          <span className="font-display text-[26px] font-bold leading-none tracking-[-0.01em] text-ink tabular-nums">
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
