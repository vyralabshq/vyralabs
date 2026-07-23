// All site copy lives here so it is easy to edit.

export const links = {
  github: "https://github.com/vyralabshq",
  x: "https://x.com/vyralabshq",
  email: "mailto:vyralabshq@gmail.com",
};

export const statedGoal = {
  long: "Vyra Labs is a build-in-public validator lab run by people who read the protocol, not just run it. We reimplement consensus to understand it, instrument our own node at the kernel level to measure what actually costs vote credits, and publish every epoch's economics in the open.",
  short:
    "Build-in-public validator lab. We read consensus, instrument the node, and measure the truth about small-validator economics.",
};

export const hero = {
  liveBadge: "VALIDATOR LIVE · TESTNET",
  heading: "From First Principles to",
  headingAccent: "Production.",
  subheading:
    "We run a Solana validator in the open and build the tooling that keeps it healthy. Every benchmark, deployment, failure, and lesson, shared openly.",
  primaryCta: { label: "See the Node", href: "/dashboard" },
  secondaryCta: { label: "Read the Field Notes", href: "/logs" },
  ctaNote: "live node,\nnot a screenshot",
};

// Evidence, not intentions. Each row is a shipped (or honestly in-progress) artifact
// with a status chip and an optional href so "go check it yourself" is one click.
export const workstreams: {
  eyebrow: string;
  heading: string;
  items: {
    title: string;
    detail: string;
    tag: string;
    tone: "live" | "progress" | "soon";
    href: string | null;
    external?: boolean;
  }[];
} = {
  eyebrow: "WHAT WE SHIP",
  heading: "Evidence, not a roadmap.",
  items: [
    {
      title: "Run the node in public",
      detail:
        "Testnet validator on bare metal. Live dashboard at vyralabs.fun, no login. Vote distance, credits, and system health from the box.",
      tag: "LIVE",
      tone: "live",
      href: "/dashboard",
    },
    {
      title: "Write the field notes",
      detail:
        "Operational write-ups of what broke and how it got fixed: client upgrades, XDP walls, consensus stall and restart. Real logs, not marketing.",
      tag: "LIVE",
      tone: "live",
      href: "/logs",
    },
    {
      title: "Instrument the node",
      detail:
        "driftwatch: eBPF disk-latency to vote-credit correlator. In progress; evidence runs not published yet.",
      tag: "IN PROGRESS",
      tone: "progress",
      href: null,
    },
  ],
};

export const milestones: {
  eyebrow: string;
  heading: string;
  cards: {
    phase: string;
    label: string;
    title: string;
    target: string;
    body: string;
    tag: string;
    state: "live" | "upcoming";
    href: string | null;
    note: string | null;
  }[];
} = {
  eyebrow: "ROADMAP",
  heading: "Road to mainnet.",
  cards: [
    {
      phase: "01",
      label: "TESTNET",
      title: "Testnet node",
      target: "voting on testnet",
      body: "Live on bare metal. Building operations and track record for the Solana Foundation Delegation Program.",
      tag: "LIVE",
      state: "live",
      href: "/dashboard",
      note: null,
    },
    {
      phase: "02",
      label: "MAINNET",
      title: "Mainnet validator",
      target: "not started",
      body: "Mainnet when operations and economics are proven. Pending delegation program approval.",
      tag: "UPCOMING",
      state: "upcoming",
      href: null,
      note: "unlocks after delegation approval",
    },
  ],
};

export const journal = {
  eyebrow: "FIELD NOTES",
  heading: "What actually breaks, and how it got fixed.",
  intro:
    "Operational notes from running the node in the open. Real problems, real logs, root cause, exact fix.",
  current: "Read all field notes",
  href: "/logs",
};

export const footer = {
  tagline: statedGoal.short,
  missionLine: "Current mission: Dream (From Zero to Mainnet) · Phase: testnet live.",
};

export const meta = {
  title: "Vyra Labs",
  description: "Solana validator infrastructure.",
};
