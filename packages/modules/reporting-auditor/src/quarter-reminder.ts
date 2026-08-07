import type { AuditorReportPeriod } from "@siteyonetim/db";

export type QuarterPeriod = Extract<AuditorReportPeriod, "Q1" | "Q2" | "Q3" | "Q4">;

const QUARTER_PERIODS: QuarterPeriod[] = ["Q1", "Q2", "Q3", "Q4"];

export function isQuarterPeriod(period: AuditorReportPeriod): period is QuarterPeriod {
  return QUARTER_PERIODS.includes(period as QuarterPeriod);
}

/** Quarter end + 7 days: Apr 7 (Q1), Jul 7 (Q2), Oct 7 (Q3), Jan 7 (Q4 prev year). */
export function resolveQuarterReminderDue(
  now = new Date(),
): { year: number; period: QuarterPeriod } | null {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();

  if (month === 4 && day === 7) return { year, period: "Q1" };
  if (month === 7 && day === 7) return { year, period: "Q2" };
  if (month === 10 && day === 7) return { year, period: "Q3" };
  if (month === 1 && day === 7) return { year: year - 1, period: "Q4" };
  return null;
}

export function quarterReminderLabel(period: QuarterPeriod, year: number, locale?: string): string {
  if (locale === "en") {
    return `${period} ${year}`;
  }
  return `${year} ${period}`;
}
