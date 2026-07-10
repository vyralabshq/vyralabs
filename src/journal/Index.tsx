import { Link } from "react-router-dom";
import { Chrome } from "./Chrome.tsx";
import { posts } from "./posts.ts";
import { fmtDate } from "./date.ts";

// Field Notes index: every post, newest first, showing number, title, date, tags and the
// one-line summary. The whole row is a link into the post.

export function Index() {
  return (
    <Chrome>
      <section className="pt-10 pb-6">
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

      <section className="mt-4 border-t border-accent/10">
        {posts.length === 0 ? (
          <p className="py-10 font-mono text-sm text-ink-muted">
            No notes published yet.
          </p>
        ) : (
          <ul>
            {posts.map((p) => (
              <li key={p.slug} className="border-b border-accent/10">
                <Link
                  to={`/${p.slug}`}
                  className="group block py-7 focus-visible:outline-none"
                >
                  <div className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.08em] text-ink-muted">
                    {p.frontmatter.number != null && (
                      <span className="text-accent">
                        {String(p.frontmatter.number).padStart(3, "0")}
                      </span>
                    )}
                    <span>{fmtDate(p.frontmatter.date)}</span>
                    <span>{p.readingMinutes} min read</span>
                    {p.frontmatter.author && (
                      <span>written by {p.frontmatter.author}</span>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-[23px] font-bold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
                    {p.frontmatter.title}
                  </h2>
                  {p.frontmatter.summary && (
                    <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-secondary">
                      {p.frontmatter.summary}
                    </p>
                  )}
                  {p.frontmatter.tags && p.frontmatter.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] text-ink-muted">
                      {p.frontmatter.tags.map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Chrome>
  );
}
