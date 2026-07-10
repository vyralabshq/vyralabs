// All site copy lives here so it is easy to edit. No em-dashes anywhere.

export const links = {
  github: "https://github.com/vyralabshq",
  x: "https://x.com/vyralabshq",
  email: "mailto:vyralabshq@gmail.com",
};

// The stated goal is LOCKED and must resonate everywhere: hero, the lab statement, the
// three do-cards, footer, meta, and any grant/SFDP form. One voice, one message.
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
};

// The long-form stated goal, presented as the resonant statement. Split so the signature
// line ("read the protocol, not just run it") can carry the accent.
export const lab = {
  eyebrow: "THE LAB",
  lead: "Vyra Labs is a build-in-public validator lab run by people who",
  accent: "read the protocol, not just run it.",
  rest: "We reimplement consensus to understand it, instrument our own node at the kernel level to measure what actually costs vote credits, and publish every epoch's economics in the open.",
};

// Each card is one clause of the stated goal, made concrete. Tag drives the status pill.
// href stays null until the artifact is genuinely public (no dead links).
export const whatWeDo: {
  eyebrow: string;
  heading: string;
  cards: { title: string; body: string; tag: string; href: string | null }[];
} = {
  eyebrow: "WHAT WE DO",
  heading: "not just running it.",
  cards: [
    {
      title: "Read the protocol",
      body: "We reimplement consensus to understand it, not just run it. Reimplemented part of Alpenglow's Votor and published the explainer.",
      tag: "PUBLISHED",
      href: null,
    },
    {
      title: "Instrument the node",
      body: "We instrument our own node at the kernel level to measure what actually costs vote credits. driftwatch (eBPF) is in progress.",
      tag: "IN PROGRESS",
      href: null,
    },
    {
      title: "Measure the economics",
      body: "We publish every epoch's economics in the open. Real cost and revenue from our own node, measured, not modeled.",
      tag: "SOON",
      href: null,
    },
  ],
};

export const mission = {
  eyebrow: "MISSION 001",
  title: "Dream",
  subtitle: "From Zero to Mainnet",
  body: "Building a production-ready Solana validator while documenting every lesson along the way. Testnet first, mainnet when the operations and economics are proven.",
  marker: "PHASE: TESTNET LIVE",
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
      phase: "PHASE 01",
      label: "TESTNET",
      title: "Testnet node",
      target: "voting on testnet",
      body: "Live node on bare metal, voting every slot. Building the operations and track record to qualify for the Solana Foundation Delegation Program.",
      tag: "LIVE",
      state: "live",
      href: "/dashboard",
      note: null,
    },
    {
      phase: "PHASE 02",
      label: "MAINNET",
      title: "Mainnet validator",
      target: "not started",
      body: "Pending delegation program approval. Mainnet when the operations and economics are proven.",
      tag: "UPCOMING",
      state: "upcoming",
      href: null,
      note: "unlocks after delegation approval",
    },
  ],
};

export const journal = {
  eyebrow: "FIELD NOTES",
  intro:
    "Operational field notes from running the node in the open. Real problems, the real logs, the root cause, and the exact fix (not marketing).",
  current: "Read the field notes",
  href: "/logs",
};

export const footer = {
  tagline: statedGoal.short,
  missionLine: "Current Mission: Dream (From Zero to Mainnet).",
};

export const meta = {
  title: "Vyra Labs",
  description: "Solana validator infrastructure.",
};
