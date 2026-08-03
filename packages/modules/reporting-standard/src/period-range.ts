import type { AuditorReportPeriod } from "@siteyonetim/db";

export type QuarterPeriod = Extract<AuditorReportPeriod, "Q1" | "Q2" | "Q3" | "Q4">;

export function isQuarterPeriod(period: AuditorReportPeriod): period is QuarterPeriod {
  return period === "Q1" || period === "Q2" || period === "Q3" || period === "Q4";
}

export function quarterToMonths(period: QuarterPeriod): { fromMonth: number; toMonth: number } {
  switch (period) {
    case "Q1":
      return { fromMonth: 1, toMonth: 3 };
    case "Q2":
      return { fromMonth: 4, toMonth: 6 };
    case "Q3":
      return { fromMonth: 7, toMonth: 9 };
    case "Q4":
      return { fromMonth: 10, toMonth: 12 };
  }
}

export function quarterPeriodLabel(
  period: QuarterPeriod,
  year: number,
  locale?: string,
): string {
  const { fromMonth, toMonth } = quarterToMonths(period);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", { month: "long" });
  const from = fmt.format(new Date(year, fromMonth - 1, 1));
  const to = fmt.format(new Date(year, toMonth - 1, 1));
  if (locale === "en") {
    return `${period} ${year} (${from} – ${to})`;
  }
  return `${year} ${period} (${from} – ${to})`;
}

export function resolveReportDateRange(filter: {
  year: number;
  fromMonth?: number;
  toMonth?: number;
}) {
  if (filter.fromMonth != null && filter.toMonth != null) {
    return {
      start: new Date(filter.year, filter.fromMonth - 1, 1),
      end: new Date(filter.year, filter.toMonth, 1),
    };
  }
  return {
    start: new Date(filter.year, 0, 1),
    end: new Date(filter.year + 1, 0, 1),
  };
}
