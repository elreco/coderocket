"use client";

import { useEffect, useState } from "react";

export function ComponentLoadingMockup({ fileName }: { fileName?: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex size-full flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="w-full max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
            <div className="ml-2 flex-1 text-center text-xs font-medium text-muted-foreground">
              {fileName || "Generating..."}
            </div>
          </div>

          <div className="relative min-h-[400px] p-8">
            {phase === 0 && (
              <div className="absolute inset-8 duration-700 animate-in fade-in">
                <div className="space-y-3.5">
                  <div className="flex animate-pulse items-center gap-3">
                    <div className="h-3 w-20 rounded bg-purple-500/70" />
                    <div className="h-3 w-28 rounded bg-blue-500/60" />
                    <div className="h-3 w-24 rounded bg-cyan-500/70" />
                    <div className="h-3 w-32 rounded bg-blue-400/60" />
                  </div>

                  <div className="flex animate-pulse items-center gap-3 pl-6 [animation-delay:150ms]">
                    <div className="h-3 w-16 rounded bg-gray-500/50" />
                    <div className="h-3 w-36 rounded bg-emerald-500/60" />
                    <div className="h-3 w-28 rounded bg-blue-500/60" />
                  </div>

                  <div className="flex animate-pulse items-center gap-3 pl-6 [animation-delay:300ms]">
                    <div className="h-3 w-24 rounded bg-orange-500/60" />
                    <div className="h-3 w-20 rounded bg-gray-500/50" />
                    <div className="h-3 w-16 rounded bg-pink-500/60" />
                  </div>

                  <div className="h-4" />

                  <div className="flex animate-pulse items-center gap-3">
                    <div className="h-3 w-28 rounded bg-purple-500/70" />
                    <div className="h-3 w-32 rounded bg-cyan-500/70" />
                  </div>

                  <div className="flex animate-pulse items-center gap-3 pl-6">
                    <div className="h-3 w-20 rounded bg-blue-500/60" />
                    <div className="relative h-3 w-40 overflow-hidden rounded bg-primary/70">
                      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {phase === 1 && (
              <div className="absolute inset-8 duration-700 animate-in fade-in">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="h-32 flex-1 animate-pulse rounded-lg border-2 border-dashed border-primary/30 bg-primary/5" />
                    <div className="h-32 flex-1 animate-pulse rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-500/5 [animation-delay:200ms]" />
                  </div>

                  <div className="h-24 animate-pulse rounded-lg border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 [animation-delay:400ms]" />

                  <div className="flex gap-3">
                    <div className="size-20 animate-pulse rounded-lg border-2 border-dashed border-orange-500/30 bg-orange-500/5 [animation-delay:600ms]" />
                    <div className="h-20 flex-1 animate-pulse rounded-lg border-2 border-dashed border-purple-500/30 bg-purple-500/5 [animation-delay:800ms]" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 animate-pulse rounded-lg border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 [animation-delay:1000ms]" />
                    <div className="h-16 animate-pulse rounded-lg border-2 border-dashed border-pink-500/30 bg-pink-500/5 [animation-delay:1100ms]" />
                    <div className="h-16 animate-pulse rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 [animation-delay:1200ms]" />
                  </div>
                </div>
              </div>
            )}

            {phase === 2 && (
              <div className="absolute inset-8 duration-700 animate-in fade-in">
                <div className="space-y-4">
                  <div className="h-12 animate-pulse rounded-lg bg-gradient-to-r from-primary/20 to-blue-500/20" />

                  <div className="flex gap-4">
                    <div className="size-48 animate-pulse rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg [animation-delay:200ms]" />
                    <div className="flex-1 space-y-3">
                      <div className="h-8 animate-pulse rounded bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 [animation-delay:400ms]" />
                      <div className="h-6 w-3/4 animate-pulse rounded bg-muted/40 [animation-delay:600ms]" />
                      <div className="h-6 w-1/2 animate-pulse rounded bg-muted/40 [animation-delay:800ms]" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-10 w-24 animate-pulse rounded-lg bg-primary/30 [animation-delay:1000ms]" />
                        <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/30 [animation-delay:1100ms]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="h-20 animate-pulse rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 [animation-delay:1200ms]" />
                    <div className="h-20 animate-pulse rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 [animation-delay:1300ms]" />
                    <div className="h-20 animate-pulse rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 [animation-delay:1400ms]" />
                    <div className="h-20 animate-pulse rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 [animation-delay:1500ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-border/50 bg-background px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/75 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-primary" />
              </div>
              <span>Creating component</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <div className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <div className="size-1 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
