"use client";

import { DueCalculationMode, MeterKind, SupplierLateFeeAllocationMode } from "@siteyonetim/db";
import type { DueDefinitionDto } from "@siteyonetim/finance-dues";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createDueDefinitionAction,
  updateDueDefinitionAction,
  type DuesActionState,
} from "@/app/actions/dues";
import { FieldHelp, LabelWithHelp } from "@/components/field-help";
import { LateFeeDecisionGuide } from "@/components/late-fee-decision-guide";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AIDAT_CALCULATION_MODES,
  DEFAULT_METER_KIND,
  definitionSummary,
  isSupplierLateFeeDefinition,
  modeDescription,
  modeLabel,
  needsMeterKind,
} from "@/lib/dues-definition-form";
import { SUPPLIER_LATE_FEE_ALLOCATION_MODES } from "@/lib/supplier-late-fee";
import { cn } from "@/lib/utils";

export type DueDefinitionWizardVariant = "aidat" | "supplier";

type WizardProps = {
  mode: "insert" | "edit";
  locale: string;
  propertyId: string;
  definition?: DueDefinitionDto;
  /** Insert: which flow to open. Edit: inferred from definition when omitted. */
  variant?: DueDefinitionWizardVariant;
  triggerLabel?: string;
  defaultCalculationMode?: DueCalculationMode;
};

function DuesError({ code, t }: { code?: string; t: ReturnType<typeof useTranslations<"dues">> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}` as "errors.AMOUNT_INVALID")}</p>;
}

function StepIndicator({ step, t }: { step: number; t: ReturnType<typeof useTranslations<"dues">> }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {t("wizard.stepIndicator", { step, total: 3 })}
    </p>
  );
}

function SupplierNotAidatBanner({ t }: { t: ReturnType<typeof useTranslations<"dues">> }) {
  return (
    <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
      <p className="font-medium">{t("wizard.supplierNotAidatTitle")}</p>
      <p className="mt-1 text-xs">{t("wizard.supplierNotAidatDesc")}</p>
    </div>
  );
}

export function DueDefinitionWizard({
  mode,
  locale,
  propertyId,
  definition,
  variant,
  triggerLabel,
  defaultCalculationMode = DueCalculationMode.FIXED,
}: WizardProps) {
  const t = useTranslations("dues");
  const tCommon = useTranslations("common");
  const tHelp = useTranslations("help");
  const tPh = useTranslations("placeholders");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [state, formAction, pending] = useActionState(
    mode === "edit" && definition
      ? updateDueDefinitionAction.bind(null, locale, propertyId, definition.id)
      : createDueDefinitionAction.bind(null, locale, propertyId),
    {} as DuesActionState,
  );

  const effectiveVariant: DueDefinitionWizardVariant = useMemo(() => {
    if (variant) return variant;
    if (definition && isSupplierLateFeeDefinition(definition.calculationMode)) return "supplier";
    return "aidat";
  }, [variant, definition]);

  const isSupplierWizard = effectiveVariant === "supplier";

  const [name, setName] = useState(definition?.name ?? "");
  const [calculationMode, setCalculationMode] = useState<DueCalculationMode>(
    definition?.calculationMode ?? defaultCalculationMode,
  );
  const [fixedAmount, setFixedAmount] = useState(definition?.fixedAmount ?? "");
  const [ratePerM2, setRatePerM2] = useState(definition?.ratePerM2 ?? "");
  const [meterKind, setMeterKind] = useState<MeterKind>(definition?.meterKind ?? DEFAULT_METER_KIND);
  const [autoAccrualMonthly, setAutoAccrualMonthly] = useState(definition?.autoAccrualMonthly ?? false);
  const [supplierLateFeeAllocationMode, setSupplierLateFeeAllocationMode] =
    useState<SupplierLateFeeAllocationMode>(
      definition?.supplierLateFeeAllocationMode ?? SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO,
    );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setStep(1);
    }
  }, [state.success]);

  useEffect(() => {
    if (!open) return;
    setName(definition?.name ?? "");
    setFixedAmount(definition?.fixedAmount ?? "");
    setRatePerM2(definition?.ratePerM2 ?? "");
    setMeterKind(definition?.meterKind ?? DEFAULT_METER_KIND);
    setSupplierLateFeeAllocationMode(
      definition?.supplierLateFeeAllocationMode ?? SupplierLateFeeAllocationMode.DELINQUENT_BY_DEBT_RATIO,
    );
    if (isSupplierWizard) {
      setCalculationMode(DueCalculationMode.SUPPLIER_LATE_FEE_BILL);
      setAutoAccrualMonthly(false);
    } else {
      setCalculationMode(definition?.calculationMode ?? defaultCalculationMode);
      setAutoAccrualMonthly(definition?.autoAccrualMonthly ?? false);
    }
    setStep(1);
  }, [open, definition, isSupplierWizard, defaultCalculationMode]);

  const defaultTriggerLabel = isSupplierWizard
    ? mode === "edit"
      ? tCommon("edit")
      : t("addSupplierLateFeeDefinition")
    : mode === "edit"
      ? tCommon("edit")
      : t("addDefinition");

  const label = triggerLabel ?? defaultTriggerLabel;
  const title = isSupplierWizard
    ? mode === "edit"
      ? t("editSupplierLateFeeDefinition")
      : t("addSupplierLateFeeDefinition")
    : mode === "edit"
      ? t("editDefinition")
      : t("addDefinition");

  const reviewDefinition: Pick<
    DueDefinitionDto,
    "calculationMode" | "fixedAmount" | "ratePerM2" | "meterKind" | "supplierLateFeeAllocationMode"
  > = {
    calculationMode,
    fixedAmount: fixedAmount || null,
    ratePerM2: ratePerM2 || null,
    meterKind: needsMeterKind(calculationMode) ? meterKind : null,
    supplierLateFeeAllocationMode:
      calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? supplierLateFeeAllocationMode : null,
  };

  function canGoNext(): boolean {
    if (step === 1) {
      return name.trim().length > 0;
    }
    if (step === 2) {
      if (calculationMode === DueCalculationMode.FIXED || calculationMode === DueCalculationMode.SHARE_RATIO) {
        return fixedAmount.trim().length > 0;
      }
      if (calculationMode === DueCalculationMode.AREA_M2 || calculationMode === DueCalculationMode.METER_CONSUMPTION) {
        return ratePerM2.trim().length > 0;
      }
      if (calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL) {
        return Boolean(supplierLateFeeAllocationMode);
      }
      return true;
    }
    return true;
  }

  let stepContent: ReactNode = null;

  if (step === 1) {
    stepContent = (
      <div className="grid gap-4">
        <StepIndicator step={1} t={t} />
        {isSupplierWizard ? <SupplierNotAidatBanner t={t} /> : (
          <LateFeeDecisionGuide locale={locale} propertyId={propertyId} className="py-2 text-xs" />
        )}
        <div className="grid gap-2">
          <Label htmlFor="wizard-def-name">{t("definitionName")}</Label>
          <Input
            id="wizard-def-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isSupplierWizard ? t("wizard.supplierNamePlaceholder") : tPh("definitionName")}
            required
          />
        </div>
        {isSupplierWizard ? (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">{modeLabel(DueCalculationMode.SUPPLIER_LATE_FEE_BILL, t)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {modeDescription(DueCalculationMode.SUPPLIER_LATE_FEE_BILL, t)}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <div className="flex items-center gap-1">
                <Label>{t("wizard.chooseMode")}</Label>
                <FieldHelp label={t("wizard.chooseMode")} content={tHelp("calculationMode")} />
              </div>
              <div className="grid gap-2">
                {AIDAT_CALCULATION_MODES.map((modeOption) => (
                  <button
                    key={modeOption}
                    type="button"
                    onClick={() => setCalculationMode(modeOption)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                      calculationMode === modeOption && "border-primary bg-accent",
                    )}
                  >
                    <p className="text-sm font-medium">{modeLabel(modeOption, t)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{modeDescription(modeOption, t)}</p>
                  </button>
                ))}
              </div>
            </div>
            <p className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {t("wizard.aidatLateFeeHint")}
            </p>
          </>
        )}
      </div>
    );
  } else if (step === 2) {
    stepContent = (
      <div className="grid gap-4">
        <StepIndicator step={2} t={t} />
        {isSupplierWizard ? <SupplierNotAidatBanner t={t} /> : null}
        <p className="text-sm text-muted-foreground">
          {modeLabel(calculationMode, t)} — {modeDescription(calculationMode, t)}
        </p>
        {calculationMode === DueCalculationMode.FIXED || calculationMode === DueCalculationMode.SHARE_RATIO ? (
          <div className="grid gap-2">
            <LabelWithHelp
              htmlFor="wizard-fixed-amount"
              label={
                calculationMode === DueCalculationMode.SHARE_RATIO ? t("sharePoolAmount") : t("fixedAmount")
              }
              help={
                calculationMode === DueCalculationMode.SHARE_RATIO ? tHelp("shareRatio") : tHelp("calculationMode")
              }
            />
            <AmountInput
              id="wizard-fixed-amount"
              value={fixedAmount}
              onChange={setFixedAmount}
              placeholder={tPh("fixedAmount")}
              required
            />
          </div>
        ) : null}
        {calculationMode === DueCalculationMode.METER_CONSUMPTION ? (
          <div className="grid gap-2">
            <Label htmlFor="wizard-rate">{t("unitPrice")}</Label>
            <AmountInput
              id="wizard-rate"
              value={ratePerM2}
              onChange={setRatePerM2}
              placeholder={tPh("ratePerM2")}
              required
            />
          </div>
        ) : null}
        {calculationMode === DueCalculationMode.AREA_M2 ? (
          <div className="grid gap-2">
            <Label htmlFor="wizard-rate-area">{t("ratePerM2")}</Label>
            <AmountInput
              id="wizard-rate-area"
              value={ratePerM2}
              onChange={setRatePerM2}
              placeholder={tPh("ratePerM2")}
              required
            />
          </div>
        ) : null}
        {needsMeterKind(calculationMode) ? (
          <div className="grid gap-2">
            <Label>{t("meterKind")}</Label>
            <Select value={meterKind} onValueChange={(value) => setMeterKind(value as MeterKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MeterKind).map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`meterKindLabel.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? (
          <div className="grid gap-2">
            <Label>{t("supplierLateFeeDefaultAllocationMode")}</Label>
            <Select
              value={supplierLateFeeAllocationMode}
              onValueChange={(value) => setSupplierLateFeeAllocationMode(value as SupplierLateFeeAllocationMode)}
            >
              <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">{t("supplierLateFeeDefaultAllocationModeHint")}</p>
          </div>
        ) : null}
        {calculationMode === DueCalculationMode.ALLOCATED_BILL ||
        calculationMode === DueCalculationMode.METER_ALLOCATED_BILL ? (
          <p className="text-sm text-muted-foreground">
            {calculationMode === DueCalculationMode.METER_ALLOCATED_BILL
              ? t("meterAllocatedBillAutoAccrualHint")
              : t("wizard.billModeHint")}
          </p>
        ) : null}
      </div>
    );
  } else {
    stepContent = (
      <div className="grid gap-4">
        <StepIndicator step={3} t={t} />
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">{name}</p>
          <p className="mt-1 text-muted-foreground">{definitionSummary(reviewDefinition, t)}</p>
        </div>
        {isSupplierWizard ? (
          <p className="text-xs text-muted-foreground">{t("wizard.supplierNoAutoAccrualHint")}</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="wizard-auto-accrual"
                checked={autoAccrualMonthly}
                onCheckedChange={(value) => setAutoAccrualMonthly(value === true)}
              />
              <Label htmlFor="wizard-auto-accrual" className="font-normal">
                {t("autoAccrualMonthly")}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">{t("autoAccrualMonthlyHint")}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={mode === "edit" ? "outline" : isSupplierWizard ? "outline" : "default"}
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => setOpen(true)}
      >
        {mode === "edit" ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4 py-4">
            {step < 3 ? (
              <div className="pb-8">{stepContent}</div>
            ) : (
              <form action={formAction} className="grid gap-4 pb-8">
                <input type="hidden" name="calculationMode" value={calculationMode} />
                <input type="hidden" name="meterKind" value={needsMeterKind(calculationMode) ? meterKind : ""} />
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="fixedAmount" value={fixedAmount} />
                <input type="hidden" name="ratePerM2" value={ratePerM2} />
                <input
                  type="hidden"
                  name="supplierLateFeeAllocationMode"
                  value={
                    calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL
                      ? supplierLateFeeAllocationMode
                      : ""
                  }
                />
                <input
                  type="hidden"
                  name="autoAccrualMonthly"
                  value={!isSupplierWizard && autoAccrualMonthly ? "on" : ""}
                />
                {stepContent}
                <DuesError code={state.error} t={t} />
                <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                  {mode === "edit" ? t("saveDefinition") : isSupplierWizard ? t("addSupplierLateFeeDefinition") : t("addDefinition")}
                </Button>
              </form>
            )}
          </ScrollArea>
          {step < 3 ? (
            <div className="flex gap-2 border-t px-4 py-3">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  {t("wizard.back")}
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="button"
                className="ml-auto"
                disabled={!canGoNext()}
                onClick={() => setStep(step + 1)}
              >
                {t("wizard.next")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 border-t px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                {t("wizard.back")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
