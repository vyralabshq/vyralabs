import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const POSTS_DIR = join(ROOT, "content", "journal");
const DIST = join(ROOT, "dist");
const SITE = "https://vyralabs.fun";
const DEFAULT_IMAGE = `${SITE}/og.png`;

// The generic strings baked into journal.html, swapped per post.
const GENERIC_TITLE = "Field Notes / Vyra Labs";
const GENERIC_DESC =
  "Real problems hit running a Solana validator, diagnosed and fixed in the open.";
const GENERIC_META_DESC =
  "Field Notes from the Vyra Labs validator. Real problems hit running the node, diagnosed and fixed in the open.";

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Pull one quoted frontmatter value: key: "value".
function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, "m"));
  return m ? m[1] : null;
}

function slugOf(file) {
  return file.replace(/\.mdx$/, "").replace(/^\d+[-_]/, "");
}

const shell = await readFile(join(DIST, "journal.html"), "utf8");
const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".mdx"));

let count = 0;
for (const file of files) {
  const raw = await readFile(join(POSTS_DIR, file), "utf8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];

  const title = field(fm, "title");
  const summary = field(fm, "summary") ?? GENERIC_DESC;
  if (!title) continue;

  const slug = slugOf(file);
  const url = `${SITE}/logs/${slug}`;
  const image = field(fm, "image")
    ? `${SITE}${field(fm, "image")}`
    : DEFAULT_IMAGE;

  const html = shell
    .split(GENERIC_TITLE)
    .join(esc(title))
    .split(GENERIC_DESC)
    .join(esc(summary))
    .split(GENERIC_META_DESC)
    .join(esc(summary))
    .replace('content="https://vyralabs.fun/logs"', `content="${esc(url)}"`)
    .replace('content="website"', 'content="article"')
    .replaceAll(esc(DEFAULT_IMAGE), esc(image));

  await mkdir(join(DIST, "logs"), { recursive: true });
  await writeFile(join(DIST, "logs", `${slug}.html`), html, "utf8");
  count += 1;
}

console.log(`prerender-og: wrote ${count} per-post HTML file(s) to dist/logs/`);
