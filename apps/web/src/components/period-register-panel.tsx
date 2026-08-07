"use client";

import type { CashboxDto } from "@siteyonetim/finance-core";
import type {
  PeriodRegisterCellDto,
  PeriodRegisterColumnDto,
  PeriodRegisterPageDto,
  PeriodRegisterRowDto,
  DueAccrualRunDto,
  UnitDebtDetailDto,
} from "@siteyonetim/finance-dues";
import type { BlockDto } from "@siteyonetim/property-core";
import { DueAccrualLineKind, DueCalculationMode } from "@siteyonetim/db";
import { Download, Filter, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";

import { getUnitDebtDetailAction, recordDuePaymentAction, type DuesActionState } from "@/app/actions/dues";
import { debtUnitLabel, formatDebtMoney } from "@/components/debt-status-table";
import { FormDrawer } from "@/components/form-drawer";
import { ServerPagination } from "@/components/server-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { registerPeriodFilterOptions } from "@/lib/accrual-filters";

type Props = {
  locale: string;
  propertyId: string;
  registerPage: PeriodRegisterPageDto;
  blocks: BlockDto[];
  cashboxes: CashboxDto[];
  runs: DueAccrualRunDto[];
  filters: {
    q: string;
    blockId: string | null;
    overdueOnly: boolean;
    withDebtOnly: boolean;
    year: number;
    month: number;
  };
  initialUnitId?: string | null;
};

const initialPayState: DuesActionState = {};

type PaymentAllocationItem = {
  lineId: string;
  remaining: string;
  definitionName: string;
};

type PaymentTarget = {
  unitId: string;
  unitCode: string;
  blockName: string | null;
  partyId: string;
  partyName: string | null;
  allocations: PaymentAllocationItem[];
};

type SelectedCellKey = string;

function cellSelectionKey(unitId: string, lineId: string) {
  return `${unitId}:${lineId}`;
}

function sumRemaining(allocations: PaymentAllocationItem[]) {
  return allocations.reduce((sum, item) => sum + Number(item.remaining), 0).toFixed(2);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatStatementDate(date: Date | string, locale: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

function formatOpenDebtLineLabel(line: UnitDebtDetailDto["openLines"][number]) {
  if (
    line.lineKind === DueAccrualLineKind.LATE_FEE &&
    line.sourceDueDefinitionName &&
    line.sourceMonth != null &&
    line.sourceYear != null
  ) {
    return `${line.dueDefinitionName} (${line.sourceDueDefinitionName} ${line.sourceMonth}/${line.sourceYear})`;
  }
  if (line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE && line.supplierLateFeeAllocationMode) {
    const ref = line.supplierReference ? ` · ${line.supplierReference}` : "";
    return `${line.dueDefinitionName} (${line.supplierLateFeeAllocationMode}${ref})`;
  }
  return `${line.dueDefinitionName} ${line.month}/${line.year}`;
}

function resolveDetailParty(detail: UnitDebtDetailDto) {
  const partyId = detail.row.partyId ?? detail.openLines.find((line) => line.partyId)?.partyId ?? null;
  const partyName =
    detail.row.partyName ?? detail.openLines.find((line) => line.partyName)?.partyName ?? null;
  return { partyId, partyName };
}

function cellTone(cell: PeriodRegisterCellDto) {
  if (cell.status === "NONE" || Number(cell.amount) <= 0) {
    return "text-muted-foreground";
  }
  if (cell.isOverdue && Number(cell.remaining) > 0) {
    return "bg-destructive/10 text-destructive";
  }
  if (cell.status === "PAID") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (cell.status === "PARTIAL") {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-400";
  }
  return "bg-muted/50";
}

function RegisterCell({
  locale,
  cell,
  selected,
  bulkMode,
  onToggleSelect,
}: {
  locale: string;
  cell: PeriodRegisterCellDto;
  selected: boolean;
  bulkMode: boolean;
  onToggleSelect: () => void;
}) {
  const t = useTranslations("periodRegister");

  if (cell.status === "NONE" || Number(cell.amount) <= 0) {
    return <span className="text-muted-foreground">{t("cellNone")}</span>;
  }

  const selectable = Boolean(cell.lineId) && Number(cell.remaining) > 0;

  const content = (
    <>
      <div className="font-medium tabular-nums">
        {formatDebtMoney(cell.paidAmount, locale)} / {formatDebtMoney(cell.amount, locale)}
      </div>
      {Number(cell.remaining) > 0 ? (
        <div className="tabular-nums opacity-80">{formatDebtMoney(cell.remaining, locale)}</div>
      ) : null}
      {cell.lastDocumentNo ? (
        <div className="truncate opacity-70">{cell.lastDocumentNo}</div>
      ) : null}
      {cell.lineKind === DueAccrualLineKind.LATE_FEE ? (
        <div className="text-[10px] uppercase tracking-wide opacity-70">{t("lateFeeBadge")}</div>
      ) : null}
      {cell.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE && cell.supplierLateFeeAllocationMode ? (
        <div className="text-[10px] uppercase tracking-wide opacity-70">
          {t(`supplierLateFeeAllocationMode.${cell.supplierLateFeeAllocationMode}`)}
        </div>
      ) : null}
    </>
  );

  // Toplu seçimde hücre tıklaması seçimi değiştirir; normal modda satır tıklaması detayı açar.
  if (bulkMode && selectable) {
    return (
      <button
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleSelect();
        }}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer hover:ring-2 hover:ring-primary/30",
          cellTone(cell),
          selected && "ring-2 ring-primary",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("w-full rounded-md px-2 py-1.5 text-left text-xs", cellTone(cell))}>
      {content}
    </div>
  );
}

function serializeRegisterFilters(input: {
  q: string;
  blockId: string;
  overdueOnly: boolean;
  withDebtOnly: boolean;
  year: number;
  month: number;
}) {
  const params = new URLSearchParams();
  params.set("tab", "register");
  params.set("year", String(input.year));
  params.set("month", String(input.month));
  const trimmedQ = input.q.trim();
  if (trimmedQ) {
    params.set("q", trimmedQ);
  }
  if (input.blockId && input.blockId !== "all") {
    params.set("blockId", input.blockId);
  }
  if (input.overdueOnly) {
    params.set("overdueOnly", "1");
  }
  if (input.withDebtOnly) {
    params.set("withDebtOnly", "1");
  }
  return params.toString();
}

function serializeExportParams(input: {
  q: string;
  blockId: string;
  overdueOnly: boolean;
  withDebtOnly: boolean;
  year: number;
  month: number;
  format: "csv" | "xlsx" | "pdf";
}) {
  const params = new URLSearchParams();
  params.set("year", String(input.year));
  params.set("month", String(input.month));
  params.set("format", input.format);
  const trimmedQ = input.q.trim();
  if (trimmedQ) {
    params.set("q", trimmedQ);
  }
  if (input.blockId && input.blockId !== "all") {
    params.set("blockId", input.blockId);
  }
  if (input.overdueOnly) {
    params.set("overdueOnly", "1");
  }
  if (input.withDebtOnly) {
    params.set("withDebtOnly", "1");
  }
  return params.toString();
}

export function PeriodRegisterPanel({
  locale,
  propertyId,
  registerPage,
  blocks,
  cashboxes,
  runs,
  filters,
  initialUnitId,
}: Props) {
  const t = useTranslations("periodRegister");
  const tDues = useTranslations("dues");
  const tDebt = useTranslations("unitsDebt");
  const tPortal = useTranslations("portal");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [payState, payAction, payPending] = useActionState(
    recordDuePaymentAction.bind(null, locale, propertyId),
    initialPayState,
  );

  const [q, setQ] = useState(filters.q);
  const [blockId, setBlockId] = useState(filters.blockId ?? "all");
  const [overdueOnly, setOverdueOnly] = useState(filters.overdueOnly);
  const [withDebtOnly, setWithDebtOnly] = useState(filters.withDebtOnly);
  const [year, setYear] = useState(String(filters.year));
  const [month, setMonth] = useState(String(filters.month));

  const [cashboxId, setCashboxId] = useState(cashboxes[0]?.id ?? "");
  const [payAmount, setPayAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<
    Record<SelectedCellKey, PaymentAllocationItem & { unitId: string; partyId: string; unitCode: string; blockName: string | null; partyName: string | null }>
  >({});

  const selectedCellList = useMemo(() => Object.values(selectedCells), [selectedCells]);
  const selectedTotal = useMemo(() => sumRemaining(selectedCellList), [selectedCellList]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<UnitDebtDetailDto | null>(null);
  const detailOpenRef = useRef(detailOpen);
  const detailUnitIdRef = useRef(detailUnitId);
  detailOpenRef.current = detailOpen;
  detailUnitIdRef.current = detailUnitId;

  const detailParty = useMemo(() => (detail ? resolveDetailParty(detail) : null), [detail]);

  const paginationParams = {
    tab: "register",
    year: String(filters.year),
    month: String(filters.month),
    q: filters.q || undefined,
    blockId: filters.blockId || undefined,
    overdueOnly: filters.overdueOnly ? "1" : undefined,
    withDebtOnly: filters.withDebtOnly ? "1" : undefined,
  };

  const yearOptions = useMemo(
    () => registerPeriodFilterOptions(runs, filters).years,
    [runs, filters.year, filters.month],
  );

  const monthOptions = useMemo(
    () => registerPeriodFilterOptions(runs, { year: Number(year), month: Number(month) }).months,
    [runs, year, month],
  );

  useEffect(() => {
    setQ(filters.q);
    setBlockId(filters.blockId ?? "all");
    setOverdueOnly(filters.overdueOnly);
    setWithDebtOnly(filters.withDebtOnly);
    setYear(String(filters.year));
    setMonth(String(filters.month));
  }, [filters]);

  useEffect(() => {
    if (cashboxes.length === 0) {
      setCashboxId("");
      return;
    }
    if (!cashboxes.some((cashbox) => cashbox.id === cashboxId)) {
      setCashboxId(cashboxes[0]!.id);
    }
  }, [cashboxId, cashboxes]);

  useEffect(() => {
    if (!payState.success) {
      return;
    }
    setPaymentOpen(false);
    setPaymentTarget(null);
    setSelectedCells({});
    setBulkMode(false);
    router.refresh();
    const openUnitId = detailOpenRef.current ? detailUnitIdRef.current : null;
    if (openUnitId) {
      void refreshDetail(openUnitId);
    }
  }, [payState.success, router]);

  useEffect(() => {
    if (!initialUnitId) {
      return;
    }
    void openDetail(initialUnitId);
  }, [initialUnitId]);

  function pushFilters(
    overrides: Partial<{
      q: string;
      blockId: string;
      overdueOnly: boolean;
      withDebtOnly: boolean;
      year: number;
      month: number;
    }> = {},
  ) {
    const nextQuery = serializeRegisterFilters({
      q: overrides.q !== undefined ? overrides.q : q,
      blockId: overrides.blockId !== undefined ? overrides.blockId : blockId,
      overdueOnly: overrides.overdueOnly !== undefined ? overrides.overdueOnly : overdueOnly,
      withDebtOnly: overrides.withDebtOnly !== undefined ? overrides.withDebtOnly : withDebtOnly,
      year: overrides.year !== undefined ? overrides.year : Number(year),
      month: overrides.month !== undefined ? overrides.month : Number(month),
    });
    const currentQuery = serializeRegisterFilters({
      q: filters.q,
      blockId: filters.blockId ?? "all",
      overdueOnly: filters.overdueOnly,
      withDebtOnly: filters.withDebtOnly,
      year: filters.year,
      month: filters.month,
    });

    if (nextQuery === currentQuery) {
      return;
    }

    startTransition(() => {
      router.push(`${pathname}?${nextQuery}`);
    });
  }

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === filters.q) {
      return;
    }
    const timer = window.setTimeout(() => {
      pushFilters({ q: trimmed });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, filters.q]);

  async function loadDetail(unitId: string, clearExisting: boolean) {
    setDetailUnitId(unitId);
    setDetailOpen(true);
    setDetailLoading(true);
    if (clearExisting) {
      setDetail(null);
    }
    try {
      const result = await getUnitDebtDetailAction(propertyId, unitId);
      setDetail(result);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openDetail(unitId: string) {
    await loadDetail(unitId, true);
  }

  async function refreshDetail(unitId: string) {
    await loadDetail(unitId, false);
  }

  function openPaymentTarget(target: PaymentTarget, amount: string) {
    setPaymentTarget(target);
    setPayAmount(amount);
    setPaymentDate(todayInputValue());
    setPaymentOpen(true);
  }

  function toggleCellSelection(
    row: PeriodRegisterRowDto,
    column: PeriodRegisterColumnDto,
    cell: PeriodRegisterCellDto,
  ) {
    if (!cell.lineId || !row.partyId || Number(cell.remaining) <= 0) {
      return;
    }

    const key = cellSelectionKey(row.unitId, cell.lineId);
    setSelectedCells((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      const existing = Object.values(current)[0];
      if (existing && (existing.unitId !== row.unitId || existing.partyId !== row.partyId)) {
        return {
          [key]: {
            lineId: cell.lineId!,
            remaining: cell.remaining,
            definitionName: column.name,
            unitId: row.unitId,
            partyId: row.partyId!,
            unitCode: row.unitCode,
            blockName: row.blockName,
            partyName: row.partyName,
          },
        };
      }

      return {
        ...current,
        [key]: {
          lineId: cell.lineId!,
          remaining: cell.remaining,
          definitionName: column.name,
          unitId: row.unitId,
          partyId: row.partyId!,
          unitCode: row.unitCode,
          blockName: row.blockName,
          partyName: row.partyName,
        },
      };
    });
  }

  function openBulkPayment() {
    const first = selectedCellList[0];
    if (!first) {
      return;
    }
    openPaymentTarget(
      {
        unitId: first.unitId,
        unitCode: first.unitCode,
        blockName: first.blockName,
        partyId: first.partyId,
        partyName: first.partyName,
        allocations: selectedCellList.map(({ lineId, remaining, definitionName }) => ({
          lineId,
          remaining,
          definitionName,
        })),
      },
      selectedTotal,
    );
  }

  function openRowPayment(row: Pick<PeriodRegisterRowDto, "unitId" | "unitCode" | "blockName" | "totalOpenDebt">) {
    if (!detailParty?.partyId) {
      return;
    }
    openPaymentTarget(
      {
        unitId: row.unitId,
        unitCode: row.unitCode,
        blockName: row.blockName,
        partyId: detailParty.partyId,
        partyName: detailParty.partyName,
        allocations: [],
      },
      row.totalOpenDebt,
    );
  }

  function exportHref(format: "csv" | "xlsx" | "pdf") {
    const query = serializeExportParams({
      q: filters.q,
      blockId: filters.blockId ?? "all",
      overdueOnly: filters.overdueOnly,
      withDebtOnly: filters.withDebtOnly,
      year: filters.year,
      month: filters.month,
      format,
    });
    return `/api/properties/${propertyId}/period-register/export?${query}`;
  }

  const paymentDrawerTitle =
    paymentTarget != null
      ? tDues("recordPaymentForUnit", {
          unit: paymentTarget.partyName
            ? `${paymentTarget.unitCode} — ${paymentTarget.partyName}`
            : debtUnitLabel(paymentTarget),
        })
      : tDues("recordPayment");

  const canRecordPayment = cashboxes.length > 0 && Boolean(paymentTarget?.partyId);
  const paymentAllocationsJson =
    paymentTarget && paymentTarget.allocations.length > 0
      ? JSON.stringify(
          paymentTarget.allocations.map((item) => ({
            dueAccrualLineId: item.lineId,
            amount: item.remaining,
          })),
        )
      : "";

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-0 flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={tDebt("searchPlaceholder")}
                className="bg-background pl-9"
                aria-label={tDebt("searchLabel")}
              />
            </div>
            <Select
              value={blockId}
              onValueChange={(value) => {
                setBlockId(value);
                pushFilters({ blockId: value });
              }}
            >
              <SelectTrigger className="w-full bg-background md:w-44">
                <SelectValue placeholder={tDebt("blockFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tDebt("allBlocks")}</SelectItem>
                {blocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={year}
              onValueChange={(value) => {
                const nextYear = Number(value);
                const nextMonths = registerPeriodFilterOptions(runs, {
                  year: nextYear,
                  month: Number(month),
                }).months;
                const nextMonth = nextMonths.includes(Number(month))
                  ? Number(month)
                  : (nextMonths[0] ?? Number(month));
                setYear(String(nextYear));
                setMonth(String(nextMonth));
                pushFilters({ year: nextYear, month: nextMonth });
              }}
            >
              <SelectTrigger className="w-full bg-background md:w-28" aria-label={t("year")}>
                <SelectValue placeholder={t("year")} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((optionYear) => (
                  <SelectItem key={optionYear} value={String(optionYear)}>
                    {optionYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={month}
              onValueChange={(value) => {
                setMonth(value);
                pushFilters({ month: Number(value) });
              }}
            >
              <SelectTrigger className="w-full bg-background md:w-36" aria-label={t("month")}>
                <SelectValue placeholder={t("month")} />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((optionMonth) => (
                  <SelectItem key={optionMonth} value={String(optionMonth)}>
                    {tDues(`monthNames.${optionMonth}` as "monthNames.1")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              className={cn("gap-2", !overdueOnly && "bg-background")}
              onClick={() => {
                const next = !overdueOnly;
                setOverdueOnly(next);
                pushFilters({ overdueOnly: next });
              }}
            >
              <Filter className="size-4" aria-hidden />
              {tDebt("overdueOnly")}
            </Button>
            <Button
              type="button"
              variant={withDebtOnly ? "default" : "outline"}
              size="sm"
              className={cn("gap-2", !withDebtOnly && "bg-background")}
              onClick={() => {
                const next = !withDebtOnly;
                setWithDebtOnly(next);
                pushFilters({ withDebtOnly: next });
              }}
            >
              <Filter className="size-4" aria-hidden />
              {t("withDebtOnly")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setBulkMode((value) => !value);
                setSelectedCells({});
              }}
            >
              {t("bulkMode")}
            </Button>
            {bulkMode && selectedCellList.length > 0 ? (
              <Button type="button" size="sm" onClick={openBulkPayment} disabled={cashboxes.length === 0}>
                {t("collectSelected", { count: selectedCellList.length })}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={exportHref("csv")}>
                <Download className="mr-2 size-4" aria-hidden />
                {t("exportCsv")}
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={exportHref("xlsx")}>{t("exportExcel")}</a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={exportHref("pdf")}>{t("exportPdf")}</a>
            </Button>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border bg-card">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[120px] bg-card">{t("columnUnit")}</TableHead>
                <TableHead className="sticky left-[120px] z-10 min-w-[140px] bg-card">{t("columnParty")}</TableHead>
                {registerPage.columns.map((column) => (
                  <TableHead key={column.id} className="min-w-[130px] whitespace-normal">
                    <div>{column.name}</div>
                    {column.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL &&
                    column.supplierLateFeeAllocationMode ? (
                      <div className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                        {t(`supplierLateFeeAllocationMode.${column.supplierLateFeeAllocationMode}`)}
                      </div>
                    ) : null}
                  </TableHead>
                ))}
                <TableHead className="min-w-[110px]">{t("columnPeriodRemaining")}</TableHead>
                <TableHead className="min-w-[110px]">{t("columnTotalOpen")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registerPage.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={registerPage.columns.length + 4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                registerPage.rows.map((row) => (
                  <TableRow
                    key={row.unitId}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => {
                      void openDetail(row.unitId);
                    }}
                  >
                    <TableCell className="sticky left-0 z-10 bg-card">
                      <button
                        type="button"
                        className="font-medium text-left hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDetail(row.unitId);
                        }}
                      >
                        {debtUnitLabel(row)}
                      </button>
                    </TableCell>
                    <TableCell className="sticky left-[120px] z-10 bg-card">
                      {row.partyName ?? "—"}
                    </TableCell>
                    {registerPage.columns.map((column) => {
                      const cell = row.cells[column.id];
                      if (!cell) {
                        return (
                          <TableCell key={column.id}>
                            <span className="text-muted-foreground">{t("cellNone")}</span>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={column.id}>
                          <RegisterCell
                            locale={locale}
                            cell={cell}
                            bulkMode={bulkMode}
                            selected={Boolean(
                              cell.lineId && selectedCells[cellSelectionKey(row.unitId, cell.lineId)],
                            )}
                            onToggleSelect={() => toggleCellSelection(row, column, cell)}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="font-medium tabular-nums">
                      {formatDebtMoney(row.periodRemaining, locale)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDebtMoney(row.totalOpenDebt, locale)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>

        <ServerPagination
          page={registerPage.page}
          pageSize={registerPage.pageSize}
          total={registerPage.total}
          basePath={`/admin/properties/${propertyId}/dues`}
          locale={locale}
          extraSearchParams={paginationParams}
          variant="saas"
        />
      </div>

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailUnitId(null);
            setDetail(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full !w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:!max-w-4xl"
        >
          <SheetHeader className="border-b px-4 py-4 pr-20 text-left">
            <SheetTitle>{tDebt("detailTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">{tDebt("detailLoading")}</p>
            ) : detail ? (
              <div className="space-y-6 pb-8">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{debtUnitLabel(detail.row)}</p>
                  <p className="text-sm text-muted-foreground">{detailParty?.partyName ?? "—"}</p>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatDebtMoney(detail.row.totalDebt, locale)}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">{tDebt("openLinesTitle")}</h3>
                  {detail.openLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tDebt("noOpenLines")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.openLines.map((line) => (
                        <li
                          key={line.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 pr-2 text-sm"
                        >
                          <span className="min-w-0 break-words">
                            {formatOpenDebtLineLabel(line)}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatDebtMoney(line.remaining, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail.statement.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">{tDebt("statementTitle")}</h3>
                    <div className="space-y-2 sm:hidden">
                      {detail.statement.map((line, index) => (
                        <div
                          key={`${line.kind}-${index}-mobile`}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <span className="min-w-0 break-words font-medium">{line.label}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatStatementDate(line.date, locale)}
                            </span>
                          </div>
                          <dl className="mt-3 grid grid-cols-3 gap-2">
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">{tPortal("statementDebit")}</dt>
                              <dd className="mt-1 break-words tabular-nums">
                                {line.debit !== "0" ? formatDebtMoney(line.debit, locale) : "—"}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">{tPortal("statementCredit")}</dt>
                              <dd className="mt-1 break-words tabular-nums">
                                {line.credit !== "0" ? formatDebtMoney(line.credit, locale) : "—"}
                              </dd>
                            </div>
                            <div className="min-w-0 text-right">
                              <dt className="text-xs text-muted-foreground">{tPortal("statementBalance")}</dt>
                              <dd className="mt-1 break-words tabular-nums">
                                {formatDebtMoney(line.balance, locale)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto rounded-md border sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tPortal("statementDate")}</TableHead>
                            <TableHead>{tPortal("statementLabel")}</TableHead>
                            <TableHead className="text-right">{tPortal("statementDebit")}</TableHead>
                            <TableHead className="text-right">{tPortal("statementCredit")}</TableHead>
                            <TableHead className="text-right">{tPortal("statementBalance")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.statement.map((line, index) => (
                            <TableRow key={`${line.kind}-${index}`}>
                              <TableCell className="whitespace-nowrap">
                                {formatStatementDate(line.date, locale)}
                              </TableCell>
                              <TableCell className="min-w-[14rem] max-w-[28rem] whitespace-normal break-words">
                                {line.label}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {line.debit !== "0" ? formatDebtMoney(line.debit, locale) : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {line.credit !== "0" ? formatDebtMoney(line.credit, locale) : "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {formatDebtMoney(line.balance, locale)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}

                <Button
                  type="button"
                  className="w-full"
                  disabled={!detailParty?.partyId || cashboxes.length === 0}
                  onClick={() =>
                    openRowPayment({
                      unitId: detail.row.unitId,
                      unitCode: detail.row.unitCode,
                      blockName: detail.row.blockName,
                      totalOpenDebt: detail.row.totalDebt,
                    })
                  }
                >
                  {tDebt("recordPayment")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tDebt("detailNotFound")}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {paymentTarget ? (
        <FormDrawer
          triggerLabel={tDebt("recordPayment")}
          title={paymentDrawerTitle}
          success={payState.success}
          disabled={!canRecordPayment}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          hideTrigger
        >
          <form action={payAction} className="grid gap-3">
            <input type="hidden" name="cashboxId" value={cashboxId} />
            <input type="hidden" name="partyId" value={paymentTarget.partyId} />
            <input type="hidden" name="unitId" value={paymentTarget.unitId} />
            {paymentAllocationsJson ? (
              <>
                <input type="hidden" name="allocationsJson" value={paymentAllocationsJson} />
                <input type="hidden" name="autoAllocate" value="off" />
              </>
            ) : (
              <input type="hidden" name="allowAdvance" value="on" />
            )}
            <div className="grid gap-1 text-sm">
              <p className="font-medium">{debtUnitLabel(paymentTarget)}</p>
              <p className="text-muted-foreground">{paymentTarget.partyName ?? "—"}</p>
              {paymentTarget.allocations.length > 0 ? (
                <ul className="space-y-1 text-muted-foreground">
                  {paymentTarget.allocations.map((item) => (
                    <li key={item.lineId}>
                      {item.definitionName}: {formatDebtMoney(item.remaining, locale)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-muted-foreground">
                {tDues("unitOpenDebt", { amount: formatDebtMoney(payAmount, locale) })}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{tDues("cashbox")}</Label>
              <Select value={cashboxId} onValueChange={setCashboxId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cashboxes.map((cashbox) => (
                    <SelectItem key={cashbox.id} value={cashbox.id}>
                      {cashbox.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-pay-amount">{tDues("amount")}</Label>
              <Input
                id="register-pay-amount"
                name="amount"
                required
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-pay-date">{t("paymentDate")}</Label>
              <Input
                id="register-pay-date"
                name="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="register-pay-doc">{tDues("documentNo")}</Label>
              <Input id="register-pay-doc" name="documentNo" />
            </div>
            {payState.success ? (
              <p className="text-xs text-muted-foreground">
                {payState.advanceAmount
                  ? tDues("paymentAdvanceSuccess", { amount: formatDebtMoney(payState.advanceAmount, locale) })
                  : tDues("paymentSuccess")}
              </p>
            ) : null}
            {payState.error ? (
              <p className="text-sm text-destructive">{tDues(`errors.${payState.error}` as "errors.AMOUNT_INVALID")}</p>
            ) : null}
            <Button type="submit" disabled={payPending || !canRecordPayment} className="w-full sm:w-auto">
              {tDues("recordPayment")}
            </Button>
          </form>
        </FormDrawer>
      ) : null}
    </>
  );
}
