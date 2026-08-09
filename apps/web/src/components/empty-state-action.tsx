import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  steps?: string[];
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyStateAction({ message, steps, actionLabel, actionHref, className }: Props) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-muted/20 px-4 py-5", className)}>
      <p className="text-sm text-muted-foreground">{message}</p>
      {steps && steps.length > 0 ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {actionLabel && actionHref ? (
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
