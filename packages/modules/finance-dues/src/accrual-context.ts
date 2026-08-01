import { DueCalculationMode, Prisma } from "@siteyonetim/db";

import type { DueAccrualRunDto, DueAccrualRunLineDto } from "./contract";

export function needsConsumptionRecalculate(
  run: DueAccrualRunDto,
  lines: DueAccrualRunLineDto[],
): boolean {
  if (run.calculationMode !== DueCalculationMode.METER_ALLOCATED_BILL) return false;
  const rows = lines.filter((line) => line.meterConsumption != null && Number(line.meterConsumption) > 0);
  if (rows.length < 2) return false;

  const totalConsumption = rows.reduce((sum, line) => sum + Number(line.meterConsumption), 0);
  if (totalConsumption <= 0) return false;

  const billTotal = Number(run.totalAmount);
  return rows.some((line) => {
    const expected = (billTotal * Number(line.meterConsumption)) / totalConsumption;
    return Math.abs(expected - Number(line.amount)) > 0.05;
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
