// Display formatting. Every formatter takes a nullable value and returns null when the
// value is missing, so components can render the shared placeholder instead of a dash.

export function fmtInt(n: number | null): string | null {
  return n === null ? null : Math.round(n).toLocaleString("en-US");
}

export function fmtDec(n: number | null, digits = 2): string | null {
  return n === null
    ? null
    : n.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}

export function fmtPct(n: number | null, digits = 1): string | null {
  return n === null ? null : `${fmtDec(n, digits)}%`;
}

export function fmtSol(n: number | null, digits = 4): string | null {
  return n === null ? null : `◎${fmtDec(n, digits)}`;
}

/** Compact whole numbers for big counters: 389421772913 -> "389.4B". */
export function fmtCompact(n: number | null): string | null {
  if (n === null) return null;
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

/** Relative age for a "... ago" readout. */
export function fmtAge(seconds: number | null): string {
  if (seconds === null) return "no timestamp";
  if (seconds < 0) return "just now";
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

/** Seconds -> "9d 8h" / "8h 12m" / "12m". */
export function fmtDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
