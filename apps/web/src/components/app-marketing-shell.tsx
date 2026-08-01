import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

export function AppMarketingShell({ children, className }: Props) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-background", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.18),transparent)]" />
      <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-64 size-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
