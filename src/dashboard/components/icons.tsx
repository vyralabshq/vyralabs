// Minimal inline line-icon for the stat cards. Stroke = currentColor so the parent tints
// it by status. 16px, 1.6 stroke — matches the mono, understated dashboard aesthetic.
// Self-contained SVG (no icon dependency, no network).

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Vote lag — a check badge (votes landing). */
export function IconVote() {
  return (
    <svg {...base}>
      <path d="M4 12l1.6-2 2.4-.3 1.2-2.2L12 6l2.8.3L16 8.5l2.4.3L20 12l-1.6 2-2.4.3-1.2 2.2L12 18l-2.8-.3L8 15.5l-2.4-.3z" />
      <path d="M9.5 12l1.8 1.8 3.2-3.6" />
    </svg>
  );
}
