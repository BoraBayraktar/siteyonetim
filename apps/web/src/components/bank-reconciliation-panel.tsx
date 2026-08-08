"use client";

import { FinanceCategoryType, StaffMovementType } from "@siteyonetim/db";
import type { CashboxDto, FinanceCategoryDto } from "@siteyonetim/finance-core";
import type { BankStatementImportDto, BankStatementLineDto, BankReconciliationSummaryDto } from "@siteyonetim/finance-banking";
import type { StaffProfileDto } from "@siteyonetim/property-staff-finance";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  importBankStatementAction,
  ignoreBankLineFormAction,
  matchBankLineAsStaffMovementAction,
  runAutoMatchFormAction,
  type BankingActionState,
} from "@/app/actions/banking";

import { YearMonthFormFields } from "@/components/year-month-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PeriodPoint } from "@/lib/period-options";

type Props = {
  locale: string;
  propertyId: string;
  year: number;
  month: number;
  periods: PeriodPoint[];
  cashboxes: CashboxDto[];
  imports: BankStatementImportDto[];
  unmatchedLines: BankStatementLineDto[];
  unmatchedTotal: number;
  bankReconciliation: BankReconciliationSummaryDto | null;
  categories: FinanceCategoryDto[];
  staffProfiles: StaffProfileDto[];
  readOnly?: boolean;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function formatDate(value: Date | string, locale: string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");
}

export function BankReconciliationPanel({
  locale,
  propertyId,
  year,
  month,
  periods,
  cashboxes,
  imports,
  unmatchedLines,
  unmatchedTotal,
  bankReconciliation,
  categories,
  staffProfiles,
  readOnly = false,
}: Props) {
  const t = useTranslations("banking");
  const tReports = useTranslations("reports");
  const [cashboxId, setCashboxId] = useState("");
  const [importState, importAction, importPending] = useActionState(
    importBankStatementAction.bind(null, locale, propertyId),
    {} as BankingActionState,
  );
  const [, rematchAction] = useActionState(
    runAutoMatchFormAction.bind(null, locale, propertyId),
    {} as BankingActionState,
  );
  const [, ignoreAction] = useActionState(
    ignoreBankLineFormAction.bind(null, locale, propertyId),
    {} as BankingActionState,
  );
  const expenseCategories = categories.filter((category) => category.type === FinanceCategoryType.EXPENSE);

  return (
    <div className="space-y-6">
      {!readOnly ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("importTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{t("importHint")}</p>
            <form action={importAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="bank-cashbox">{tReports("cashbox")}</Label>
                <Select value={cashboxId} onValueChange={setCashboxId} required>
                  <SelectTrigger id="bank-cashbox">
                    <SelectValue placeholder={t("selectCashbox")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cashboxes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="cashboxId" value={cashboxId} />
              </div>
              <YearMonthFormFields
                periods={periods}
                defaultYear={year}
                defaultMonth={month}
                yearLabel={tReports("year")}
                monthLabel={tReports("month")}
                yearId="bank-year"
                monthId="bank-month"
              />
              <div className="grid gap-2 sm:col-span-2 lg:col-span-4">
                <Label htmlFor="bank-csv">{t("csvFile")}</Label>
                <Input id="bank-csv" name="csvFile" type="file" accept=".csv,text/csv" required />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={importPending || cashboxes.length === 0 || !cashboxId}>
                  {t("importSubmit")}
                </Button>
              </div>
            </form>
            {importState.success ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("importSuccess", { matched: importState.matched ?? 0 })}
              </p>
            ) : null}
            {importState.error ? (
              <p className="mt-3 text-sm text-destructive">{t(`errors.${importState.error}` as "errors.BANK_CSV_EMPTY")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("importsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("importsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tReports("date")}</TableHead>
                  <TableHead>{tReports("cashbox")}</TableHead>
                  <TableHead>{t("fileName")}</TableHead>
                  <TableHead>{t("importSource")}</TableHead>
                  <TableHead>{t("lineCount")}</TableHead>
                  <TableHead>{t("matchedCount")}</TableHead>
                  {!readOnly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.importedAt, locale)}</TableCell>
                    <TableCell>{row.cashboxName}</TableCell>
                    <TableCell>{row.fileName}</TableCell>
                    <TableCell>{t(`importSourceLabel.${row.source}` as "importSourceLabel.MANUAL_CSV")}</TableCell>
                    <TableCell>{row.lineCount}</TableCell>
                    <TableCell>{row.matchedCount}</TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <form action={rematchAction}>
                          <input type="hidden" name="importId" value={row.id} />
                          <Button type="submit" variant="outline" size="sm">
                            {t("rematch")}
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("unmatchedTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("unmatchedSubtitle", { count: unmatchedTotal })}
          </p>
          {unmatchedLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("unmatchedEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tReports("date")}</TableHead>
                  <TableHead>{tReports("cashbox")}</TableHead>
                  <TableHead>{tReports("amount")}</TableHead>
                  <TableHead>{tReports("description")}</TableHead>
                  {!readOnly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmatchedLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{formatDate(line.lineDate, locale)}</TableCell>
                    <TableCell>{line.cashboxName}</TableCell>
                    <TableCell>{money(line.amount, locale)}</TableCell>
                    <TableCell>{line.description ?? "—"}</TableCell>
                    {!readOnly ? (
                      <TableCell className="min-w-[360px]">
                        <div className="flex flex-col gap-2">
                          <StaffBankMatchForm
                            locale={locale}
                            propertyId={propertyId}
                            lineId={line.id}
                            staffProfiles={staffProfiles}
                            categories={expenseCategories}
                          />
                          <form action={ignoreAction}>
                            <input type="hidden" name="lineId" value={line.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              {t("ignoreLine")}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {bankReconciliation ? (
        <Card>
          <CardHeader>
            <CardTitle>{tReports("kind.BANK_RECONCILIATION")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryItem label={t("summaryTotal")} value={String(bankReconciliation.totalLines)} />
              <SummaryItem label={t("summaryMatched")} value={String(bankReconciliation.matchedLines)} />
              <SummaryItem label={t("summaryUnmatched")} value={String(bankReconciliation.unmatchedLines)} />
              <SummaryItem label={t("summaryIgnored")} value={String(bankReconciliation.ignoredLines)} />
              <SummaryItem
                label={t("summaryUnmatchedAmount")}
                value={money(bankReconciliation.unmatchedAmountTotal, locale)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function StaffBankMatchForm({
  locale,
  propertyId,
  lineId,
  staffProfiles,
  categories,
}: {
  locale: string;
  propertyId: string;
  lineId: string;
  staffProfiles: StaffProfileDto[];
  categories: FinanceCategoryDto[];
}) {
  const t = useTranslations("banking");
  const [state, action, pending] = useActionState(
    matchBankLineAsStaffMovementAction.bind(null, locale, propertyId),
    {} as BankingActionState,
  );
  const [staffProfileId, setStaffProfileId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [movementType, setMovementType] = useState<StaffMovementType>(StaffMovementType.PAYMENT);
  const disabled = pending || !staffProfileId || !categoryId || staffProfiles.length === 0 || categories.length === 0;

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="staffProfileId" value={staffProfileId} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="movementType" value={movementType} />
      <Select value={staffProfileId} onValueChange={setStaffProfileId}>
        <SelectTrigger>
          <SelectValue placeholder={t("selectStaff")} />
        </SelectTrigger>
        <SelectContent>
          {staffProfiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              {profile.partyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger>
          <SelectValue placeholder={t("selectExpenseCategory")} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Select value={movementType} onValueChange={(value) => setMovementType(value as StaffMovementType)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={StaffMovementType.PAYMENT}>{t("staffPayment")}</SelectItem>
            <SelectItem value={StaffMovementType.ADVANCE}>{t("staffAdvance")}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" size="sm" disabled={disabled}>
          {t("matchStaff")}
        </Button>
      </div>
      {state.error ? (
        <p className="text-xs text-destructive sm:col-span-3">
          {t(`errors.${state.error}` as "errors.LINE_NOT_FOUND")}
        </p>
      ) : null}
    </form>
  );
}
