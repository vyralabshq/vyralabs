// A small "?" beside a metric heading that reveals a plain-language explanation on hover
// or keyboard focus. Pure CSS (named group), no JS state. The bubble is pointer-events
// none so it never blocks clicks, and sits above the marker.

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-ink-muted/50 font-mono text-[9px] leading-none text-ink-muted transition-colors hover:border-accent hover:text-accent focus:border-accent focus:text-accent focus:outline-none"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 rounded-lg border border-accent/20 bg-elevated px-3 py-2 text-left font-sans text-[12px] leading-snug tracking-normal text-ink-secondary normal-case opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
