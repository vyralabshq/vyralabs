// Navbar network switcher. Testnet is live and links to its dashboard; Mainnet is a
// placeholder slot that lights up (add an href) once a mainnet node exists.

import { useState } from "react";

type Network = { label: string; href: string | null };

const NETWORKS: Network[] = [
  { label: "Testnet", href: "/dashboard" },
  // When the mainnet node is up, give this an href (e.g. "/dashboard?cluster=mainnet").
  { label: "Mainnet", href: null },
];

export function NetworkMenu({ navLink }: { navLink: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={`${navLink} inline-flex items-center gap-1.5`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Dashboard
        <span aria-hidden className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-lg border border-accent/15 bg-elevated/95 py-1 shadow-xl backdrop-blur"
          >
            {NETWORKS.map((n) =>
              n.href ? (
                <a
                  key={n.label}
                  role="menuitem"
                  href={n.href}
                  className="flex items-center justify-between px-3 py-2 text-ink-secondary transition-colors hover:bg-accent/10 hover:text-ink"
                >
                  <span>{n.label}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" title="live" />
                </a>
              ) : (
                <div
                  key={n.label}
                  role="menuitem"
                  aria-disabled
                  className="flex cursor-not-allowed items-center justify-between px-3 py-2 text-ink-muted/60"
                >
                  <span>{n.label}</span>
                  <span className="font-mono text-[10px] tracking-wider">soon</span>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
