// Motion's DOM feature set, isolated in its own module purely to give Rollup a split point.
// Importing `domAnimation` from "motion/react" inside App.tsx would resolve to the same
// module App already imports statically, so the bundler merges it back into the entry and
// nothing is deferred. From here it becomes its own chunk, fetched after hydration.
import { domAnimation } from "motion/react";

export default domAnimation;
