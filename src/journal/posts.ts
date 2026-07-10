import type { ComponentType } from "react";

// Field Notes index. Every .mdx file in content/journal/ is picked up automatically
// at build time (import.meta.glob), so publishing a post is: add a file, push. No
// registration list to maintain. Ordering is by the `number` in frontmatter (newest
// first), date as tiebreak.

export interface Frontmatter {
  title: string;
  date: string;
  summary?: string;
  tags?: string[];
  number?: number;
  status?: string;
  author?: string;
  // Computed at build by the remarkReadingTime plugin (see vite.config.ts).
  readingMinutes?: number;
}

export interface Post {
  slug: string;
  frontmatter: Frontmatter;
  Component: ComponentType;
}

interface MdxModule {
  default: ComponentType;
  frontmatter: Frontmatter;
}

const modules = import.meta.glob<MdxModule>("/content/journal/*.mdx", {
  eager: true,
});

// URL slug drops the numeric ordering prefix: "004-tower-nesting.mdx" -> "tower-nesting".
function slugOf(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file.replace(/\.mdx$/, "").replace(/^\d+[-_]/, "");
}

export const posts: Post[] = Object.entries(modules)
  .map(([path, mod]) => ({
    slug: slugOf(path),
    frontmatter: mod.frontmatter,
    Component: mod.default,
  }))
  .sort((a, b) => {
    const na = a.frontmatter.number ?? 0;
    const nb = b.frontmatter.number ?? 0;
    if (na !== nb) return nb - na;
    return (b.frontmatter.date ?? "").localeCompare(a.frontmatter.date ?? "");
  });

export function postBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
