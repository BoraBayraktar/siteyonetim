import type { DueAccrualRunDto } from "@siteyonetim/finance-dues";
import type { BankStatementImportDto } from "@siteyonetim/finance-banking";
import type { MeterReadingDto } from "@siteyonetim/property-meters";
import { DueAccrualStatus } from "@siteyonetim/db";

export type PeriodPoint = { year: number; month: number };

export function turkishMonthName(month: number): string {
  return new Intl.DateTimeFormat("tr-TR", { month: "long" }).format(new Date(2000, month - 1, 1));
}

export function uniqueYearsFromPeriods(periods: PeriodPoint[]): number[] {
  return [...new Set(periods.map((point) => point.year))].sort((a, b) => b - a);
}

export function uniqueMonthsFromPeriods(periods: PeriodPoint[], year: number): number[] {
  return [
    ...new Set(periods.filter((point) => point.year === year).map((point) => point.month)),
  ].sort((a, b) => b - a);
}

export function ensureActivePeriod(
  years: number[],
  months: number[],
  active: { year: number; month: number },
): { years: number[]; months: number[] } {
  let nextYears = years;
  let nextMonths = months;
  if (!nextYears.includes(active.year)) {
    nextYears = [active.year, ...nextYears].sort((a, b) => b - a);
  }
  if (!nextMonths.includes(active.month)) {
    nextMonths = [active.month, ...nextMonths].sort((a, b) => b - a);
  }
  return { years: nextYears, months: nextMonths };
}

export function buildPeriodFilterOptions(
  periods: PeriodPoint[],
  active: { year: number; month: number },
): { years: number[]; months: number[] } {
  const years = uniqueYearsFromPeriods(periods);
  const months = uniqueMonthsFromPeriods(periods, active.year);
  return ensureActivePeriod(years, months, active);
}

export function periodsFromAccrualRuns(
  runs: DueAccrualRunDto[],
  postedOnly = false,
): PeriodPoint[] {
  return runs
    .filter((run) => !postedOnly || run.status === DueAccrualStatus.POSTED)
    .map((run) => ({ year: run.year, month: run.month }));
}

export function periodsFromBankImports(imports: BankStatementImportDto[]): PeriodPoint[] {
  return imports.map((item) => ({ year: item.year, month: item.month }));
}

export function periodsFromMeterReadings(
  readingsByMeterId: Record<string, MeterReadingDto[]>,
): PeriodPoint[] {
  const points: PeriodPoint[] = [];
  for (const readings of Object.values(readingsByMeterId)) {
    for (const reading of readings) {
      points.push({ year: reading.year, month: reading.month });
    }
  }
  return points;
}

export function withCurrentPeriod(periods: PeriodPoint[], date = new Date()): PeriodPoint[] {
  const current = { year: date.getFullYear(), month: date.getMonth() + 1 };
  if (periods.some((point) => point.year === current.year && point.month === current.month)) {
    return periods;
  }
  return [...periods, current];
}

export function mergePeriods(...groups: PeriodPoint[][]): PeriodPoint[] {
  const seen = new Set<string>();
  const merged: PeriodPoint[] = [];
  for (const group of groups) {
    for (const point of group) {
      const key = `${point.year}-${point.month}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(point);
    }
  }
  return merged;
}
