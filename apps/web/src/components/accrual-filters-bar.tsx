"use client";

import type { DueAccrualRunDto, DueDefinitionDto } from "@siteyonetim/finance-dues";
import type { UnitDto } from "@siteyonetim/property-core";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { YearMonthOptionalFilterSelects } from "@/components/year-month-select";
import { Button } from "@/components/ui/button";
import type { AccrualFilters } from "@/lib/accrual-filters";
import { uniqueDefinitionOptions } from "@/lib/accrual-filters";
import { periodsFromAccrualRuns } from "@/lib/period-options";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

type Props = {
  filters: AccrualFilters;
  runs: DueAccrualRunDto[];
  definitions: DueDefinitionDto[];
  units: UnitDto[];
};

export function AccrualFiltersBar({ filters, runs, definitions, units }: Props) {
  const t = useTranslations("dues");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const periods = useMemo(() => periodsFromAccrualRuns(runs), [runs]);
  const definitionOptions = useMemo(() => {
    const fromRuns = uniqueDefinitionOptions(runs);
    if (fromRuns.length > 0) return fromRuns;
    return definitions.map((def) => ({ id: def.id, name: def.name }));
  }, [runs, definitions]);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true })),
    [units],
  );

  function pushFilters(overrides: Partial<AccrualFilters>) {
    const next: AccrualFilters = { ...filters, ...overrides };
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "accrual");

    if (next.year != null) params.set("accrualYear", String(next.year));
    else params.delete("accrualYear");

    if (next.month != null) params.set("accrualMonth", String(next.month));
    else params.delete("accrualMonth");

    if (next.unitId) params.set("accrualUnitId", next.unitId);
    else params.delete("accrualUnitId");

    if (next.dueDefinitionId) params.set("accrualDefinitionId", next.dueDefinitionId);
    else params.delete("accrualDefinitionId");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasActiveFilters =
    filters.year != null ||
    filters.month != null ||
    filters.unitId != null ||
    filters.dueDefinitionId != null;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t("accrualFiltersTitle")}</p>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              pushFilters({ year: null, month: null, unitId: null, dueDefinitionId: null })
            }
          >
            {t("accrualFiltersClear")}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="accrual-filter-unit">{t("unit")}</Label>
          <Select
            value={filters.unitId ?? ALL}
            onValueChange={(value) => pushFilters({ unitId: value === ALL ? null : value })}
          >
            <SelectTrigger id="accrual-filter-unit" className="w-full bg-background">
              <SelectValue placeholder={t("accrualFilterAllUnits")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("accrualFilterAllUnits")}</SelectItem>
              {sortedUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <YearMonthOptionalFilterSelects
          periods={periods}
          year={filters.year}
          month={filters.month}
          onYearChange={(year) => pushFilters({ year })}
          onMonthChange={(month) => pushFilters({ month })}
          yearLabel={t("year")}
          monthLabel={t("accrualFilterPeriod")}
          allYearsLabel={t("accrualFilterAllYears")}
          allMonthsLabel={t("accrualFilterAllPeriods")}
          yearId="accrual-filter-year"
          monthId="accrual-filter-month"
          disabled={pending}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="accrual-filter-definition">{t("accrualFilterDebtType")}</Label>
          <Select
            value={filters.dueDefinitionId ?? ALL}
            onValueChange={(value) =>
              pushFilters({ dueDefinitionId: value === ALL ? null : value })
            }
          >
            <SelectTrigger id="accrual-filter-definition" className="w-full bg-background">
              <SelectValue placeholder={t("accrualFilterAllDebtTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("accrualFilterAllDebtTypes")}</SelectItem>
              {definitionOptions.map((def) => (
                <SelectItem key={def.id} value={def.id}>
                  {def.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
