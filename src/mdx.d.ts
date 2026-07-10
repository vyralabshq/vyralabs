// Lets TypeScript import .mdx posts. Each post default-exports its rendered
// component; frontmatter (YAML at the top) is a named export via remark-mdx-frontmatter.
declare module "*.mdx" {
  import type { ComponentType } from "react";

  export const frontmatter: {
    title: string;
    date: string;
    summary?: string;
    tags?: string[];
    number?: number;
    status?: string;
    author?: string;
  };

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
