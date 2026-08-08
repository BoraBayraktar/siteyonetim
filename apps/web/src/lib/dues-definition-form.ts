import { DueCalculationMode, MeterKind } from "@siteyonetim/db";
import type { DueDefinitionDto } from "@siteyonetim/finance-dues";

import { enumLabel, type EnumTranslator } from "./enum-labels";

/** Regular dues / shared expense calculation modes (excludes supplier late fee). */
export const AIDAT_CALCULATION_MODES: DueCalculationMode[] = [
  DueCalculationMode.FIXED,
  DueCalculationMode.AREA_M2,
  DueCalculationMode.SHARE_RATIO,
  DueCalculationMode.ALLOCATED_BILL,
  DueCalculationMode.METER_ALLOCATED_BILL,
  DueCalculationMode.METER_CONSUMPTION,
];

export const CALCULATION_MODES: DueCalculationMode[] = [
  ...AIDAT_CALCULATION_MODES,
  DueCalculationMode.SUPPLIER_LATE_FEE_BILL,
];

export function isSupplierLateFeeDefinition(
  mode: DueCalculationMode | string,
): mode is typeof DueCalculationMode.SUPPLIER_LATE_FEE_BILL {
  return mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL;
}

export function needsTotalBill(mode: DueCalculationMode) {
  return (
    mode === DueCalculationMode.ALLOCATED_BILL ||
    mode === DueCalculationMode.METER_ALLOCATED_BILL ||
    mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL
  );
}

export function needsMeterKind(mode: DueCalculationMode) {
  return mode === DueCalculationMode.METER_CONSUMPTION || mode === DueCalculationMode.METER_ALLOCATED_BILL;
}

export function definitionSummary(
  d: Pick<
    DueDefinitionDto,
    "calculationMode" | "fixedAmount" | "ratePerM2" | "meterKind" | "supplierLateFeeAllocationMode"
  >,
  t: (key: string) => string,
  tEnum?: EnumTranslator,
): string {
  switch (d.calculationMode) {
    case DueCalculationMode.FIXED:
      return `${t("fixed")}: ${d.fixedAmount}`;
    case DueCalculationMode.AREA_M2:
      return `${t("area")}: ${d.ratePerM2} / m²`;
    case DueCalculationMode.SHARE_RATIO:
      return `${t("shareRatio")}: ${d.fixedAmount}`;
    case DueCalculationMode.ALLOCATED_BILL:
      return t("allocatedBill");
    case DueCalculationMode.METER_ALLOCATED_BILL:
      return `${t("meterAllocatedBill")}${d.meterKind ? ` (${meterKindLabel(d.meterKind, t, tEnum)})` : ""}`;
    case DueCalculationMode.METER_CONSUMPTION:
      return `${t("meterConsumption")}${d.meterKind ? ` (${meterKindLabel(d.meterKind, t, tEnum)})` : ""}: ${d.ratePerM2}`;
    case DueCalculationMode.SUPPLIER_LATE_FEE_BILL:
      return d.supplierLateFeeAllocationMode
        ? supplierAllocationLabel(d.supplierLateFeeAllocationMode, t, tEnum)
        : t("supplierLateFeeBill");
    default:
      return tEnum ? enumLabel(tEnum, "DueCalculationMode", d.calculationMode) : d.calculationMode;
  }
}

function meterKindLabel(
  kind: MeterKind,
  t: (key: string) => string,
  tEnum?: EnumTranslator,
): string {
  if (tEnum) {
    return enumLabel(tEnum, "MeterKind", kind);
  }
  return t(`meterKindLabel.${kind}`);
}

function supplierAllocationLabel(
  mode: string,
  t: (key: string) => string,
  tEnum?: EnumTranslator,
): string {
  if (tEnum) {
    return enumLabel(tEnum, "SupplierLateFeeAllocationMode", mode);
  }
  return t(`supplierLateFeeAllocationMode.${mode}`);
}

export function modeLabel(
  mode: DueCalculationMode,
  t: (key: string) => string,
  tEnum?: EnumTranslator,
): string {
  switch (mode) {
    case DueCalculationMode.FIXED:
      return t("fixed");
    case DueCalculationMode.AREA_M2:
      return t("area");
    case DueCalculationMode.SHARE_RATIO:
      return t("shareRatio");
    case DueCalculationMode.ALLOCATED_BILL:
      return t("allocatedBill");
    case DueCalculationMode.METER_ALLOCATED_BILL:
      return t("meterAllocatedBill");
    case DueCalculationMode.METER_CONSUMPTION:
      return t("meterConsumption");
    case DueCalculationMode.SUPPLIER_LATE_FEE_BILL:
      return t("supplierLateFeeBill");
    default:
      return tEnum ? enumLabel(tEnum, "DueCalculationMode", mode) : mode;
  }
}

export function modeDescription(mode: DueCalculationMode, t: (key: string) => string): string {
  switch (mode) {
    case DueCalculationMode.FIXED:
      return t("wizard.modeFixedDesc");
    case DueCalculationMode.AREA_M2:
      return t("wizard.modeAreaDesc");
    case DueCalculationMode.SHARE_RATIO:
      return t("wizard.modeShareDesc");
    case DueCalculationMode.ALLOCATED_BILL:
      return t("wizard.modeBillDesc");
    case DueCalculationMode.METER_ALLOCATED_BILL:
      return t("wizard.modeMeterBillDesc");
    case DueCalculationMode.METER_CONSUMPTION:
      return t("wizard.modeMeterConsumptionDesc");
    case DueCalculationMode.SUPPLIER_LATE_FEE_BILL:
      return t("wizard.modeSupplierLateFeeDesc");
    default:
      return "";
  }
}

export const DEFAULT_METER_KIND = MeterKind.HOT_WATER;
