import type { ReportExportFormat, AuditorReportPeriod } from "@siteyonetim/db";

export type StandardReportKind =
  | "DUE_ACCRUAL_SUMMARY"
  | "DUE_COLLECTION"
  | "EXPENSE_BREAKDOWN"
  | "CASHBOX_SUMMARY"
  | "DEBT_AGING"
  | "BANK_RECONCILIATION"
  | "ANNUAL_INCOME_EXPENSE"
  | "AUDITOR_REPORT_TEMPLATE"
  | "AUDIT_PACKAGE";

export const ANNUAL_REPORT_KINDS: StandardReportKind[] = [
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
];

export function isAnnualReportKind(kind: StandardReportKind): boolean {
  return ANNUAL_REPORT_KINDS.includes(kind);
}

export type ReportFilter = {
  organizationId: string;
  propertyId: string;
  year: number;
  month: number;
  blockId?: string | null;
  actorUserId?: string | null;
  locale?: string;
  fromMonth?: number;
  toMonth?: number;
};

export type ReportExportDto = {
  id: string;
  reportKind: StandardReportKind;
  format: ReportExportFormat;
  year: number;
  month: number;
  blockId: string | null;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

export type RequestReportExportInput = ReportFilter & {
  reportKind: StandardReportKind;
  format?: ReportExportFormat;
};

export type ExportAuditorReportInput = ReportFilter & {
  auditorPeriod?: AuditorReportPeriod;
  opinionOverride?: import("./auditor-report-builder").AuditorOpinionOverride;
};

export type DueAccrualSummaryRow = {
  unitCode: string;
  blockName: string | null;
  definitionName: string;
  lineKind: string;
  amount: string;
  supplierLateFeeAllocationMode?: string | null;
  supplierReference?: string | null;
};

export type DueAccrualSummaryReport = {
  rows: DueAccrualSummaryRow[];
  totalAccrued: string;
};

export type DueCollectionRow = {
  paymentDate: string;
  partyName: string | null;
  amount: string;
  documentNo: string | null;
  description: string | null;
};

export type DueCollectionReport = {
  rows: DueCollectionRow[];
  totalCollected: string;
};

export type ExpenseBreakdownRow = {
  categoryName: string;
  amount: string;
};

export type ExpenseBreakdownReport = {
  rows: ExpenseBreakdownRow[];
  totalExpense: string;
};

export type CashboxSummaryRow = {
  name: string;
  balance: string;
};

export type CashboxSummaryReport = {
  rows: CashboxSummaryRow[];
  totalBalance: string;
};

export type DebtAgingRow = {
  unitCode: string;
  blockName: string | null;
  partyName: string | null;
  totalDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
};

export type DebtAgingReport = {
  rows: DebtAgingRow[];
  totalDebt: string;
};

export type AnnualIncomeExpenseRow = {
  label: string;
  section: "INCOME" | "EXPENSE" | "SUMMARY" | "BUDGET";
  amount: string;
  plannedAmount?: string | null;
  variance?: string | null;
};

export type AnnualIncomeExpenseReport = {
  year: number;
  propertyName: string;
  rows: AnnualIncomeExpenseRow[];
  totalIncome: string;
  totalExpense: string;
  netResult: string;
  dueCollectionTotal: string;
  openDebtTotal: string;
  cashboxBalance: string;
  budgetPlannedTotal: string | null;
  budgetActualTotal: string | null;
  /** Posted accrual lines total for the report year */
  totalAccruedYear: string;
  /** Sum of paidAmount on posted accrual lines for the year */
  totalCollectedOnAccrualsYear: string;
  /** Percent collected / accrued; null when no accruals */
  collectionRatePercent: string | null;
};

export type PortalIncomeExpenseInput = {
  organizationId: string;
  propertyId: string;
  year?: number;
  locale?: string;
};

export type PortalIncomeExpenseSummaryDto = {
  propertyId: string;
  propertyName: string;
  year: number;
  totalIncome: string;
  totalExpense: string;
  netResult: string;
  dueCollectionTotal: string;
  expenseRows: ExpenseBreakdownRow[];
};

export type PropertyInfoDto = {
  id: string;
  name: string;
  address: string | null;
  organizationName: string;
};

export type PropertyDashboardDebtorRow = {
  unitCode: string;
  blockName: string | null;
  partyName: string | null;
  totalDebt: string;
  aging61Plus: string;
};

export type PropertyDashboardDto = {
  year: number;
  month: number;
  totalDebt: string;
  overdueUnitCount: number;
  monthlyAccrued: string;
  monthlyCollected: string;
  cashboxBalance: string;
  topDebtors: PropertyDashboardDebtorRow[];
};

export type PropertySetupStepId =
  | "BLOCKS"
  | "UNITS"
  | "PARTIES_OCCUPANCY"
  | "DUES_DEFINITIONS"
  | "CASHBOX"
  | "FIRST_ACCRUAL"
  | "STAFF_PROFILE";

export type PropertySetupStepDto = {
  id: PropertySetupStepId;
  complete: boolean;
  current: number;
  target: number;
};

export type PropertySetupStatusDto = {
  propertyId: string;
  steps: PropertySetupStepDto[];
  optionalSteps: PropertySetupStepDto[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};

export type ProcessPendingExportsResult = {
  processed: number;
  ready: number;
  failed: number;
};

export interface StandardReportingContract {
  dueAccrualSummary(filter: ReportFilter): Promise<DueAccrualSummaryReport>;
  dueCollection(filter: ReportFilter): Promise<DueCollectionReport>;
  expenseBreakdown(filter: ReportFilter): Promise<ExpenseBreakdownReport>;
  cashboxSummary(filter: ReportFilter): Promise<CashboxSummaryReport>;
  debtAging(filter: ReportFilter): Promise<DebtAgingReport>;
  bankReconciliation(
    filter: ReportFilter,
  ): Promise<import("@siteyonetim/finance-banking").BankReconciliationSummaryDto>;
  annualIncomeExpense(filter: ReportFilter): Promise<AnnualIncomeExpenseReport>;
  getPortalIncomeExpenseSummary(input: PortalIncomeExpenseInput): Promise<PortalIncomeExpenseSummaryDto>;
  propertyInfo(organizationId: string, propertyId: string): Promise<PropertyInfoDto>;
  propertyDashboard(filter: ReportFilter): Promise<PropertyDashboardDto>;
  propertySetupStatus(organizationId: string, propertyId: string): Promise<PropertySetupStatusDto>;
  exportCsv(kind: StandardReportKind, filter: ReportFilter): Promise<string>;
  exportReportFile(
    kind: StandardReportKind,
    filter: ReportFilter,
    format: ReportExportFormat,
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }>;
  exportAuditorReportTemplate(
    input: ExportAuditorReportInput,
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }>;
  requestReportExport(input: RequestReportExportInput): Promise<ReportExportDto>;
  processReportExport(exportId: string): Promise<ReportExportDto>;
  processPendingExports(limit?: number): Promise<ProcessPendingExportsResult>;
  listReportExports(
    organizationId: string,
    propertyId: string,
    limit?: number,
  ): Promise<ReportExportDto[]>;
  readExportFile(
    organizationId: string,
    exportId: string,
  ): Promise<{ data: Buffer; fileName: string; contentType: string }>;
}
