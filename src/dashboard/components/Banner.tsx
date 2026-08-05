// Amber notice banner: a bold one-line headline plus optional muted fine print, anchored by
// a small dot. Used for schema-fallback (message only) and degraded-source notices (message
// + detail). Kept compact so it informs without dominating the page.

export function Banner({
  message,
  detail,
}: {
  message: string;
  detail?: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-accent/40 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-accent)_8%,transparent),var(--color-elevated))] px-4 py-3 font-mono text-xs"
    >
      <span
        aria-hidden="true"
        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bright"
      />
      <p className="leading-relaxed">
        <span className="text-ink">{message}</span>
        {detail && <span className="text-ink-tertiary"> {detail}</span>}
      </p>
    </div>
  );
}
