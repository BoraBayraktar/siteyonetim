import PDFDocument from "pdfkit";

import type { AuditorReportDocument } from "./contract";

function writeMeta(pdf: InstanceType<typeof PDFDocument>, meta: AuditorReportDocument["meta"]) {
  if (meta.propertyName) {
    pdf.fontSize(11).text(meta.propertyName, { align: "center" });
  }
  if (meta.subtitle) {
    pdf.fontSize(10).text(meta.subtitle, { align: "center" });
  }
  if (meta.periodLabel) {
    pdf.fontSize(10).text(meta.periodLabel, { align: "center" });
  }
  pdf.moveDown(0.75);
}

export function renderAuditorTemplatePdf(document: AuditorReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(14).text(document.title, { align: "center", underline: true });
    pdf.moveDown(0.5);
    writeMeta(pdf, document.meta);

    pdf.fontSize(10);
    for (const section of document.sections) {
      if (pdf.y > pdf.page.height - 120) pdf.addPage();
      pdf.font("Helvetica-Bold").text(section.heading);
      pdf.font("Helvetica");
      for (const line of section.lines) {
        pdf.text(line, { lineGap: 2 });
      }
      pdf.moveDown(0.5);
    }

    if (document.financialTable) {
      if (pdf.y > pdf.page.height - 120) pdf.addPage();
      pdf.font("Helvetica-Bold").text(document.financialTable.headers.join("  |  "));
      pdf.font("Helvetica");
      for (const row of document.financialTable.rows) {
        if (pdf.y > pdf.page.height - 72) pdf.addPage();
        pdf.text(row.join("  |  "), { lineGap: 2 });
      }
      if (document.financialTable.footer?.length) {
        pdf.moveDown(0.5);
        pdf.font("Helvetica-Bold").text(document.financialTable.footer.join("  |  "));
      }
      pdf.moveDown(0.75);
    }

    if (pdf.y > pdf.page.height - 160) pdf.addPage();
    pdf.font("Helvetica-Bold").text(document.opinionHeading);
    pdf.font("Helvetica");
    for (const line of document.opinionLines) {
      pdf.text(line, { lineGap: 4 });
    }
    pdf.moveDown(1);

    pdf.font("Helvetica-Bold").text(document.signatureHeading);
    pdf.font("Helvetica");
    for (const line of document.signatureLines) {
      pdf.text(line, { lineGap: 6 });
    }

    if (document.meta.generatedAt) {
      pdf.moveDown(1);
      pdf.fontSize(8).text(document.meta.generatedAt, { align: "right" });
    }

    pdf.end();
  });
}
