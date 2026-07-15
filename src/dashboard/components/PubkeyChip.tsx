import { useState } from "react";

// Shows a public pubkey (identity or vote) truncated, click to copy the full value.
// Both keys are public on chain, so copying the whole thing is safe.

function shorten(pubkey: string): string {
  return pubkey.length > 12 ? `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}` : pubkey;
}

function CopyGlyph({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 5.5V4A1.5 1.5 0 009 2.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function PubkeyChip({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked (insecure context / permissions); leave the value on screen.
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={value === null}
      aria-label={value ? `Copy ${label} key ${value}` : `${label} key unavailable`}
      title={value ?? undefined}
      className="group inline-flex items-center gap-2 rounded-md border border-accent/15 bg-surface px-2.5 py-1.5 font-mono text-xs text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span className="text-ink-tertiary">{label}</span>
      <span>{value ? shorten(value) : "not available"}</span>
      <span
        className={`transition-colors ${copied ? "text-ok" : "text-ink-tertiary group-hover:text-accent"}`}
      >
        <CopyGlyph copied={copied} />
      </span>
    </button>
  );
}
