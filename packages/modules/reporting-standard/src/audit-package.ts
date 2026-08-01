import { ReportExportFormat } from "@siteyonetim/db";
import type { ReportingCoreContract } from "@siteyonetim/reporting-core";

import type { ReportFilter, StandardReportKind } from "./contract";

type ExportFn = (
  kind: StandardReportKind,
  filter: ReportFilter,
  format: ReportExportFormat,
) => Promise<{ buffer: Buffer; contentType: string; extension: string }>;

export async function buildAuditPackageZip(
  filter: ReportFilter,
  exportFn: ExportFn,
  reportingCore: ReportingCoreContract,
) {
  const year = filter.year;
  const yearFilter: ReportFilter = { ...filter, month: 12 };

  const [
    annualPdf,
    auditorPdf,
    collectionXlsx,
    expenseXlsx,
    agingPdf,
    cashboxPdf,
  ] = await Promise.all([
    exportFn("ANNUAL_INCOME_EXPENSE", { ...filter, month: 1 }, ReportExportFormat.PDF),
    exportFn("AUDITOR_REPORT_TEMPLATE", { ...filter, month: 1 }, ReportExportFormat.PDF),
    exportFn("DUE_COLLECTION", { ...filter, month: 0 }, ReportExportFormat.XLSX),
    exportFn("EXPENSE_BREAKDOWN", { ...filter, month: 0 }, ReportExportFormat.XLSX),
    exportFn("DEBT_AGING", yearFilter, ReportExportFormat.PDF),
    exportFn("CASHBOX_SUMMARY", yearFilter, ReportExportFormat.PDF),
  ]);

  return reportingCore.renderZip([
    { fileName: `gelir-gider-ozeti_${year}.pdf`, buffer: annualPdf.buffer },
    { fileName: `denetci-raporu-sablonu_${year}.pdf`, buffer: auditorPdf.buffer },
    { fileName: `tahsilat_${year}.xlsx`, buffer: collectionXlsx.buffer },
    { fileName: `gider-dagilimi_${year}.xlsx`, buffer: expenseXlsx.buffer },
    { fileName: `borc-yaslandirma_${year}-12.pdf`, buffer: agingPdf.buffer },
    { fileName: `kasa-ozeti_${year}-12.pdf`, buffer: cashboxPdf.buffer },
  ]);
}
