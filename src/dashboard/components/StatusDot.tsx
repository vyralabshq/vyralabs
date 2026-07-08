import type { Status } from "../health";

const CLS: Record<Status, string> = {
  ok: "bg-ok",
  warn: "bg-accent-bright",
  down: "bg-down",
};

// One dot that answers "is this number fine?" green ok, amber elevated, red critical.
export function StatusDot({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <span
      role="img"
      aria-label={
        status === "ok"
          ? "healthy"
          : status === "warn"
            ? "elevated"
            : "critical"
      }
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${CLS[status]}`}
    />
  );
}
