// Safe-fallback banner: shown when parseSnapshot could not use the data (schema
// mismatch or malformed input). The page still renders; this explains why it is bare.

export function Banner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-accent/40 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-accent)_8%,transparent),var(--color-elevated))] px-4 py-3 font-mono text-xs text-ink-secondary"
    >
      {message}
    </div>
  );
}
