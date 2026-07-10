// Format an ISO date string (YYYY-MM-DD) as "06 Feb 2026". Returns the raw string
// unchanged if it does not parse, so a typo in frontmatter never blanks the page.
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
