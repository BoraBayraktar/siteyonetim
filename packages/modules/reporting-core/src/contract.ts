import type { ReportExportFormat } from "@siteyonetim/db";

export type ReportDocumentMeta = {
  locale?: string;
  propertyName?: string;
  organizationName?: string;
  periodLabel?: string;
  generatedAt?: string;
  subtitle?: string;
  /** Official output profile for print-ready PDF layout (FAZ C4). */
  documentKind?: "STANDARD" | "PERIOD_REGISTER" | "ATTENDANCE_REGISTER";
  layout?: "portrait" | "landscape";
};

export type OfficialLetterhead = {
  organizationLine: string;
  propertyLine: string;
  addressLine?: string;
  periodLine?: string;
  documentDateLine?: string;
};

export type OfficialSignatureSlot = {
  roleLabel: string;
  namePlaceholder: string;
  datePlaceholder: string;
};

export type ReportTableDocument = {
  title: string;
  headers: string[];
  rows: string[][];
  footer?: string[];
  meta?: ReportDocumentMeta;
};

export type AuditorReportSection = {
  heading: string;
  lines: string[];
};

export type AuditorReportDocument = {
  title: string;
  meta: ReportDocumentMeta;
  sections: AuditorReportSection[];
  financialTable?: {
    headers: string[];
    rows: string[][];
    footer?: string[];
  };
  opinionHeading: string;
  opinionLines: string[];
  signatureHeading: string;
  signatureLines: string[];
};

export type ZipArchiveEntry = {
  fileName: string;
  buffer: Buffer;
};

export type RenderedReportFile = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

export interface ReportingCoreContract {
  render(format: ReportExportFormat, document: ReportTableDocument): Promise<RenderedReportFile>;
  renderAuditorTemplate(document: AuditorReportDocument): Promise<RenderedReportFile>;
  renderZip(entries: ZipArchiveEntry[]): Promise<RenderedReportFile>;
}

export function extensionForFormat(format: ReportExportFormat): string {
  if (format === "XLSX") return "xlsx";
  if (format === "PDF") return "pdf";
  if (format === "ZIP") return "zip";
  return "csv";
}

export function contentTypeForFormat(format: ReportExportFormat): string {
  if (format === "XLSX") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (format === "PDF") {
    return "application/pdf";
  }
  if (format === "ZIP") {
    return "application/zip";
  }
  return "text/csv; charset=utf-8";
}
