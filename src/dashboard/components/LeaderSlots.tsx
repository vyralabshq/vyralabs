import { InfoTip } from "./InfoTip";

// Recent leader slots as a square-per-slot strip: green produced, red skipped. The
// block-side counterpart to Recent votes — same panel, same read (a wall of green is
// healthy, a red square is a missed block). Newest on the right.

export function LeaderSlots({
  slots,
}: {
  slots: { slot: number; produced: boolean }[];
}) {
  const produced = slots.filter((s) => s.produced).length;
  const skipped = slots.length - produced;

  return (
    <div className="flex h-full flex-col panel p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
        Recent leader slots
        <InfoTip text="The last ~40 leader slots, one square each. Green produced a block, red skipped it. A skipped slot is a missed block: the cluster moved on without you." />
      </p>
      <div className="font-mono text-[11px] text-ink-tertiary">
        <span className="tabular-nums text-ink-secondary">{produced}</span> produced
        {skipped > 0 && (
          <>
            {" · "}
            <span className="tabular-nums text-down">{skipped} skipped</span>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-wrap content-end gap-1.5">
        {slots.map((s) => (
          <span
            key={s.slot}
            title={`slot ${s.slot.toLocaleString("en-US")} · ${s.produced ? "produced" : "skipped"}`}
            className={`h-3.5 w-3.5 rounded-[3px] ${s.produced ? "bg-ok" : "bg-down"}`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-ink-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-ok" /> produced
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-down" /> skipped
        </span>
      </div>
    </div>
  );
}
