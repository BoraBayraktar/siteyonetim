"use client";

import { DueAccrualStatus, DueCalculationMode, SupplierLateFeeAllocationMode } from "@siteyonetim/db";
import type {
  AccrualContextWarningsDto,
  AccrualRunCorrectionDto,
  DueAccrualRunDto,
  DueAccrualRunLineDto,
  DueDefinitionDto,
} from "@siteyonetim/finance-dues";
import type { UnitDto } from "@siteyonetim/property-core";
import type { PropertyMonthlyWorkflowDto } from "@siteyonetim/reporting-standard";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { generateAccrualAction, type DuesActionState } from "@/app/actions/dues";
import { AccrualContextAlerts } from "@/components/accrual-context-alerts";
import { AccrualFiltersBar } from "@/components/accrual-filters-bar";
import { AccrualRunDetail } from "@/components/accrual-run-detail";
import { EmptyStateAction } from "@/components/empty-state-action";
import { PropertyMonthlyWorkflowPanel } from "@/components/property-monthly-workflow-panel";
import { FormDrawer } from "@/components/form-drawer";
import { YearMonthFormFields } from "@/components/year-month-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AccrualFilters } from "@/lib/accrual-filters";
import { filterAccrualLines, filterAccrualRuns } from "@/lib/accrual-filters";
import { periodsFromAccrualRuns, withCurrentPeriod } from "@/lib/period-options";
import { isSupplierLateFeeDefinition, needsTotalBill } from "@/lib/dues-definition-form";
import { SUPPLIER_LATE_FEE_ALLOCATION_MODES } from "@/lib/supplier-late-fee";

const initial: DuesActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  definitions: DueDefinitionDto[];
  runs: DueAccrualRunDto[];
  runLinesByRunId: Record<string, DueAccrualRunLineDto[]>;
  runCorrectionsByRunId: Record<string, AccrualRunCorrectionDto>;
  accrualWarnings: AccrualContextWarningsDto;
  initialRunId?: string | null;
  filters: AccrualFilters;
  units: UnitDto[];
  monthlyWorkflow?: PropertyMonthlyWorkflowDto | null;
};

function DuesError({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}` as "errors.AMOUNT_INVALID")}</p>;
}

function unitsWithoutOccupancyCount(warnings: AccrualContextWarningsDto): number {
  const warning = warnings.warnings.find((item) => item.code === "UNITS_WITHOUT_OCCUPANCY");
  return warning?.count ?? 0;
}

export function DuesAccrualPanel({
  locale,
  propertyId,
  definitions,
  runs,
  runLinesByRunId,
  runCorrectionsByRunId,
  accrualWarnings,
  initialRunId,
  filters,
  units,
  monthlyWorkflow = null,
}: Props) {
  const t = useTranslations("dues");
  const tEmpty = useTranslations("emptyActions.accrualRuns");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = new Date();
  const occupancyGap = unitsWithoutOccupancyCount(accrualWarnings);
  const [genState, genAction, genPending] = useActionState(
    generateAccrualAction.bind(null, locale, propertyId),
    initial,
  );
  const aidatDefinitions = useMemo(
    () => definitions.filter((d) => !isSupplierLateFeeDefinition(d.calculationMode)),
    [definitions],
  );
  const supplierDefinitions = useMemo(
    () => definitions.filter((d) => isSupplierLateFeeDefinition(d.calculationMode)),
    [definitions],
  );
  const defaultDefinitionId =
    aidatDefinitions[0]?.id ?? definitions[0]?.id ?? "";
  const [definitionId, setDefinitionId] = useState(defaultDefinitionId);
  const selectedDef = definitions.find((d) => d.id === definitionId);
  const selectedIsSupplier = selectedDef ? isSupplierLateFeeDefinition(selectedDef.calculationMode) : false;
  const [supplierAllocationMode, setSupplierAllocationMode] = useState<SupplierLateFeeAllocationMode>(
    selectedDef?.supplierLateFeeAllocationMode ?? SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO,
  );

  useEffect(() => {
    if (selectedDef?.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL) {
      setSupplierAllocationMode(
        selectedDef.supplierLateFeeAllocationMode ?? SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO,
      );
    }
  }, [selectedDef]);

  const filteredRuns = useMemo(
    () => filterAccrualRuns(runs, filters, runLinesByRunId),
    [runs, filters, runLinesByRunId],
  );

  const generatePeriods = useMemo(
    () => withCurrentPeriod(periodsFromAccrualRuns(runs)),
    [runs],
  );

  const defaultRunId = useMemo(() => {
    if (initialRunId && filteredRuns.some((run) => run.id === initialRunId)) return initialRunId;
    return filteredRuns[0]?.id ?? "";
  }, [initialRunId, filteredRuns]);

  const [activeRunId, setActiveRunId] = useState(defaultRunId);

  useEffect(() => {
    setActiveRunId(defaultRunId);
  }, [defaultRunId]);

  function onRunChange(runId: string) {
    setActiveRunId(runId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "accrual");
    params.set("runId", runId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {monthlyWorkflow ? (
        <PropertyMonthlyWorkflowPanel
          locale={locale}
          propertyId={propertyId}
          workflow={monthlyWorkflow}
          compact
        />
      ) : null}
      <AccrualContextAlerts locale={locale} propertyId={propertyId} warnings={accrualWarnings} />
      <AccrualFiltersBar filters={filters} runs={runs} definitions={definitions} units={units} />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("accrualRuns")}</CardTitle>
          <FormDrawer
            triggerLabel={t("generateAccrual")}
            title={t("generateAccrual")}
            helpTopicKey="accrual"
            success={genState.success}
            disabled={definitions.length === 0 || !accrualWarnings.canGenerateAccrual}
          >
            <form action={genAction} className="grid gap-3">
              <input type="hidden" name="dueDefinitionId" value={definitionId} />
              {selectedDef?.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? (
                <input type="hidden" name="supplierLateFeeAllocationMode" value={supplierAllocationMode} />
              ) : null}
              <div className="grid gap-2">
                <Label>{t("definitionName")}</Label>
                <Select value={definitionId} onValueChange={setDefinitionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="…" />
                  </SelectTrigger>
                  <SelectContent>
                    {aidatDefinitions.length > 0 ? (
                      <>
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          {t("definitionGroupAidat")}
                        </p>
                        {aidatDefinitions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : null}
                    {aidatDefinitions.length > 0 && supplierDefinitions.length > 0 ? (
                      <Separator className="my-1" />
                    ) : null}
                    {supplierDefinitions.length > 0 ? (
                      <>
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          {t("definitionGroupSupplierLateFee")}
                        </p>
                        {supplierDefinitions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              {selectedIsSupplier ? (
                <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-medium">{t("wizard.supplierNotAidatTitle")}</p>
                  <p className="mt-1 text-xs">{t("accrualSupplierLateFeeHint")}</p>
                </div>
              ) : null}
              <YearMonthFormFields
                periods={generatePeriods}
                defaultYear={now.getFullYear()}
                defaultMonth={now.getMonth() + 1}
                yearLabel={t("year")}
                monthLabel={t("month")}
                yearId="accrual-gen-year"
                monthId="accrual-gen-month"
              />
              {selectedDef && needsTotalBill(selectedDef.calculationMode) ? (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="total-bill">{t("totalBillAmount")}</Label>
                    <AmountInput id="total-bill" name="totalBillAmount" required />
                  </div>
                  {selectedDef.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="supplier-allocation-mode">{t("supplierLateFeeAllocationModeLabel")}</Label>
                        <Select
                          value={supplierAllocationMode}
                          onValueChange={(value) =>
                            setSupplierAllocationMode(value as SupplierLateFeeAllocationMode)
                          }
                        >
                          <SelectTrigger id="supplier-allocation-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLIER_LATE_FEE_ALLOCATION_MODES.map((modeOption) => (
                              <SelectItem key={modeOption} value={modeOption}>
                                {t(`supplierLateFeeAllocationMode.${modeOption}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t("supplierLateFeeAllocationModeHint")}</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="supplier-reference">{t("supplierReference")}</Label>
                        <Input
                          id="supplier-reference"
                          name="supplierReference"
                          placeholder={t("supplierReferencePlaceholder")}
                        />
                      </div>
                    </>
                  ) : null}
                  {selectedDef.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="total-bill-consumption">{t("totalBillConsumptionM3")}</Label>
                        <Input id="total-bill-consumption" name="totalBillConsumptionM3" required />
                        <p className="text-xs text-muted-foreground">{t("totalBillConsumptionHint")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("meterAllocatedBillAccrualHint")}</p>
                    </>
                  ) : null}
                </div>
              ) : null}
              <DuesError code={genState.error} t={t} />
              <Button type="submit" disabled={genPending || definitions.length === 0} className="w-full sm:w-auto">
                {t("generateAccrual")}
              </Button>
            </form>
          </FormDrawer>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <EmptyStateAction
              message={tEmpty("message")}
              steps={[tEmpty("step1"), tEmpty("step2"), tEmpty("step3")]}
              actionLabel={tEmpty("action")}
              actionHref={`/${locale}/admin/properties/${propertyId}/dues?tab=definitions`}
            />
          ) : filteredRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("accrualRunsEmptyFiltered")}</p>
          ) : (
            <Tabs value={activeRunId} onValueChange={onRunChange} className="w-full">
              <div className="-mx-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap justify-start gap-1 rounded-none border-b bg-transparent p-0">
                  {filteredRuns.map((run) => (
                    <TabsTrigger
                      key={run.id}
                      value={run.id}
                      className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      <span className="mr-1.5 hidden max-w-[8rem] truncate sm:inline">{run.dueDefinitionName}</span>
                      <span className="whitespace-nowrap text-xs sm:text-sm">
                        {run.month}/{run.year}
                      </span>
                      {run.status === DueAccrualStatus.DRAFT ? (
                        <Badge variant="outline" className="ml-1.5 hidden px-1 py-0 text-[10px] sm:inline-flex">
                          {t("accrualStatusDraft")}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {filteredRuns.map((run) => (
                <TabsContent key={run.id} value={run.id} className="mt-4 focus-visible:outline-none">
                  <AccrualRunDetail
                    locale={locale}
                    propertyId={propertyId}
                    run={run}
                    lines={filterAccrualLines(runLinesByRunId[run.id] ?? [], filters.unitId)}
                    correction={runCorrectionsByRunId[run.id]}
                    unitsWithoutOccupancy={occupancyGap}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
