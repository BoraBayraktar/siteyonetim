import type { ReportTableDocument } from "./contract";
import { resolveOfficialLetterhead } from "./official-letterhead";
import {
  createPdfDocument,
  pdfToBuffer,
  registerPdfFonts,
} from "./pdf-fonts";
import {
  writeDataTable,
  writeDocumentTitle,
  writeOfficialLetterhead,
} from "./pdf-layout";

export function renderPdfBuffer(document: ReportTableDocument): Promise<Buffer> {
  const layout =
    document.meta?.layout ??
    (document.meta?.documentKind === "PERIOD_REGISTER" ? "landscape" : "portrait");

  const pdf = createPdfDocument(layout);
  registerPdfFonts(pdf);

  if (document.meta) {
    writeOfficialLetterhead(pdf, resolveOfficialLetterhead(document.meta));
  }

  writeDocumentTitle(pdf, document.title);
  writeDataTable(pdf, document.headers, document.rows, document.footer);

  return pdfToBuffer(pdf);
}
