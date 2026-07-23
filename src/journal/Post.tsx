import { useParams, Link } from "react-router-dom";
import { Chrome } from "./Chrome.tsx";
import { postBySlug } from "./posts.ts";
import { fmtDate } from "./date.ts";

// A single Field Note. The MDX body renders inside `.fieldnote`, which carries all the
// long-form prose styling (headings, code blocks, lists) so posts stay plain Markdown.

export function PostPage() {
  const { slug } = useParams();
  const post = slug ? postBySlug(slug) : undefined;

  if (!post) {
    return (
      <Chrome width="max-w-[720px]">
        <div className="py-20">
          <p className="font-mono text-sm text-ink-tertiary">Note not found.</p>
          <Link
            to="/"
            className="mt-4 inline-block font-mono text-sm text-accent hover:text-accent-bright"
          >
            ← all field notes
          </Link>
        </div>
      </Chrome>
    );
  }

  const { frontmatter: fm, Component } = post;


  return (
    <Chrome width="max-w-[800px]">
      <article className="pt-8 pb-4">
        <Link
          to="/"
          className="inline-block font-mono text-[13px] text-ink-tertiary transition-colors hover:text-accent"
        >
          ← field notes
        </Link>

        <header className="mt-8 border-b border-accent/10 pb-8">
          <div className="flex flex-wrap items-baseline gap-3 font-mono text-[11px] tracking-[0.08em] text-ink-tertiary">
            {fm.number != null && (
              <span className="text-accent">
                {String(fm.number).padStart(3, "0")}
              </span>
            )}
            <span>{fmtDate(fm.date)}</span>
            {fm.readingMinutes != null && (
              <span>{fm.readingMinutes} min read</span>
            )}
          </div>
          {/* Long ops-log titles wrap 2-3 lines at 34px; the old 40px cap hit 5 lines
              and the display face overwhelmed the page before the article started. */}
          <h1 className="mt-3 font-display text-[clamp(21px,2.8vw,28px)] font-bold leading-[1.25] tracking-[-0.02em] text-ink">
            {fm.title}
          </h1>
          {fm.summary && (
            <p className="mt-4 font-text text-[16px] leading-relaxed text-ink-secondary">
              {fm.summary}
            </p>
          )}
          {(fm.author || (fm.tags && fm.tags.length > 0)) && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.04em] text-ink-tertiary">
              {fm.author && <span className="text-ink-secondary">by {fm.author}</span>}
              {fm.tags?.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
        </header>

        <div className="fieldnote mt-8">
          <Component />
        </div>
      </article>
    </Chrome>
  );
}
