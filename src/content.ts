// All site copy lives here so it is easy to edit. No em-dashes anywhere.

// Socials intentionally empty for now. Fill in later.
export const links = {
  github: "#",
  x: "#",
  email: "#",
};

export const hero = {
  badge: "MISSION 001",
  heading: "From First Principles to",
  headingAccent: "Production.",
  subheading:
    "Vyra documents the journey from learning distributed systems to operating production infrastructure. Every benchmark, deployment, failure, and lesson, shared openly.",
  primaryCta: { label: "Explore the Journey", href: "#journey" },
  secondaryCta: { label: "Read the Journal", href: "#journal" },
};

export const manifesto = {
  eyebrow: "MANIFESTO",
  lines: [
    "Every expert started somewhere.",
    "Great infrastructure engineers aren't built through shortcuts.",
    "They're built through curiosity, benchmarks, profiling sessions, failed deployments, and iteration.",
    "Vyra documents that journey publicly.",
  ],
};

export const mission = {
  eyebrow: "MISSION 001",
  title: "Dream",
  subtitle: "From Zero to Mainnet",
  body: "Building a production-ready Solana validator while documenting every lesson along the way. Testnet first, mainnet when the operations and economics are proven.",
  marker: "PHASE: TESTNET PREP",
};

export const milestones: {
  eyebrow: string;
  cards: {
    label: string;
    title: string;
    target: string;
    body: string;
    tag: string;
    state: "next" | "upcoming";
  }[];
} = {
  eyebrow: "WHAT'S NEXT",
  cards: [
    {
      label: "TESTNET",
      title: "Testnet node",
      target: "TARGET: JULY 2026",
      body: "Live node on Alpenglow-era bare metal. Moving early to qualify for the Solana Foundation Delegation Program.",
      tag: "NEXT",
      state: "next",
    },
    {
      label: "MAINNET",
      title: "Mainnet validator",
      target: "TARGET: ~2 MONTHS AFTER TESTNET",
      body: "Production validator, pending delegation program approval. Mainnet when operations and economics are proven.",
      tag: "UPCOMING",
      state: "upcoming",
    },
  ],
};

export const journal = {
  eyebrow: "JOURNAL",
  intro:
    "Field notes from the build. Every experiment, regression, and lesson, written like an engineer documenting discoveries (not marketing).",
  empty: "First entries coming as the testnet node goes up.",
};

export const footer = {
  tagline: "Building distributed systems in public.",
  missionLine: "Current Mission: Dream (From Zero to Mainnet).",
};

export const meta = {
  title: "Vyra (Engineering the Journey)",
  description:
    "Vyra is an engineering lab documenting the journey from first principles to production infrastructure, through open experiments, research, and systems engineering.",
};
