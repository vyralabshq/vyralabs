// A small "?" beside a metric heading that reveals a plain-language explanation on hover
// or keyboard focus. Pure CSS (named group), no JS state. The bubble is pointer-events
// none so it never blocks clicks, and sits above the marker.
//
// The bubble is display:none until hovered/focused, not merely transparent. It is centered
// on the marker, so half of it always jugs sideways; left laid out while invisible, the
// page's ~14 tips pushed the document 36px wider than a 430px phone and left a dead gap
// down the right of the dashboard. Hiding them outright costs the fade but keeps the page
// exactly viewport-width. Width is also capped so an opened bubble can't exceed the screen.

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
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-[13rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-accent/20 bg-elevated px-3 py-2 text-left font-sans text-[12px] leading-snug tracking-normal text-ink-secondary normal-case shadow-xl group-hover/tip:block group-focus-within/tip:block sm:w-56"
      >
        {text}
      </span>
    </span>
  );
}
