import type { ReactNode } from "react";

// Shared shell for a dense inline metric strip (NETWORK, NODE CAUGHT UP): one bordered
// panel of labelled stats that wrap instead of stacking into big cards. Items are bespoke
// per section; this only owns the container so every strip reads the same.

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-accent/12 bg-surface/60 p-4 font-mono text-sm sm:p-5">
      {children}
    </div>
  );
}
