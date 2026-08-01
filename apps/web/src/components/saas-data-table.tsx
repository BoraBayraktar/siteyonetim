import * as React from "react";

import { cn } from "@/lib/utils";

const SaasTablePanel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  ),
);
SaasTablePanel.displayName = "SaasTablePanel";

const SaasTableHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-b px-5 py-5 md:px-6", className)} {...props} />
  ),
);
SaasTableHeader.displayName = "SaasTableHeader";

const SaasTableToolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-3 border-b bg-card px-5 py-4 md:flex-row md:flex-wrap md:items-center md:px-6", className)}
      {...props}
    />
  ),
);
SaasTableToolbar.displayName = "SaasTableToolbar";

const SaasTableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("overflow-x-auto", className)} {...props} />
  ),
);
SaasTableContainer.displayName = "SaasTableContainer";

const SaasTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn("w-full min-w-[720px] border-collapse text-sm", className)} {...props} />
  ),
);
SaasTable.displayName = "SaasTable";

const SaasTableHead = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-muted/60", className)} {...props} />
  ),
);
SaasTableHead.displayName = "SaasTableHead";

const SaasTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("divide-y divide-border", className)} {...props} />,
);
SaasTableBody.displayName = "SaasTableBody";

const SaasTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-14 transition-colors hover:bg-muted/40 data-[state=selected]:bg-accent/50",
        className,
      )}
      {...props}
    />
  ),
);
SaasTableRow.displayName = "SaasTableRow";

const SaasTableHeadCell = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase first:pl-6 last:pr-6",
        className,
      )}
      {...props}
    />
  ),
);
SaasTableHeadCell.displayName = "SaasTableHeadCell";

const SaasTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-4 py-3 align-middle first:pl-6 last:pr-6", className)} {...props} />
  ),
);
SaasTableCell.displayName = "SaasTableCell";

const SaasTableFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3 border-t bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6",
        className,
      )}
      {...props}
    />
  ),
);
SaasTableFooter.displayName = "SaasTableFooter";

function SaasTableEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}
      {...props}
    />
  );
}

export {
  SaasTable,
  SaasTableBody,
  SaasTableCell,
  SaasTableContainer,
  SaasTableEmpty,
  SaasTableFooter,
  SaasTableHead,
  SaasTableHeadCell,
  SaasTableHeader,
  SaasTablePanel,
  SaasTableRow,
  SaasTableToolbar,
};
