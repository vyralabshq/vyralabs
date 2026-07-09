// Minimal inline line-icons for the stat cards. Stroke = currentColor so the parent tints
// them by status. 16px, 1.6 stroke — matches the mono, understated dashboard aesthetic.
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

/** Finality lag — a clock (time-to-irreversible). */
export function IconFinality() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Vote lag — a check badge (votes landing). */
export function IconVote() {
  return (
    <svg {...base}>
      <path d="M4 12l1.6-2 2.4-.3 1.2-2.2L12 6l2.8.3L16 8.5l2.4.3L20 12l-1.6 2-2.4.3-1.2 2.2L12 18l-2.8-.3L8 15.5l-2.4-.3z" />
      <path d="M9.5 12l1.8 1.8 3.2-3.6" />
    </svg>
  );
}

/** Drop rate — a downward trend. */
export function IconDrop() {
  return (
    <svg {...base}>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 12v5h-5" />
    </svg>
  );
}

/** Fork weight — a git-branch fork. */
export function IconFork() {
  return (
    <svg {...base}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="8" r="2.2" />
      <path d="M6 8.2v7.6" />
      <path d="M8.2 6.4C14 7 15.8 8.4 16 10.2" />
    </svg>
  );
}

/** Identity balance — a stack of coins. */
export function IconBalance() {
  return (
    <svg {...base}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  );
}
