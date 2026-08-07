import type { ReportTableDocument } from "@siteyonetim/reporting-core";

import type {
  AnnualIncomeExpenseReport,
  CashboxSummaryReport,
  DebtAgingReport,
  DueAccrualSummaryReport,
  DueCollectionReport,
  ExpenseBreakdownReport,
  ReportFilter,
  StandardReportKind,
} from "./contract";
import type { BankReconciliationSummaryDto } from "@siteyonetim/finance-banking";
import { isAnnualReportKind } from "./contract";

export function buildReportTableDocument(
  kind: StandardReportKind,
  filter: ReportFilter,
  data: {
    accrual?: DueAccrualSummaryReport;
    collection?: DueCollectionReport;
    expense?: ExpenseBreakdownReport;
    cashbox?: CashboxSummaryReport;
    aging?: DebtAgingReport;
    annual?: AnnualIncomeExpenseReport;
    bankReconciliation?: BankReconciliationSummaryDto;
  },
): ReportTableDocument {
  const period = isAnnualReportKind(kind)
    ? String(filter.year)
    : filter.month === 0
      ? String(filter.year)
      : `${filter.month}/${filter.year}`;
  const meta = {
    locale: filter.locale,
    propertyName: data.annual?.propertyName,
    periodLabel: period,
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  switch (kind) {
    case "DUE_ACCRUAL_SUMMARY": {
      const report = data.accrual ?? { rows: [], totalAccrued: "0" };
      return {
        title: `Due accrual summary — ${period}`,
        headers: ["unit", "block", "definition", "lineKind", "amount"],
        rows: report.rows.map((r) => [
          r.unitCode,
          r.blockName ?? "",
          r.definitionName,
          r.lineKind,
          r.amount,
        ]),
        footer: ["", "", "", "total", report.totalAccrued],
        meta,
      };
    }
    case "DUE_COLLECTION": {
      const report = data.collection ?? { rows: [], totalCollected: "0" };
      return {
        title: `Due collection — ${period}`,
        headers: ["date", "party", "amount", "documentNo", "description"],
        rows: report.rows.map((r) => [
          r.paymentDate,
          r.partyName ?? "",
          r.amount,
          r.documentNo ?? "",
          r.description ?? "",
        ]),
        footer: ["", "", report.totalCollected, "", ""],
        meta,
      };
    }
    case "EXPENSE_BREAKDOWN": {
      const report = data.expense ?? { rows: [], totalExpense: "0" };
      return {
        title: `Expense breakdown — ${period}`,
        headers: ["category", "amount"],
        rows: report.rows.map((r) => [r.categoryName, r.amount]),
        footer: ["total", report.totalExpense],
        meta,
      };
    }
    case "CASHBOX_SUMMARY": {
      const report = data.cashbox ?? { rows: [], totalBalance: "0" };
      return {
        title: `Cashbox summary — ${period}`,
        headers: ["cashbox", "balance"],
        rows: report.rows.map((r) => [r.name, r.balance]),
        footer: ["total", report.totalBalance],
        meta,
      };
    }
    case "DEBT_AGING": {
      const report = data.aging ?? { rows: [], totalDebt: "0" };
      return {
        title: `Debt aging — ${period}`,
        headers: ["unit", "block", "party", "0-30", "31-60", "61+", "total"],
        rows: report.rows.map((r) => [
          r.unitCode,
          r.blockName ?? "",
          r.partyName ?? "",
          r.aging0To30,
          r.aging31To60,
          r.aging61Plus,
          r.totalDebt,
        ]),
        footer: ["", "", "", "", "", "total", report.totalDebt],
        meta,
      };
    }
    case "BANK_RECONCILIATION": {
      const report = data.bankReconciliation ?? {
        year: filter.year,
        month: filter.month,
        totalLines: 0,
        matchedLines: 0,
        unmatchedLines: 0,
        ignoredLines: 0,
        unmatchedAmountTotal: "0",
        rows: [],
      };
      return {
        title: `Bank reconciliation — ${period}`,
        headers: ["date", "cashbox", "amount", "description", "status", "matchedTarget"],
        rows: report.rows.map((r) => [
          r.lineDate,
          r.cashboxName,
          r.amount,
          r.description ?? "",
          r.matchStatus,
          r.matchedTarget ?? "",
        ]),
        footer: [
          "summary",
          `matched ${report.matchedLines}`,
          `unmatched ${report.unmatchedLines}`,
          report.unmatchedAmountTotal,
          "",
          "",
        ],
        meta,
      };
    }
    case "ANNUAL_INCOME_EXPENSE": {
      const report = data.annual ?? {
        year: filter.year,
        propertyName: "",
        rows: [],
        totalIncome: "0",
        totalExpense: "0",
        netResult: "0",
        dueCollectionTotal: "0",
        openDebtTotal: "0",
        cashboxBalance: "0",
        budgetPlannedTotal: null,
        budgetActualTotal: null,
      };
      const hasBudget = report.budgetPlannedTotal != null;
      const headers = hasBudget
        ? ["section", "item", "amount", "planned", "variance"]
        : ["section", "item", "amount"];
      return {
        title: `Annual income & expense — ${filter.year}`,
        headers,
        rows: report.rows.map((r) =>
          hasBudget
            ? [r.section, r.label, r.amount, r.plannedAmount ?? "", r.variance ?? ""]
            : [r.section, r.label, r.amount],
        ),
        footer: hasBudget
          ? ["SUMMARY", "Net", report.netResult, report.budgetPlannedTotal ?? "", ""]
          : ["SUMMARY", "Net", report.netResult],
        meta: { ...meta, propertyName: report.propertyName, periodLabel: String(filter.year) },
      };
    }
    default:
      throw new Error("REPORT_KIND_UNKNOWN");
  }
}
