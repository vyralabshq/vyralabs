import type { ReactNode } from "react";

// Shared shell for a dense inline metric strip (NETWORK, NODE CAUGHT UP): one bordered
// panel of labelled stats that wrap instead of stacking into big cards. Items are bespoke
// per section; this only owns the container so every strip reads the same.

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-accent/12 bg-surface/60 p-4 font-mono text-[13px] sm:gap-x-8 sm:gap-y-3 sm:p-5 sm:text-sm">
      {children}
    </div>
  );
}
