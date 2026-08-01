import { ReportExportFormat } from "@siteyonetim/db";

import type {
  AuditorReportDocument,
  ReportingCoreContract,
  ReportTableDocument,
  RenderedReportFile,
  ZipArchiveEntry,
} from "./contract";
import { contentTypeForFormat, extensionForFormat } from "./contract";
import { renderAuditorTemplatePdf } from "./render-auditor-template-pdf";
import { renderCsvBuffer } from "./render-csv";
import { renderPdfBuffer } from "./render-pdf";
import { renderXlsxBuffer } from "./render-xlsx";
import { renderZipBuffer } from "./render-zip";

export class ReportingCoreService implements ReportingCoreContract {
  async render(format: ReportExportFormat, document: ReportTableDocument): Promise<RenderedReportFile> {
    let buffer: Buffer;
    switch (format) {
      case ReportExportFormat.XLSX:
        buffer = await renderXlsxBuffer(document);
        break;
      case ReportExportFormat.PDF:
        buffer = await renderPdfBuffer(document);
        break;
      case ReportExportFormat.CSV:
      default:
        buffer = renderCsvBuffer(document);
        break;
    }

    return {
      buffer,
      contentType: contentTypeForFormat(format),
      extension: extensionForFormat(format),
    };
  }

  async renderAuditorTemplate(document: AuditorReportDocument): Promise<RenderedReportFile> {
    const buffer = await renderAuditorTemplatePdf(document);
    return {
      buffer,
      contentType: contentTypeForFormat(ReportExportFormat.PDF),
      extension: "pdf",
    };
  }

  async renderZip(entries: ZipArchiveEntry[]): Promise<RenderedReportFile> {
    const buffer = await renderZipBuffer(entries);
    return {
      buffer,
      contentType: contentTypeForFormat(ReportExportFormat.ZIP),
      extension: "zip",
    };
  }
}

export function createReportingCoreService(): ReportingCoreService {
  return new ReportingCoreService();
}
