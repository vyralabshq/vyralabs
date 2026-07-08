// Safe-fallback banner: shown when parseSnapshot could not use the data (schema
// mismatch or malformed input). The page still renders; this explains why it is bare.

export function Banner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-accent/40 bg-[linear-gradient(180deg,rgba(247,127,27,0.08),#1c1209)] px-4 py-3 font-mono text-xs text-ink-secondary"
    >
      {message}
    </div>
  );
}
