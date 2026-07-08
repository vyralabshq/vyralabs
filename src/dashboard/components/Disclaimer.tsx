// A short, honest note on what this page is.

export function Disclaimer() {
  return (
    <p className="max-w-[64ch] text-[13px] leading-[1.7] text-ink-muted">
      Testnet node. Numbers are self reported by a small collector on the box and read
      from a public snapshot that refreshes every few seconds, not a live link to the
      validator. Scoped to this one node, and not financial data.
    </p>
  );
}
