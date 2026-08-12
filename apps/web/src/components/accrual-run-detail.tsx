"use client";

import { DueAccrualStatus, DueCalculationMode } from "@siteyonetim/db";
import type { AccrualRunCorrectionDto, DueAccrualRunDto, DueAccrualRunLineDto } from "@siteyonetim/finance-dues";
import { needsConsumptionRecalculate } from "@siteyonetim/finance-dues/accrual-context";
import { groupMissingUnitsByPrimaryReason } from "@siteyonetim/finance-dues/accrual-missing-units";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import {
  postAccrualAction,
  recalculateAccrualAction,
  supplementPostedAccrualAction,
  voidPostedAccrualAction,
  type DuesActionState,
} from "@/app/actions/dues";
import { FieldHelp } from "@/components/field-help";
import { FormDrawer } from "@/components/form-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { definitionSummary, needsMeterKind } from "@/lib/dues-definition-form";

const initial: DuesActionState = {};
const LINE_PAGE_SIZE = 15;

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function DuesError({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}` as "errors.AMOUNT_INVALID")}</p>;
}

function formatAccrualConsumption(line: DueAccrualRunLineDto, t: ReturnType<typeof useTranslations>): string {
  if (line.meterConsumption != null) return line.meterConsumption;
  if (line.meterIndexCurrent != null && line.meterIndexPrevious == null) {
    return t("consumptionNeedsPreviousMonth");
  }
  return t("consumptionNone");
}

function sumLineConsumptions(lines: DueAccrualRunLineDto[]): string | null {
  const total = lines.reduce(
    (sum, line) => sum + (line.meterConsumption != null ? Number(line.meterConsumption) : 0),
    0,
  );
  if (total <= 0) return null;
  return String(total);
}

function AccrualLinesTable({
  lines,
  showConsumption,
  locale,
  t,
}: {
  lines: DueAccrualRunLineDto[];
  showConsumption: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(lines.length / LINE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageLines = useMemo(() => {
    const start = (safePage - 1) * LINE_PAGE_SIZE;
    return lines.slice(start, start + LINE_PAGE_SIZE);
  }, [lines, safePage]);

  useEffect(() => {
    setPage(1);
  }, [lines.length]);

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("accrualLinesEmpty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("unit")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("party")}</TableHead>
              {showConsumption ? <TableHead>{t("meterConsumptionCol")}</TableHead> : null}
              <TableHead className="text-right">{t("amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageLines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <div className="font-medium">{line.unitCode}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{line.partyName ?? "—"}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{line.partyName ?? "—"}</TableCell>
                {showConsumption ? <TableCell>{formatAccrualConsumption(line, t)}</TableCell> : null}
                <TableCell className="text-right tabular-nums">{money(line.amount, locale)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {t("accrualLinesPage", {
              from: (safePage - 1) * LINE_PAGE_SIZE + 1,
              to: Math.min(safePage * LINE_PAGE_SIZE, lines.length),
              total: lines.length,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("accrualLinesPrev")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {t("accrualLinesNext")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PostAccrualDialog({
  locale,
  propertyId,
  run,
  correction,
  unitsWithoutOccupancy,
  t,
}: {
  locale: string;
  propertyId: string;
  run: DueAccrualRunDto;
  correction?: AccrualRunCorrectionDto;
  unitsWithoutOccupancy: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startPost] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const handleConfirm = () => {
    startPost(async () => {
      const result = await postAccrualAction(locale, propertyId, run.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      window.location.reload();
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm">{t("postAccrual")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("postAccrualConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t("postAccrualConfirmSummary", { count: run.lineCount, total: money(run.totalAmount, locale) })}</p>
              <p>{t("postAccrualConfirmIrreversible")}</p>
              {unitsWithoutOccupancy > 0 ? (
                <p className="text-amber-700 dark:text-amber-400">
                  {t("postAccrualConfirmOccupancyWarning", { count: unitsWithoutOccupancy })}
                </p>
              ) : null}
              {correction && correction.missingUnitCount > 0 ? (
                <p className="font-medium text-destructive">
                  {t("postAccrualConfirmIncompleteBlocked", { count: correction.missingUnitCount })}
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <DuesError code={error} t={t} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("postAccrualConfirmCancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={pending || correction?.canPost === false}>
            {t("postAccrualConfirmAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function VoidPostedAccrualDialog({
  locale,
  propertyId,
  run,
  t,
}: {
  locale: string;
  propertyId: string;
  run: DueAccrualRunDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startVoid] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("voidPostedAccrual")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("voidPostedAccrualTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("voidPostedAccrualHint")}</AlertDialogDescription>
        </AlertDialogHeader>
        <DuesError code={error} t={t} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("postAccrualConfirmCancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startVoid(async () => {
                const result = await voidPostedAccrualAction(locale, propertyId, run.id);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                window.location.reload();
              })
            }
            disabled={pending}
          >
            {t("voidPostedAccrualConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SupplementPostedAccrualDialog({
  locale,
  propertyId,
  run,
  correction,
  t,
}: {
  locale: string;
  propertyId: string;
  run: DueAccrualRunDto;
  correction: AccrualRunCorrectionDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startSupplement] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(undefined); }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">{t("supplementPostedAccrual")}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("supplementPostedAccrualTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("supplementPostedAccrualHint", { count: correction.missingUnitCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <DuesError code={error} t={t} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("postAccrualConfirmCancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startSupplement(async () => {
                const result = await supplementPostedAccrualAction(locale, propertyId, run.id);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                window.location.reload();
              })
            }
            disabled={pending}
          >
            {t("supplementPostedAccrualConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RecalculateAccrualDrawer({
  locale,
  propertyId,
  run,
  lines,
  defaultTotalBill,
  t,
}: {
  locale: string;
  propertyId: string;
  run: DueAccrualRunDto;
  lines: DueAccrualRunLineDto[];
  defaultTotalBill: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    recalculateAccrualAction.bind(null, locale, propertyId, run.id),
    initial,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <FormDrawer
      mode="edit"
      triggerLabel={t("recalculateAccrual")}
      title={t("recalculateAccrualTitle", { period: `${run.month}/${run.year}` })}
      helpTopicKey="accrual"
      success={state.success}
    >
      <form action={action} className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t("recalculateAccrualHint")}</p>
        <div className="grid gap-2">
          <Label htmlFor={`recalc-total-${run.id}`}>{t("totalBillAmount")}</Label>
          <AmountInput id={`recalc-total-${run.id}`} name="totalBillAmount" defaultValue={defaultTotalBill} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`recalc-consumption-${run.id}`}>{t("totalBillConsumptionM3")}</Label>
          <Input
            id={`recalc-consumption-${run.id}`}
            name="totalBillConsumptionM3"
            defaultValue={sumLineConsumptions(lines) ?? ""}
            required
          />
        </div>
        <DuesError code={state.error} t={t} />
        <Button type="submit" disabled={pending}>{t("recalculateAccrual")}</Button>
      </form>
    </FormDrawer>
  );
}

function formatAccrualPeriod(month: number, year: number): string {
  return `${month}/${year}`;
}

function AccrualMissingUnitsAlert({
  correction,
  run,
  locale,
  propertyId,
  t,
}: {
  correction: AccrualRunCorrectionDto;
  run: DueAccrualRunDto;
  locale: string;
  propertyId: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const period = formatAccrualPeriod(run.month, run.year);
  const groups = groupMissingUnitsByPrimaryReason(correction.missingUnits);
  const hasMeterIssue = groups.some((group) =>
    ["NO_METER", "NO_METER_READING", "MISSING_PREVIOUS_METER_INDEX"].includes(group.reason),
  );
  const hasOccupancyIssue = groups.some((group) => group.reason === "NO_OCCUPANCY");
  const base = `/${locale}/admin/properties/${propertyId}`;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
      <p className="font-medium">
        {t("postedAccrualIncompleteHint", { count: correction.missingUnitCount })}
      </p>
      {run.status === DueAccrualStatus.DRAFT ? (
        <p className="mt-1 text-amber-700/90 dark:text-amber-400/90">{t("draftAccrualIncompleteActionHint")}</p>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {groups.map((group) => (
          <li key={group.reason}>
            <span className="font-medium">
              {t(`missingUnitReasons.${group.reason}`, { period })}
            </span>
            {": "}
            <span>{group.unitCodes.join(", ")}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {hasMeterIssue ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${base}/dues?tab=meters`}>{t("missingUnitActions.openMeters")}</Link>
          </Button>
        ) : null}
        {hasOccupancyIssue ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${base}?tab=units`}>{t("missingUnitActions.assignParties")}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AccrualRunDetail({
  locale,
  propertyId,
  run,
  lines,
  correction,
  unitsWithoutOccupancy,
}: {
  locale: string;
  propertyId: string;
  run: DueAccrualRunDto;
  lines: DueAccrualRunLineDto[];
  correction?: AccrualRunCorrectionDto;
  unitsWithoutOccupancy: number;
}) {
  const t = useTranslations("dues");
  const tHelp = useTranslations("help");
  const showConsumption = needsMeterKind(run.calculationMode);
  const linesWithConsumption = lines.filter((line) => line.meterConsumption != null).length;
  const linesMissingPreviousIndex = lines.filter(
    (line) => line.meterIndexCurrent != null && line.meterIndexPrevious == null,
  ).length;
  const meterRunMismatch =
    run.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL &&
    lines.length > 0 &&
    linesWithConsumption > 0 &&
    linesWithConsumption < lines.length;
  const consumptionAmountMismatch = needsConsumptionRecalculate(run, lines);
  const totalConsumptionM3 = sumLineConsumptions(lines);
  const impliedRatePerM3 =
    totalConsumptionM3 && Number(totalConsumptionM3) > 0
      ? Number(run.totalAmount) / Number(totalConsumptionM3)
      : null;

  const statusBadge =
    run.status === DueAccrualStatus.DRAFT ? (
      <Badge variant="outline">{t("accrualStatusDraft")}</Badge>
    ) : (
      <Badge variant="secondary">{t("posted")}</Badge>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{run.dueDefinitionName}</h3>
            {statusBadge}
            <FieldHelp
              label={run.status === DueAccrualStatus.DRAFT ? t("accrualStatusDraft") : t("posted")}
              content={
                run.status === DueAccrualStatus.DRAFT ? tHelp("draftAccrual") : tHelp("postAccrual")
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("accrualRunPeriod", { period: `${run.month}/${run.year}` })} · {money(run.totalAmount, locale)} ·{" "}
            {run.lineCount} {t("lines")}
          </p>
          <p className="text-xs text-muted-foreground">
            {definitionSummary(
              {
                calculationMode: run.calculationMode,
                fixedAmount: null,
                ratePerM2: null,
                meterKind: run.meterKind,
                supplierLateFeeAllocationMode: run.supplierLateFeeAllocationMode,
              },
              t,
            )}
          </p>
          {totalConsumptionM3 ? (
            <p className="text-xs text-muted-foreground">
              {t("meterRunConsumptionSummary", {
                totalM3: totalConsumptionM3,
                rate: impliedRatePerM3?.toLocaleString(locale, { maximumFractionDigits: 2 }) ?? "—",
              })}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {consumptionAmountMismatch ? (
            <RecalculateAccrualDrawer
              locale={locale}
              propertyId={propertyId}
              run={run}
              lines={lines}
              defaultTotalBill={run.totalAmount}
              t={t}
            />
          ) : null}
          {run.status === DueAccrualStatus.DRAFT ? (
            <PostAccrualDialog
              locale={locale}
              propertyId={propertyId}
              run={run}
              correction={correction}
              unitsWithoutOccupancy={unitsWithoutOccupancy}
              t={t}
            />
          ) : run.status === DueAccrualStatus.POSTED ? (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {correction?.canSupplement ? (
                <SupplementPostedAccrualDialog
                  locale={locale}
                  propertyId={propertyId}
                  run={run}
                  correction={correction}
                  t={t}
                />
              ) : null}
              {correction?.canVoid ? (
                <VoidPostedAccrualDialog locale={locale} propertyId={propertyId} run={run} t={t} />
              ) : null}
              <Button variant="link" size="sm" className="h-auto justify-end p-0 text-xs" asChild>
                <Link href={`/${locale}/admin/properties/${propertyId}/dues?tab=lateFee`}>
                  {t("lateFeeApplyOpenTab")}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {run.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL && run.supplierLateFeeAllocationMode ? (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium">{t("supplierLateFeeRunTitle")}</p>
          <p>
            {t(`supplierLateFeeAllocationMode.${run.supplierLateFeeAllocationMode}`)}
            {run.supplierReference ? ` · ${run.supplierReference}` : ""}
          </p>
        </div>
      ) : null}

      {correction?.missingUnits.length ? (
        <AccrualMissingUnitsAlert
          correction={correction}
          run={run}
          locale={locale}
          propertyId={propertyId}
          t={t}
        />
      ) : correction?.missingUnitCount ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t("postedAccrualIncompleteHint", { count: correction.missingUnitCount })}
          {run.status === DueAccrualStatus.DRAFT ? ` ${t("draftAccrualIncompleteActionHint")}` : ""}
        </p>
      ) : null}
      {correction && !correction.canVoid && correction.hasPayments ? (
        <p className="text-sm text-muted-foreground">{t("voidBlockedHasPayments")}</p>
      ) : null}
      {correction && !correction.canVoid && correction.hasLateFees ? (
        <p className="text-sm text-muted-foreground">{t("voidBlockedHasLateFees")}</p>
      ) : null}
      {consumptionAmountMismatch ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">{t("meterAccrualAmountMismatchHint")}</p>
      ) : null}
      {meterRunMismatch ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">{t("meterAccrualMismatchHint")}</p>
      ) : null}
      {showConsumption && linesMissingPreviousIndex > 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          {t("consumptionMissingPreviousMonthHint", {
            count: linesMissingPreviousIndex,
            period: `${run.month}/${run.year}`,
            previousPeriod: run.month === 1 ? `12/${run.year - 1}` : `${run.month - 1}/${run.year}`,
          })}
        </p>
      ) : null}

      <AccrualLinesTable lines={lines} showConsumption={showConsumption} locale={locale} t={t} />
    </div>
  );
}
