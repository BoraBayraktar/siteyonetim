"use client";

import { useEffect, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildPeriodFilterOptions,
  turkishMonthName,
  type PeriodPoint,
} from "@/lib/period-options";

type BaseProps = {
  years: number[];
  months: number[];
  yearLabel: string;
  monthLabel: string;
  yearId?: string;
  monthId?: string;
  disabled?: boolean;
  monthDisabled?: boolean;
  className?: string;
};

type FilterProps = BaseProps & {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
};

export function YearMonthFilterSelects({
  years,
  months,
  year,
  month,
  onYearChange,
  onMonthChange,
  yearLabel,
  monthLabel,
  yearId = "period-filter-year",
  monthId = "period-filter-month",
  disabled,
  monthDisabled,
  className,
}: FilterProps) {
  return (
    <>
      <div className={className ?? "grid gap-2"}>
        <Label htmlFor={yearId}>{yearLabel}</Label>
        <Select
          value={String(year)}
          onValueChange={(value) => onYearChange(Number(value))}
          disabled={disabled || years.length === 0}
        >
          <SelectTrigger id={yearId} className="w-full bg-background">
            <SelectValue placeholder={yearLabel} />
          </SelectTrigger>
          <SelectContent>
            {years.map((optionYear) => (
              <SelectItem key={optionYear} value={String(optionYear)}>
                {optionYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={className ?? "grid gap-2"}>
        <Label htmlFor={monthId}>{monthLabel}</Label>
        <Select
          value={String(month)}
          onValueChange={(value) => onMonthChange(Number(value))}
          disabled={monthDisabled || disabled || months.length === 0}
        >
          <SelectTrigger id={monthId} className="w-full bg-background">
            <SelectValue placeholder={monthLabel} />
          </SelectTrigger>
          <SelectContent>
            {months.map((optionMonth) => (
              <SelectItem key={optionMonth} value={String(optionMonth)}>
                {turkishMonthName(optionMonth)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

type OptionalFilterProps = {
  periods: PeriodPoint[];
  year: number | null;
  month: number | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: number | null) => void;
  yearLabel: string;
  monthLabel: string;
  allYearsLabel: string;
  allMonthsLabel: string;
  yearId?: string;
  monthId?: string;
  disabled?: boolean;
};

const ALL = "all";

export function YearMonthOptionalFilterSelects({
  periods,
  year,
  month,
  onYearChange,
  onMonthChange,
  yearLabel,
  monthLabel,
  allYearsLabel,
  allMonthsLabel,
  yearId = "period-filter-year",
  monthId = "period-filter-month",
  disabled,
}: OptionalFilterProps) {
  const years = useMemo(() => buildPeriodFilterOptions(periods, {
    year: year ?? new Date().getFullYear(),
    month: month ?? new Date().getMonth() + 1,
  }).years, [periods, year, month]);

  const months = useMemo(() => {
    if (year == null) return [];
    return buildPeriodFilterOptions(periods, {
      year,
      month: month ?? new Date().getMonth() + 1,
    }).months;
  }, [periods, year, month]);

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={yearId}>{yearLabel}</Label>
        <Select
          value={year != null ? String(year) : ALL}
          onValueChange={(value) => {
            const nextYear = value === ALL ? null : Number(value);
            onYearChange(nextYear);
            if (nextYear == null) {
              onMonthChange(null);
              return;
            }
            const nextMonths = buildPeriodFilterOptions(periods, {
              year: nextYear,
              month: month ?? 1,
            }).months;
            if (month != null && !nextMonths.includes(month)) {
              onMonthChange(nextMonths[0] ?? null);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger id={yearId} className="w-full bg-background">
            <SelectValue placeholder={allYearsLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{allYearsLabel}</SelectItem>
            {years.map((optionYear) => (
              <SelectItem key={optionYear} value={String(optionYear)}>
                {optionYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={monthId}>{monthLabel}</Label>
        <Select
          value={month != null ? String(month) : ALL}
          onValueChange={(value) => onMonthChange(value === ALL ? null : Number(value))}
          disabled={disabled || year == null}
        >
          <SelectTrigger id={monthId} className="w-full bg-background">
            <SelectValue placeholder={allMonthsLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{allMonthsLabel}</SelectItem>
            {months.map((optionMonth) => (
              <SelectItem key={optionMonth} value={String(optionMonth)}>
                {turkishMonthName(optionMonth)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

type FormProps = {
  periods: PeriodPoint[];
  defaultYear: number;
  defaultMonth: number;
  yearName?: string;
  monthName?: string;
  yearLabel: string;
  monthLabel: string;
  yearId?: string;
  monthId?: string;
  disabled?: boolean;
  yearReadOnly?: boolean;
  monthReadOnly?: boolean;
};

export function YearMonthFormFields({
  periods,
  defaultYear,
  defaultMonth,
  yearName = "year",
  monthName = "month",
  yearLabel,
  monthLabel,
  yearId = "form-year",
  monthId = "form-month",
  disabled,
  yearReadOnly,
  monthReadOnly,
}: FormProps) {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  useEffect(() => {
    setYear(defaultYear);
    setMonth(defaultMonth);
  }, [defaultYear, defaultMonth]);

  const { years, months } = useMemo(
    () => buildPeriodFilterOptions(periods, { year, month }),
    [periods, year, month],
  );

  useEffect(() => {
    if (!months.includes(month)) {
      setMonth(months[0] ?? month);
    }
  }, [months, month]);

  if (yearReadOnly && monthReadOnly) {
    return (
      <>
        <input type="hidden" name={yearName} value={year} />
        <input type="hidden" name={monthName} value={month} />
        <div className="grid gap-2">
          <Label htmlFor={yearId}>{yearLabel}</Label>
          <Select value={String(year)} disabled>
            <SelectTrigger id={yearId} className="bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(year)}>{year}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={monthId}>{monthLabel}</Label>
          <Select value={String(month)} disabled>
            <SelectTrigger id={monthId} className="bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(month)}>{turkishMonthName(month)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }

  return (
    <>
      <input type="hidden" name={yearName} value={year} />
      <input type="hidden" name={monthName} value={month} />
      <div className="grid gap-2">
        <Label htmlFor={yearId}>{yearLabel}</Label>
        <Select
          value={String(year)}
          onValueChange={(value) => {
            const nextYear = Number(value);
            setYear(nextYear);
            const nextMonths = buildPeriodFilterOptions(periods, { year: nextYear, month }).months;
            if (!nextMonths.includes(month)) {
              setMonth(nextMonths[0] ?? month);
            }
          }}
          disabled={disabled || yearReadOnly}
        >
          <SelectTrigger id={yearId} className={yearReadOnly ? "bg-muted" : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((optionYear) => (
              <SelectItem key={optionYear} value={String(optionYear)}>
                {optionYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={monthId}>{monthLabel}</Label>
        <Select
          value={String(month)}
          onValueChange={(value) => setMonth(Number(value))}
          disabled={disabled || monthReadOnly}
        >
          <SelectTrigger id={monthId} className={monthReadOnly ? "bg-muted" : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((optionMonth) => (
              <SelectItem key={optionMonth} value={String(optionMonth)}>
                {turkishMonthName(optionMonth)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
