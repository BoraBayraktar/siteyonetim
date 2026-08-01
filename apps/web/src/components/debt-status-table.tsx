"use client";

import type { DebtRowDto } from "@siteyonetim/finance-dues";
import { Building2, Eye, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ServerPagination } from "@/components/server-pagination";
import {
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
} from "@/components/saas-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function formatDebtMoney(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export function debtUnitLabel(row: Pick<DebtRowDto, "blockName" | "unitCode">) {
  return row.blockName ? `${row.blockName} / ${row.unitCode}` : row.unitCode;
}

type DebtRowLike = {
  unitId?: string;
  unitCode: string;
  blockName: string | null;
  partyName: string | null;
  partyId?: string | null;
  totalDebt: string;
  aging0To30?: string;
  aging31To60?: string;
  aging61Plus?: string;
};

function isDebtOverdue(row: Pick<DebtRowLike, "aging31To60" | "aging61Plus">) {
  return Number(row.aging31To60 ?? 0) > 0 || Number(row.aging61Plus ?? 0) > 0;
}

type DebtStatusTableProps = {
  locale: string;
  propertyId: string;
  rows: DebtRowLike[];
  blocks: { id: string; name: string }[];
  filters: {
    q: string;
    blockId: string;
    overdueOnly: boolean;
  };
  onSearchChange: (value: string) => void;
  onBlockChange: (blockId: string) => void;
  onOverdueToggle: () => void;
  onRowClick: (row: DebtRowLike) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    basePath: string;
    extraSearchParams: Record<string, string | undefined>;
  };
  compact?: boolean;
  title?: string;
  subtitle?: string;
  showToolbar?: boolean;
  footerLink?: { href: string; label: string };
};

function DebtStatusBadge({ overdue }: { overdue: boolean }) {
  const t = useTranslations("unitsDebt");
  if (overdue) {
    return <Badge variant="destructive">{t("overdueBadge")}</Badge>;
  }
  return <Badge variant="success">{t("statusCurrent")}</Badge>;
}

function DebtUnitCell({ row }: { row: DebtRowLike }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Building2 className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{debtUnitLabel(row)}</p>
        <p className="truncate text-xs text-muted-foreground">{row.unitCode}</p>
      </div>
    </div>
  );
}

function DebtRowActions({ onViewDetail }: { onViewDetail: () => void }) {
  const t = useTranslations("unitsDebt");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        onViewDetail();
      }}
    >
      <Eye className="size-4" aria-hidden />
      <span className="sr-only">{t("viewDetail")}</span>
    </Button>
  );
}

export function DebtStatusTable({
  locale,
  propertyId,
  rows,
  blocks,
  filters,
  onSearchChange,
  onBlockChange,
  onOverdueToggle,
  onRowClick,
  pagination,
  compact = false,
  title,
  subtitle,
  showToolbar = true,
  footerLink,
}: DebtStatusTableProps) {
  const t = useTranslations("unitsDebt");

  return (
    <SaasTablePanel>
      {(title || subtitle) && (
        <SaasTableHeader>
          {title ? <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </SaasTableHeader>
      )}

      {showToolbar ? (
        <SaasTableToolbar>
          <div className="relative min-w-0 flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="bg-background pl-9"
              aria-label={t("searchLabel")}
            />
          </div>
          <Select value={filters.blockId} onValueChange={onBlockChange}>
            <SelectTrigger className="w-full bg-background md:w-44">
              <SelectValue placeholder={t("blockFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allBlocks")}</SelectItem>
              {blocks.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={filters.overdueOnly ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", !filters.overdueOnly && "bg-background")}
            onClick={onOverdueToggle}
          >
            <Filter className="size-4" aria-hidden />
            {t("overdueOnly")}
          </Button>
        </SaasTableToolbar>
      ) : null}

      {rows.length === 0 ? (
        <SaasTableEmpty>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("empty")}</p>
        </SaasTableEmpty>
      ) : (
        <>
          <SaasTableContainer>
            <SaasTable>
              <SaasTableHead>
                <SaasTableRow className="h-11 hover:bg-transparent">
                  <SaasTableHeadCell>{t("columnUnit")}</SaasTableHeadCell>
                  <SaasTableHeadCell>{t("columnParty")}</SaasTableHeadCell>
                  <SaasTableHeadCell className="text-right">{t("columnTotalDebt")}</SaasTableHeadCell>
                  {!compact ? (
                    <>
                      <SaasTableHeadCell className="text-right">{t("columnAging0To30")}</SaasTableHeadCell>
                      <SaasTableHeadCell className="text-right">{t("columnAging31To60")}</SaasTableHeadCell>
                      <SaasTableHeadCell className="text-right">{t("columnAging61Plus")}</SaasTableHeadCell>
                    </>
                  ) : null}
                  <SaasTableHeadCell>{t("columnStatus")}</SaasTableHeadCell>
                  <SaasTableHeadCell className="w-12 text-right">{t("columnActions")}</SaasTableHeadCell>
                </SaasTableRow>
              </SaasTableHead>
              <SaasTableBody>
                {rows.map((row) => {
                  const overdue = isDebtOverdue(row);
                  const rowKey = row.unitId ?? `${row.unitCode}-${row.partyName ?? "none"}`;
                  return (
                    <SaasTableRow
                      key={rowKey}
                      className="cursor-pointer"
                      onClick={() => onRowClick(row)}
                    >
                      <SaasTableCell>
                        <DebtUnitCell row={row} />
                      </SaasTableCell>
                      <SaasTableCell>
                        <span className="text-foreground">{row.partyName ?? "—"}</span>
                      </SaasTableCell>
                      <SaasTableCell className="text-right">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatDebtMoney(row.totalDebt, locale)}
                        </span>
                      </SaasTableCell>
                      {!compact ? (
                        <>
                          <SaasTableCell className="text-right tabular-nums text-muted-foreground">
                            {formatDebtMoney(row.aging0To30 ?? "0", locale)}
                          </SaasTableCell>
                          <SaasTableCell className="text-right tabular-nums text-muted-foreground">
                            {formatDebtMoney(row.aging31To60 ?? "0", locale)}
                          </SaasTableCell>
                          <SaasTableCell className="text-right tabular-nums text-muted-foreground">
                            {formatDebtMoney(row.aging61Plus ?? "0", locale)}
                          </SaasTableCell>
                        </>
                      ) : null}
                      <SaasTableCell>
                        <DebtStatusBadge overdue={overdue} />
                      </SaasTableCell>
                      <SaasTableCell className="text-right">
                        <DebtRowActions onViewDetail={() => onRowClick(row)} />
                      </SaasTableCell>
                    </SaasTableRow>
                  );
                })}
              </SaasTableBody>
            </SaasTable>
          </SaasTableContainer>

          {pagination || footerLink ? (
            <SaasTableFooter>
              {pagination ? (
                <ServerPagination
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  basePath={pagination.basePath}
                  locale={locale}
                  extraSearchParams={pagination.extraSearchParams}
                  variant="saas"
                />
              ) : footerLink ? (
                <Button variant="ghost" size="sm" asChild className="px-0">
                  <Link href={footerLink.href}>{footerLink.label}</Link>
                </Button>
              ) : null}
            </SaasTableFooter>
          ) : null}
        </>
      )}
    </SaasTablePanel>
  );
}
