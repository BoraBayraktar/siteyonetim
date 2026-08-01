export const ANNUAL_REPORT_KINDS = [
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
] as const;

export type AnnualReportKind = (typeof ANNUAL_REPORT_KINDS)[number];

export function isAnnualReportKind(kind: string): kind is AnnualReportKind {
  return (ANNUAL_REPORT_KINDS as readonly string[]).includes(kind);
}
