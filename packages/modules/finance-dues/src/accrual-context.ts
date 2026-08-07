import { DueCalculationMode } from "@siteyonetim/db";

import type { DueAccrualRunDto, DueAccrualRunLineDto } from "./contract";

/** Mirrors `splitByMeterConsumption` penny allocation (last row absorbs rounding). */
function expectedMeterBillAmounts(
  rows: Array<{ unitId: string; consumption: number }>,
  billTotal: number,
): Map<string, number> {
  const positive = [...rows]
    .filter((row) => row.consumption > 0)
    .sort((a, b) => a.unitId.localeCompare(b.unitId));
  const sum = positive.reduce((acc, row) => acc + row.consumption, 0);
  const map = new Map<string, number>();
  if (sum <= 0) {
    return map;
  }

  let allocated = 0;
  for (let i = 0; i < positive.length; i += 1) {
    const row = positive[i]!;
    const isLast = i === positive.length - 1;
    const amount = isLast
      ? Math.round((billTotal - allocated) * 100) / 100
      : Math.round(((billTotal * row.consumption) / sum) * 100) / 100;
    map.set(row.unitId, amount);
    allocated += amount;
  }
  return map;
}

export function needsConsumptionRecalculate(
  run: DueAccrualRunDto,
  lines: DueAccrualRunLineDto[],
): boolean {
  if (run.calculationMode !== DueCalculationMode.METER_ALLOCATED_BILL) return false;
  const rows = lines.filter((line) => line.meterConsumption != null && Number(line.meterConsumption) > 0);
  if (rows.length < 2) return false;

  const billTotal = Number(run.totalAmount);
  if (!Number.isFinite(billTotal) || billTotal <= 0) return false;

  const expected = expectedMeterBillAmounts(
    rows.map((line) => ({ unitId: line.unitId, consumption: Number(line.meterConsumption) })),
    billTotal,
  );

  return rows.some((line) => {
    const target = expected.get(line.unitId);
    if (target == null) return true;
    return Math.abs(target - Number(line.amount)) > 0.01;
  });
}

export function hasMeterRunMismatch(
  run: DueAccrualRunDto,
  lines: DueAccrualRunLineDto[],
): boolean {
  if (run.calculationMode !== DueCalculationMode.METER_ALLOCATED_BILL) return false;
  const linesWithConsumption = lines.filter((line) => line.meterConsumption != null).length;
  return lines.length > 0 && linesWithConsumption > 0 && linesWithConsumption < lines.length;
}

export function countMissingPreviousIndex(lines: DueAccrualRunLineDto[]): number {
  return lines.filter((line) => line.meterIndexCurrent != null && line.meterIndexPrevious == null).length;
}

export function isMeterDefinitionMode(mode: DueCalculationMode): boolean {
  return (
    mode === DueCalculationMode.METER_CONSUMPTION || mode === DueCalculationMode.METER_ALLOCATED_BILL
  );
}
