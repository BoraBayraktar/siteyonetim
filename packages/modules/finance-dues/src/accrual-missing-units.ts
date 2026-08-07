import { DueCalculationMode, Prisma } from "@siteyonetim/db";

import type { AccrualMissingUnitDto, AccrualMissingUnitReason } from "./contract";

export type AnalyzeMissingUnitsInput = {
  units: Array<{
    id: string;
    code: string;
    areaM2: Prisma.Decimal | null;
    shareRatio: Prisma.Decimal | null;
  }>;
  accruedUnitIds: Set<string>;
  calculationMode: DueCalculationMode;
  year: number;
  month: number;
  partyMap: Map<string, { partyId: string; accountId: string }>;
  lineDataUnitIds?: Set<string>;
  meterPeriods?: Array<{
    unitId: string;
    currentIndex: string | null;
    previousIndex: string | null;
    consumption: string | null;
  }>;
  activeMeterUnitIds?: Set<string>;
};

const REASON_PRIORITY: AccrualMissingUnitReason[] = [
  "NO_METER",
  "NO_METER_READING",
  "MISSING_PREVIOUS_METER_INDEX",
  "NO_OCCUPANCY",
  "ZERO_AMOUNT",
  "PENDING_IN_RUN",
];

export function primaryMissingUnitReason(reasons: AccrualMissingUnitReason[]): AccrualMissingUnitReason {
  for (const reason of REASON_PRIORITY) {
    if (reasons.includes(reason)) return reason;
  }
  return reasons[0] ?? "PENDING_IN_RUN";
}

function isMeterMode(mode: DueCalculationMode): boolean {
  return (
    mode === DueCalculationMode.METER_CONSUMPTION || mode === DueCalculationMode.METER_ALLOCATED_BILL
  );
}

function hasZeroNonMeterAmount(
  unit: AnalyzeMissingUnitsInput["units"][number],
  mode: DueCalculationMode,
): boolean {
  if (mode === DueCalculationMode.FIXED) {
    return false;
  }
  if (mode === DueCalculationMode.SHARE_RATIO) {
    const share = unit.shareRatio ?? new Prisma.Decimal(0);
    return share.lte(0);
  }
  if (mode === DueCalculationMode.AREA_M2) {
    const area = unit.areaM2 ?? new Prisma.Decimal(0);
    return area.lte(0);
  }
  return false;
}

function diagnoseMissingUnit(
  unit: AnalyzeMissingUnitsInput["units"][number],
  input: AnalyzeMissingUnitsInput,
): AccrualMissingUnitReason[] {
  const reasons: AccrualMissingUnitReason[] = [];

  if (input.lineDataUnitIds?.has(unit.id)) {
    reasons.push("PENDING_IN_RUN");
  }

  if (!input.partyMap.has(unit.id)) {
    reasons.push("NO_OCCUPANCY");
  }

  if (isMeterMode(input.calculationMode)) {
    const hasMeter = input.activeMeterUnitIds?.has(unit.id) ?? false;
    if (!hasMeter) {
      reasons.push("NO_METER");
      return reasons;
    }

    const period = input.meterPeriods?.find((row) => row.unitId === unit.id);
    if (!period?.currentIndex) {
      reasons.push("NO_METER_READING");
      return reasons;
    }
    if (!period.previousIndex) {
      reasons.push("MISSING_PREVIOUS_METER_INDEX");
      return reasons;
    }

    if (!input.lineDataUnitIds?.has(unit.id) && reasons.length === 0) {
      reasons.push("PENDING_IN_RUN");
    }
    return reasons;
  }

  if (!input.lineDataUnitIds?.has(unit.id) && hasZeroNonMeterAmount(unit, input.calculationMode)) {
    reasons.push("ZERO_AMOUNT");
  }

  if (reasons.length === 0) {
    reasons.push("PENDING_IN_RUN");
  }

  return reasons;
}

export function analyzeMissingAccrualUnits(input: AnalyzeMissingUnitsInput): AccrualMissingUnitDto[] {
  const missing: AccrualMissingUnitDto[] = [];

  for (const unit of input.units) {
    if (input.accruedUnitIds.has(unit.id)) continue;
    missing.push({
      unitId: unit.id,
      unitCode: unit.code,
      reasons: diagnoseMissingUnit(unit, input),
    });
  }

  return missing.sort((a, b) => a.unitCode.localeCompare(b.unitCode, "tr"));
}

export function groupMissingUnitsByPrimaryReason(
  missingUnits: AccrualMissingUnitDto[],
): Array<{ reason: AccrualMissingUnitReason; unitCodes: string[] }> {
  const groups = new Map<AccrualMissingUnitReason, string[]>();

  for (const unit of missingUnits) {
    const reason = primaryMissingUnitReason(unit.reasons);
    const list = groups.get(reason) ?? [];
    list.push(unit.unitCode);
    groups.set(reason, list);
  }

  return REASON_PRIORITY.filter((reason) => groups.has(reason)).map((reason) => ({
    reason,
    unitCodes: groups.get(reason)!.sort((a, b) => a.localeCompare(b, "tr")),
  }));
}
