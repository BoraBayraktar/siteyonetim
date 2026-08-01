import PDFDocument from "pdfkit";

import type { ReportTableDocument } from "./contract";

export function renderPdfBuffer(document: ReportTableDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(14).text(document.title, { underline: true });
    pdf.moveDown(0.25);
    if (document.meta?.propertyName) {
      pdf.fontSize(10).text(document.meta.propertyName);
    }
    if (document.meta?.periodLabel) {
      pdf.fontSize(10).text(document.meta.periodLabel);
    }
    if (document.meta?.subtitle) {
      pdf.fontSize(9).fillColor("#555555").text(document.meta.subtitle);
      pdf.fillColor("#000000");
    }
    pdf.moveDown(0.75);
    pdf.fontSize(9);

    pdf.text(document.headers.join("  |  "), { lineGap: 2 });
    pdf.moveDown(0.5);

    for (const row of document.rows) {
      if (pdf.y > pdf.page.height - 72) {
        pdf.addPage();
      }
      pdf.text(row.join("  |  "), { lineGap: 2 });
    }

    if (document.footer?.length) {
      pdf.moveDown(0.75);
      pdf.font("Helvetica-Bold").text(document.footer.join("  |  "));
    }

    pdf.end();
  });
}
