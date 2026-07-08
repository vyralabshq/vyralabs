// Placeholder for a value whose source failed this cycle. A short muted bar (not a
// typographic dash) so partial data still looks intentional.

export function Missing({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="no data"
      className={`inline-block h-[2px] w-4 rounded-full bg-ink-muted/50 align-middle ${className}`}
    />
  );
}
