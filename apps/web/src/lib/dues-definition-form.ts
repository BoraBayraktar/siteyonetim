import { DueCalculationMode, MeterKind } from "@siteyonetim/db";
import type { DueDefinitionDto } from "@siteyonetim/finance-dues";

export const CALCULATION_MODES: DueCalculationMode[] = [
  DueCalculationMode.FIXED,
  DueCalculationMode.AREA_M2,
  DueCalculationMode.SHARE_RATIO,
  DueCalculationMode.ALLOCATED_BILL,
  DueCalculationMode.METER_ALLOCATED_BILL,
  DueCalculationMode.METER_CONSUMPTION,
];

export function needsTotalBill(mode: DueCalculationMode) {
  return mode === DueCalculationMode.ALLOCATED_BILL || mode === DueCalculationMode.METER_ALLOCATED_BILL;
}

export function needsMeterKind(mode: DueCalculationMode) {
  return mode === DueCalculationMode.METER_CONSUMPTION || mode === DueCalculationMode.METER_ALLOCATED_BILL;
}

export function definitionSummary(
  d: Pick<DueDefinitionDto, "calculationMode" | "fixedAmount" | "ratePerM2" | "meterKind">,
  t: (key: string) => string,
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
      return `${t("meterAllocatedBill")}${d.meterKind ? ` (${t(`meterKindLabel.${d.meterKind}`)})` : ""}`;
    case DueCalculationMode.METER_CONSUMPTION:
      return `${t("meterConsumption")}${d.meterKind ? ` (${t(`meterKindLabel.${d.meterKind}`)})` : ""}: ${d.ratePerM2}`;
    default:
      return d.calculationMode;
  }
}

export function modeLabel(mode: DueCalculationMode, t: (key: string) => string): string {
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
    default:
      return mode;
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
    default:
      return "";
  }
}

export const DEFAULT_METER_KIND = MeterKind.HOT_WATER;
