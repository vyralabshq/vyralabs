import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chrome } from "./Chrome.tsx";
import { posts, type Post } from "./posts.ts";
import { fmtDate } from "./date.ts";

// Field Notes index: every post as a card, newest first. With no filter the newest spans the
// full row as a featured card and the rest fall into a three-up grid, which keeps the page
// deliberate at any count. A tag filter narrows the list (the whole result renders as a
// uniform grid, no featured card, so filtered views stay even). Each card is a link: number,
// date, read time, title, summary, tags. Summaries clamp so one long one can't tower.

function PostCard({ p, featured = false }: { p: Post; featured?: boolean }) {
  const fm = p.frontmatter;
  return (
    <Link
      to={`/${p.slug}`}
      className={`group flex h-full flex-col panel p-4 transition-colors hover:border-accent/40 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        featured ? "sm:col-span-2 sm:p-6 lg:col-span-3" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-ink-secondary">
          {fm.number != null && (
            <span className="text-accent">
              {String(fm.number).padStart(3, "0")}
            </span>
          )}
          <span>{fmtDate(fm.date)}</span>
          {fm.readingMinutes != null && <span>{fm.readingMinutes} min read</span>}
          {featured && fm.author && <span>written by {fm.author}</span>}
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 font-mono text-[15px] leading-none text-ink-secondary transition-colors group-hover:text-accent-bright"
        >
          ↗
        </span>
      </div>

      <h2
        className={`mt-2 font-display font-bold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent ${
          featured ? "text-[clamp(17px,1.9vw,20px)]" : "text-[15px]"
        }`}
      >
        {fm.title}
      </h2>

      {fm.summary && (
        <p
          className={`mt-1.5 font-text leading-relaxed text-ink-secondary ${
            featured ? "max-w-[70ch] text-[14px]" : "line-clamp-3 text-[12.5px]"
          }`}
        >
          {fm.summary}
        </p>
      )}

      {fm.tags && fm.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-4">
          {fm.tags.slice(0, featured ? 6 : 3).map((t) => (
            <span
              key={t}
              className="rounded-full border border-cream/20 bg-elevated px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-ink-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export function Index() {
  const [active, setActive] = useState<string | null>(null);

  // Every tag across all posts, sorted, for the filter row.
  const allTags = useMemo(
    () =>
      [...new Set(posts.flatMap((p) => p.frontmatter.tags ?? []))].sort(),
    [],
  );

  const shown = active
    ? posts.filter((p) => p.frontmatter.tags?.includes(active))
    : posts;
  // Feature the newest only in the unfiltered view; a filtered result reads better even.
  const featureFirst = active === null && shown.length > 1;
  const [newest, ...rest] = shown;

  const chip =
    "rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const chipOn = "border-accent bg-accent/15 text-accent-bright";
  const chipOff =
    "border-cream/20 text-ink-secondary hover:border-accent/40 hover:text-ink";

  return (
    <Chrome width="max-w-[1100px]">
      <section className="pt-10 pb-8">
        <p className="mb-[18px] font-mono text-xs tracking-[0.18em] text-accent">
          FIELD NOTES
        </p>
        <h1 className="max-w-[24ch] font-display text-[clamp(26px,3.6vw,36px)] font-bold leading-[1.15] tracking-[-0.03em]">
          What actually breaks, and how it got fixed.
        </h1>
        <p className="mt-5 max-w-[62ch] font-text text-[16px] leading-relaxed text-ink-secondary">
          Operational notes from running a Solana validator in the open. Real
          problems, the real logs, the root cause, and the exact fix. Written so
          another operator could learn from them.
        </p>
      </section>

      <section className="border-t border-cream/10 pt-6">
        {posts.length === 0 ? (
          <p className="py-10 font-mono text-sm text-ink-tertiary">
            No notes published yet.
          </p>
        ) : (
          <>
            {allTags.length > 1 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className={`${chip} ${active === null ? chipOn : chipOff}`}
                  aria-pressed={active === null}
                >
                  all
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActive(t)}
                    className={`${chip} ${active === t ? chipOn : chipOff}`}
                    aria-pressed={active === t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {shown.length === 0 ? (
              <p className="py-10 font-mono text-sm text-ink-tertiary">
                No notes tagged "{active}".
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featureFirst ? (
                  <>
                    <PostCard p={newest} featured />
                    {rest.map((p) => (
                      <PostCard key={p.slug} p={p} />
                    ))}
                  </>
                ) : (
                  shown.map((p) => <PostCard key={p.slug} p={p} />)
                )}
              </div>
            )}

            <p className="mt-6 font-mono text-[11px] tracking-[0.04em] text-ink-tertiary">
              {shown.length} {shown.length === 1 ? "note" : "notes"}
              {active ? ` tagged ${active}` : " · more as we break things"}
            </p>
          </>
        )}
      </section>
    </Chrome>
  );
}
