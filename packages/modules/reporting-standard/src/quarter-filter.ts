export type ReportQuarterScope = "ANNUAL" | "Q1" | "Q2" | "Q3" | "Q4";

const QUARTER_SCOPES: ReportQuarterScope[] = ["ANNUAL", "Q1", "Q2", "Q3", "Q4"];

export function parseReportQuarter(raw: string | null | undefined): ReportQuarterScope {
  if (raw && QUARTER_SCOPES.includes(raw as ReportQuarterScope)) {
    return raw as ReportQuarterScope;
  }
  return "ANNUAL";
}

export function reportQuarterToMonthRange(
  quarter: ReportQuarterScope,
): { fromMonth?: number; toMonth?: number } {
  switch (quarter) {
    case "Q1":
      return { fromMonth: 1, toMonth: 3 };
    case "Q2":
      return { fromMonth: 4, toMonth: 6 };
    case "Q3":
      return { fromMonth: 7, toMonth: 9 };
    case "Q4":
      return { fromMonth: 10, toMonth: 12 };
    default:
      return {};
  }
}
