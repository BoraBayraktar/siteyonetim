"use client";

import type { StandardReportKind } from "@siteyonetim/reporting-standard";
import { isAnnualReportKind } from "@/lib/report-kinds";
import type {
  AnnualIncomeExpenseReport,
  CashboxSummaryReport,
  DebtAgingReport,
  DueAccrualSummaryReport,
  DueCollectionReport,
  ExpenseBreakdownReport,
  ReportExportDto,
  ReportQuarterScope,
} from "@siteyonetim/reporting-standard";
import type { BlockDto } from "@siteyonetim/property-core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { requestAsyncReportExportAction, type ReportExportActionState } from "@/app/actions/report-export";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { YearMonthFilterSelects } from "@/components/year-month-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildPeriodFilterOptions, type PeriodPoint } from "@/lib/period-options";
import { useEnumLabel } from "@/lib/use-enum-label";

const DEFAULT_REPORTS: StandardReportKind[] = [
  "DUE_ACCRUAL_SUMMARY",
  "DUE_COLLECTION",
  "EXPENSE_BREAKDOWN",
  "CASHBOX_SUMMARY",
  "DEBT_AGING",
  "BANK_RECONCILIATION",
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
];

type Props = {
  locale: string;
  propertyId: string;
  year: number;
  month: number;
  quarter: ReportQuarterScope;
  blockId: string | null;
  activeKind: StandardReportKind;
  blocks: BlockDto[];
  accrual: DueAccrualSummaryReport | null;
  collection: DueCollectionReport | null;
  expense: ExpenseBreakdownReport | null;
  cashbox: CashboxSummaryReport | null;
  aging: DebtAgingReport | null;
  annual: AnnualIncomeExpenseReport | null;
  recentExports: ReportExportDto[];
  periods: PeriodPoint[];
  readOnly?: boolean;
  reportKinds?: StandardReportKind[];
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export function ReportsPanel({
  locale,
  propertyId,
  year,
  month,
  quarter,
  blockId,
  activeKind,
  blocks,
  accrual,
  collection,
  expense,
  cashbox,
  aging,
  annual,
  recentExports,
  periods,
  readOnly = false,
  reportKinds = DEFAULT_REPORTS,
}: Props) {
  const t = useTranslations("reports");
  const labelEnum = useEnumLabel();
  const REPORTS = reportKinds;
  const annualActive = isAnnualReportKind(activeKind);
  const router = useRouter();
  const pathname = usePathname();
  const { years, months } = useMemo(
    () => buildPeriodFilterOptions(periods, { year, month }),
    [periods, year, month],
  );
  const [asyncState, asyncAction, asyncPending] = useActionState(
    requestAsyncReportExportAction.bind(null, locale, propertyId),
    {} as ReportExportActionState,
  );
  const [asyncFormat, setAsyncFormat] = useState("CSV");

  function applyFilters(next: {
    report?: StandardReportKind;
    year?: number;
    month?: number;
    quarter?: ReportQuarterScope;
    blockId?: string | null;
  }) {
    const params = new URLSearchParams();
    params.set("report", next.report ?? activeKind);
    params.set("year", String(next.year ?? year));
    params.set("month", String(next.month ?? month));
    if (annualActive || isAnnualReportKind(next.report ?? activeKind)) {
      params.set("quarter", next.quarter ?? quarter);
    }
    const nextBlockId = next.blockId !== undefined ? next.blockId : blockId;
    if (nextBlockId) {
      params.set("blockId", nextBlockId);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportHref(kind: StandardReportKind, format: "csv" | "xlsx" | "pdf" | "zip") {
    const exportMonth = isAnnualReportKind(kind) ? 1 : month;
    const params = new URLSearchParams({
      kind,
      propertyId,
      year: String(year),
      month: String(exportMonth),
      format,
    });
    if (blockId) params.set("blockId", blockId);
    if (isAnnualReportKind(kind) && quarter !== "ANNUAL") {
      params.set("quarter", quarter);
    }
    return `/api/reports/export?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <YearMonthFilterSelects
            years={years}
            months={months}
            year={year}
            month={month}
            onYearChange={(nextYear) => {
              const nextMonths = buildPeriodFilterOptions(periods, { year: nextYear, month }).months;
              applyFilters({ year: nextYear, month: nextMonths.includes(month) ? month : (nextMonths[0] ?? month) });
            }}
            onMonthChange={(nextMonth) => applyFilters({ month: nextMonth })}
            yearLabel={t("year")}
            monthLabel={t("month")}
            yearId="rep-year"
            monthId="rep-month"
            monthDisabled={annualActive}
          />
          {annualActive ? (
            <div className="grid gap-2">
              <Label>{t("quarter")}</Label>
              <Select value={quarter} onValueChange={(v) => applyFilters({ quarter: v as ReportQuarterScope })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ANNUAL", "Q1", "Q2", "Q3", "Q4"] as ReportQuarterScope[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`quarters.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {annualActive ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">{t("annualOnlyHint")}</p>
          ) : null}
          <div className="grid gap-2 sm:col-span-2">
            <Label>{t("block")}</Label>
            <Select
              value={blockId ?? "all"}
              onValueChange={(v) => applyFilters({ blockId: v === "all" ? null : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBlocks")}</SelectItem>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeKind} onValueChange={(v) => applyFilters({ report: v as StandardReportKind })}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {REPORTS.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {t(`kind.${kind}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORTS.map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t(`hint.${kind}`)}</p>
              <div className="flex flex-wrap items-center gap-2">
                {kind === "AUDIT_PACKAGE" ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={exportHref(kind, "zip")}>{t("exportZip")}</Link>
                    </Button>
                    <form action={asyncAction} className="inline-flex flex-wrap items-center gap-2">
                      <input type="hidden" name="reportKind" value={kind} />
                      <input type="hidden" name="year" value={year} />
                      <input type="hidden" name="month" value={1} />
                      <input type="hidden" name="blockId" value={blockId ?? ""} />
                      <input type="hidden" name="exportFormat" value="ZIP" />
                      <Button type="submit" variant="secondary" size="sm" disabled={asyncPending}>
                        {t("exportAsync")}
                      </Button>
                    </form>
                  </>
                ) : kind === "AUDITOR_REPORT_TEMPLATE" ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={exportHref(kind, "pdf")}>{t("exportPdf")}</Link>
                    </Button>
                    <form action={asyncAction} className="inline-flex flex-wrap items-center gap-2">
                      <input type="hidden" name="reportKind" value={kind} />
                      <input type="hidden" name="year" value={year} />
                      <input type="hidden" name="month" value={1} />
                      <input type="hidden" name="blockId" value={blockId ?? ""} />
                      <input type="hidden" name="exportFormat" value="PDF" />
                      <Button type="submit" variant="secondary" size="sm" disabled={asyncPending}>
                        {t("exportAsync")}
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={exportHref(kind, "csv")}>{t("exportCsv")}</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={exportHref(kind, "xlsx")}>{t("exportXlsx")}</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={exportHref(kind, "pdf")}>{t("exportPdf")}</Link>
                    </Button>
                    <form action={asyncAction} className="inline-flex flex-wrap items-center gap-2">
                      <input type="hidden" name="reportKind" value={kind} />
                      <input type="hidden" name="year" value={year} />
                      <input type="hidden" name="month" value={isAnnualReportKind(kind) ? 1 : month} />
                      <input type="hidden" name="blockId" value={blockId ?? ""} />
                      <input type="hidden" name="exportFormat" value={asyncFormat} />
                      <Label htmlFor={`async-format-${kind}`} className="sr-only">
                        {t("exportFormatLabel")}
                      </Label>
                      <Select value={asyncFormat} onValueChange={setAsyncFormat}>
                        <SelectTrigger id={`async-format-${kind}`} className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CSV">{t("exportFormat.CSV")}</SelectItem>
                          <SelectItem value="XLSX">{t("exportFormat.XLSX")}</SelectItem>
                          <SelectItem value="PDF">{t("exportFormat.PDF")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="submit" variant="secondary" size="sm" disabled={asyncPending}>
                        {t("exportAsync")}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
            {asyncState.success && activeKind === kind ? (
              <p className="text-sm text-muted-foreground">{t("exportAsyncQueued")}</p>
            ) : null}
            {asyncState.error ? <p className="text-sm text-destructive">{asyncState.error}</p> : null}
            {kind === "DUE_ACCRUAL_SUMMARY" && accrual ? (
              <ReportTable
                headers={[t("unit"), t("block"), t("definition"), t("lineKind"), t("amount")]}
                rows={accrual.rows.map((r) => [
                  r.unitCode,
                  r.blockName ?? "—",
                  r.definitionName,
                  labelEnum("DueAccrualLineKind", r.lineKind),
                  money(r.amount, locale),
                ])}
                footer={[t("total"), "", "", "", money(accrual.totalAccrued, locale)]}
              />
            ) : null}
            {kind === "DUE_COLLECTION" && collection ? (
              <ReportTable
                headers={[t("date"), t("party"), t("amount"), t("documentNo"), t("description")]}
                rows={collection.rows.map((r) => [
                  r.paymentDate,
                  r.partyName ?? "—",
                  money(r.amount, locale),
                  r.documentNo ?? "",
                  r.description ?? "",
                ])}
                footer={["", "", money(collection.totalCollected, locale), "", ""]}
              />
            ) : null}
            {kind === "EXPENSE_BREAKDOWN" && expense ? (
              <ReportTable
                headers={[t("category"), t("amount")]}
                rows={expense.rows.map((r) => [r.categoryName, money(r.amount, locale)])}
                footer={[t("total"), money(expense.totalExpense, locale)]}
              />
            ) : null}
            {kind === "CASHBOX_SUMMARY" && cashbox ? (
              <ReportTable
                headers={[t("cashbox"), t("balance")]}
                rows={cashbox.rows.map((r) => [r.name, money(r.balance, locale)])}
                footer={[t("total"), money(cashbox.totalBalance, locale)]}
              />
            ) : null}
            {kind === "DEBT_AGING" && aging ? (
              <ReportTable
                headers={[
                  t("unit"),
                  t("block"),
                  t("party"),
                  t("aging0"),
                  t("aging31"),
                  t("aging61"),
                  t("total"),
                ]}
                rows={aging.rows.map((r) => [
                  r.unitCode,
                  r.blockName ?? "—",
                  r.partyName ?? "—",
                  money(r.aging0To30, locale),
                  money(r.aging31To60, locale),
                  money(r.aging61Plus, locale),
                  money(r.totalDebt, locale),
                ])}
                footer={["", "", "", "", "", t("total"), money(aging.totalDebt, locale)]}
              />
            ) : null}
            {(kind === "ANNUAL_INCOME_EXPENSE" || kind === "AUDITOR_REPORT_TEMPLATE") && annual ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <SummaryCard label={t("dueCollectionTotal")} value={money(annual.dueCollectionTotal, locale)} />
                  <SummaryCard label={t("totalAccruedYear")} value={money(annual.totalAccruedYear, locale)} />
                  <SummaryCard
                    label={t("totalCollectedOnAccrualsYear")}
                    value={money(annual.totalCollectedOnAccrualsYear, locale)}
                  />
                  <SummaryCard
                    label={t("collectionRate")}
                    value={
                      annual.collectionRatePercent != null ? `%${annual.collectionRatePercent}` : t("emptyValue")
                    }
                  />
                  <SummaryCard label={t("openDebtTotal")} value={money(annual.openDebtTotal, locale)} />
                  <SummaryCard label={t("cashboxBalance")} value={money(annual.cashboxBalance, locale)} />
                  <SummaryCard label={t("netResult")} value={money(annual.netResult, locale)} />
                </div>
                <ReportTable
                  headers={[t("section"), t("item"), t("amount"), t("planned"), t("variance")]}
                  rows={annual.rows.map((r) => [
                    labelEnum("AnnualIncomeExpenseSection", r.section),
                    r.label,
                    money(r.amount, locale),
                    r.plannedAmount ? money(r.plannedAmount, locale) : "—",
                    r.variance ? money(r.variance, locale) : "—",
                  ])}
                  footer={[
                    labelEnum("AnnualIncomeExpenseSection", "SUMMARY"),
                    t("netResult"),
                    money(annual.netResult, locale),
                    annual.budgetPlannedTotal ? money(annual.budgetPlannedTotal, locale) : "—",
                    "",
                  ]}
                />
                {kind === "AUDITOR_REPORT_TEMPLATE" ? (
                  <p className="text-sm text-muted-foreground">{t("hint.AUDITOR_REPORT_TEMPLATE")}</p>
                ) : null}
              </div>
            ) : null}
            {kind === "AUDIT_PACKAGE" ? (
              <p className="text-sm text-muted-foreground">{t("hint.AUDIT_PACKAGE")}</p>
            ) : null}
            {readOnly ? null : null}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{t("exportQueueTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentExports.length === 0 ? (
            <p className="text-muted-foreground">{t("exportQueueEmpty")}</p>
          ) : (
            recentExports.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  <p className="font-medium">{t(`kind.${row.reportKind}`)}</p>
                  <p className="text-muted-foreground">
                    {isAnnualReportKind(row.reportKind) ? row.year : `${row.month}/${row.year}`} —{" "}
                    {t(`exportFormat.${row.format}`)} — {t(`exportStatus.${row.status}`)}
                  </p>
                </div>
                {row.status === "READY" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/reports/exports/${row.id}/download`}>{t("exportDownload")}</Link>
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  footer,
}: {
  headers: string[];
  rows: string[][];
  footer?: string[];
}) {
  const t = useTranslations("reports");
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
          {footer ? (
            <TableRow className="font-medium">
              {footer.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
