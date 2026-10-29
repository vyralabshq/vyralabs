// All site copy lives here so it is easy to edit.

export const links = {
  github: "https://github.com/vyralabshq",
  x: "https://x.com/vyralabshq",
  email: "mailto:vyralabshq@gmail.com",
};

export const statedGoal = {
  long: "Vyra Labs is a build-in-public validator lab run by people who read the protocol, not just run it. We ran a Solana testnet validator on bare metal for 117 days, instrumented it down to the kernel, and published what broke, what held, and what we measured.",
  short:
    "Build-in-public validator lab. We read consensus, instrument the node, and publish what we measure.",
};

export const hero = {
  liveBadge: "TESTNET NODE · RETIRED 29 OCT 2026",
  heading: "From First Principles to",
  headingAccent: "Production.",
  subheading:
    "We ran a Solana validator in the open for 117 days and built the tooling around it. Every benchmark, deployment, failure, and lesson, shared openly.",
  primaryCta: { label: "Read the Field Notes", href: "/logs" },
  secondaryCta: { label: "See the Code", href: "https://github.com/vyralabshq" },
  ctaNote: "117 days on testnet,\n6,904 blocks, 12 skipped",
};

// Evidence, not intentions. Each row is a shipped (or honestly parked) artifact
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
      title: "shredtap",
      detail:
        "Live shred decoder. Rebuilds FEC sets, checks Merkle proofs, and turns raw shreds into slots and transactions. Ran on our validator.",
      tag: "OPEN SOURCE",
      tone: "live",
      href: "https://github.com/jkrishnad/shred-tap",
      external: true,
    },
    {
      title: "shred-core",
      detail:
        "The library behind shredtap. Feed it raw Solana shred packets, get back verified transactions and slots.",
      tag: "OPEN SOURCE",
      tone: "live",
      href: "https://github.com/vyralabshq/shred-core",
      external: true,
    },
    {
      title: "shredwire",
      detail:
        "Reads shreds off the wire, verifies every one, and streams each transaction over gRPC the moment its batch completes.",
      tag: "OPEN SOURCE",
      tone: "live",
      href: "https://github.com/jkrishnad/shred-wire",
      external: true,
    },
    {
      title: "preflight",
      detail: "40 checks for a validator box before it goes live: OS, kernel, network, disk, and client.",
      tag: "OPEN SOURCE",
      tone: "live",
      href: "https://github.com/vyralabshq/preflight",
      external: true,
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
      title: "Run the node in public",
      detail:
        "Testnet validator on bare metal in Singapore, 4 Jul to 29 Oct 2026. Epochs 1055 to 1072: 6,904 leader slots produced, 12 skipped (0.17%).",
      tag: "RETIRED",
      tone: "soon",
      href: null,
    },
    {
      title: "Instrument the node",
      detail: "driftwatch: eBPF disk-latency to vote-credit correlator. Parked with the node; evidence runs not published.",
      tag: "PARKED",
      tone: "soon",
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
  heading: "Where the lab stands.",
  cards: [
    {
      phase: "01",
      label: "TESTNET",
      title: "Testnet node",
      target: "117 days, 0.17% skipped",
      body: "Ran on bare metal from 4 Jul to 29 Oct 2026. Upgrades, a cluster restart, Alpenglow, and a full audit before we retired it.",
      tag: "DONE",
      state: "live",
      href: null,
      note: "final epoch 1072: 348 of 348 blocks",
    },
    {
      phase: "02",
      label: "MAINNET",
      title: "Mainnet validator",
      target: "on hold",
      body: "Mainnet when the economics work for a small operator. Until then, tooling and research.",
      tag: "ON HOLD",
      state: "upcoming",
      href: null,
      note: "the testnet playbook is ready",
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
  missionLine: "Testnet node retired 29 Oct 2026 after 117 days. Now: tooling and research.",
};

export const meta = {
  title: "Vyra Labs",
  description: "Solana validator infrastructure.",
};
