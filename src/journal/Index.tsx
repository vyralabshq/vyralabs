import { Link } from "react-router-dom";
import { Chrome } from "./Chrome.tsx";
import { posts, type Post } from "./posts.ts";
import { fmtDate } from "./date.ts";

// Field Notes index: every post as a card, newest first. The newest spans the full row as
// a featured card and the rest fall into a three-up grid — which keeps the page looking
// deliberate at any count, including the one-post case where a bare grid would strand a
// lone card in a third of a row. Each card is a link: number, date, read time, title,
// summary, tags. Summaries clamp so a long one can't make its card tower over its row.

function PostCard({ p, featured = false }: { p: Post; featured?: boolean }) {
  const fm = p.frontmatter;
  return (
    <Link
      to={`/${p.slug}`}
      className={`group flex flex-col rounded-xl border border-accent/12 bg-surface/50 p-4 transition-colors hover:border-accent/30 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        featured ? "sm:col-span-2 sm:p-6 lg:col-span-3" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-ink-muted">
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
          className="shrink-0 font-mono text-[12px] leading-none text-ink-muted transition-colors group-hover:text-accent"
        >
          ↗
        </span>
      </div>

      <h2
        className={`mt-2 font-display font-bold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent ${
          featured ? "text-[clamp(19px,2.2vw,23px)]" : "text-[15px]"
        }`}
      >
        {fm.title}
      </h2>

      {fm.summary && (
        <p
          className={`mt-1.5 leading-relaxed text-ink-secondary ${
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
              className="rounded-full border border-accent/15 bg-elevated px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-ink-muted"
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
  const [newest, ...rest] = posts;

  return (
    <Chrome width="max-w-[1100px]">
      <section className="pt-10 pb-8">
        <p className="mb-[18px] font-mono text-xs tracking-[0.18em] text-accent">
          FIELD NOTES
        </p>
        <h1 className="max-w-[18ch] font-display text-[clamp(32px,5vw,46px)] font-bold leading-[1.08] tracking-[-0.03em]">
          What actually breaks, and how it got fixed.
        </h1>
        <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-ink-secondary">
          Operational notes from running a Solana validator in the open. Real
          problems, the real logs, the root cause, and the exact fix. Written so
          another operator could learn from them.
        </p>
      </section>

      <section className="border-t border-accent/10 pt-8">
        {posts.length === 0 ? (
          <p className="py-10 font-mono text-sm text-ink-muted">
            No notes published yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PostCard p={newest} featured />
            {rest.map((p) => (
              <PostCard key={p.slug} p={p} />
            ))}
          </div>
        )}
      </section>
    </Chrome>
  );
}
