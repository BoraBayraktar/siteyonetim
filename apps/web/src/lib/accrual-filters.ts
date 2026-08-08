import type { DueAccrualRunDto, DueAccrualRunLineDto } from "@siteyonetim/finance-dues";

import { buildPeriodFilterOptions, periodsFromAccrualRuns } from "@/lib/period-options";

export type AccrualFilters = {
  year: number | null;
  month: number | null;
  unitId: string | null;
  dueDefinitionId: string | null;
};

export function parseAccrualFilters(input: {
  accrualYear?: string;
  accrualMonth?: string;
  accrualUnitId?: string;
  accrualDefinitionId?: string;
}): AccrualFilters {
  const year = input.accrualYear ? Number(input.accrualYear) : null;
  const month = input.accrualMonth ? Number(input.accrualMonth) : null;
  return {
    year: year != null && !Number.isNaN(year) ? year : null,
    month: month != null && !Number.isNaN(month) && month >= 1 && month <= 12 ? month : null,
    unitId: input.accrualUnitId?.trim() || null,
    dueDefinitionId: input.accrualDefinitionId?.trim() || null,
  };
}

export function filterAccrualRuns(
  runs: DueAccrualRunDto[],
  filters: AccrualFilters,
  runLinesByRunId: Record<string, DueAccrualRunLineDto[]>,
): DueAccrualRunDto[] {
  return runs.filter((run) => {
    if (filters.year != null && run.year !== filters.year) return false;
    if (filters.month != null && run.month !== filters.month) return false;
    if (filters.dueDefinitionId != null && run.dueDefinitionId !== filters.dueDefinitionId) return false;
    if (filters.unitId != null) {
      const lines = runLinesByRunId[run.id] ?? [];
      if (!lines.some((line) => line.unitId === filters.unitId)) return false;
    }
    return true;
  });
}

export function filterAccrualLines(
  lines: DueAccrualRunLineDto[],
  unitId: string | null,
): DueAccrualRunLineDto[] {
  if (!unitId) return lines;
  return lines.filter((line) => line.unitId === unitId);
}

export function uniqueDefinitionOptions(
  runs: DueAccrualRunDto[],
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const run of runs) {
    map.set(run.dueDefinitionId, run.dueDefinitionName);
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function uniqueYearsFromRuns(runs: DueAccrualRunDto[]): number[] {
  return buildPeriodFilterOptions(periodsFromAccrualRuns(runs), {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }).years;
}

export function uniquePostedYearsFromRuns(runs: DueAccrualRunDto[]): number[] {
  return buildPeriodFilterOptions(periodsFromAccrualRuns(runs, true), {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  }).years;
}

export function uniquePostedMonthsFromRuns(runs: DueAccrualRunDto[], year: number): number[] {
  return buildPeriodFilterOptions(periodsFromAccrualRuns(runs, true), { year, month: 1 }).months;
}

export function registerPeriodFilterOptions(
  runs: DueAccrualRunDto[],
  active: { year: number; month: number },
): { years: number[]; months: number[] } {
  return buildPeriodFilterOptions(periodsFromAccrualRuns(runs, true), active);
}
