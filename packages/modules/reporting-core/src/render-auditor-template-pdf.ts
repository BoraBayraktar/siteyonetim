import type { AuditorReportDocument } from "./contract";
import {
  defaultAuditorSignatureSlots,
  formatNumberedArticleHeading,
  resolveOfficialLetterhead,
} from "./official-letterhead";
import {
  BODY_FONT_SIZE,
  createPdfDocument,
  pdfToBuffer,
  registerPdfFonts,
} from "./pdf-fonts";
import {
  writeDataTable,
  writeDocumentTitle,
  writeNumberedArticle,
  writeOfficialLetterhead,
  writeOfficialSignatureBlock,
} from "./pdf-layout";

export function renderAuditorTemplatePdf(document: AuditorReportDocument): Promise<Buffer> {
  const pdf = createPdfDocument("portrait");
  registerPdfFonts(pdf);

  writeOfficialLetterhead(pdf, resolveOfficialLetterhead(document.meta));
  writeDocumentTitle(pdf, document.title);

  document.sections.forEach((section, index) => {
    writeNumberedArticle(
      pdf,
      formatNumberedArticleHeading(index, section.heading, document.meta.locale),
      section.lines,
    );
  });

  if (document.financialTable) {
    writeDataTable(
      pdf,
      document.financialTable.headers,
      document.financialTable.rows,
      document.financialTable.footer,
    );
  }

  writeNumberedArticle(
    pdf,
    formatNumberedArticleHeading(document.sections.length, document.opinionHeading, document.meta.locale),
    document.opinionLines,
    80,
  );

  const signatureSlots = defaultAuditorSignatureSlots(document.meta.locale);
  writeOfficialSignatureBlock(pdf, document.signatureHeading, signatureSlots);

  if (document.meta.generatedAt) {
    pdf.moveDown(0.5);
    pdf.font("Body").fontSize(BODY_FONT_SIZE - 2).fillColor("#666666");
    pdf.text(document.meta.generatedAt, { align: "right" });
    pdf.fillColor("#000000");
  }

  return pdfToBuffer(pdf);
}
