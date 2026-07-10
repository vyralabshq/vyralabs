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
}

export interface Post {
  slug: string;
  frontmatter: Frontmatter;
  Component: ComponentType;
  readingMinutes: number;
}

interface MdxModule {
  default: ComponentType;
  frontmatter: Frontmatter;
}

const modules = import.meta.glob<MdxModule>("/content/journal/*.mdx", {
  eager: true,
});

// Raw source of each post, to estimate reading time (word count / 200 wpm).
const sources = import.meta.glob("/content/journal/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function readingMinutes(raw: string | undefined): number {
  if (!raw) return 1;
  const body = raw.replace(/^---[\s\S]*?---/, ""); // drop frontmatter
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

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
    readingMinutes: readingMinutes(sources[path]),
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
