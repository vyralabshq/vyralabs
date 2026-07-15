import type { Frontmatter } from "./posts";

// Frontmatter-only view of the notes, for surfaces that tease posts without rendering them
// (the landing page). Deliberately separate from posts.ts: that glob pulls each MDX module's
// default export — the whole compiled post body — which the landing page must never ship.
// `import: "frontmatter"` takes only the named export so the bodies tree-shake out.

export interface PostMeta {
  slug: string;
  frontmatter: Frontmatter;
}

const metas = import.meta.glob<Frontmatter>("/content/journal/*.mdx", {
  eager: true,
  import: "frontmatter",
});

function slugOf(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file.replace(/\.mdx$/, "").replace(/^\d+[-_]/, "");
}

/** Newest first, matching posts.ts ordering (number desc, date as tiebreak). */
export const postsMeta: PostMeta[] = Object.entries(metas)
  .map(([path, frontmatter]) => ({ slug: slugOf(path), frontmatter }))
  .sort((a, b) => {
    const na = a.frontmatter.number ?? 0;
    const nb = b.frontmatter.number ?? 0;
    if (na !== nb) return nb - na;
    return (b.frontmatter.date ?? "").localeCompare(a.frontmatter.date ?? "");
  });
