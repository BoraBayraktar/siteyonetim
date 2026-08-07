import type { OfficialLetterhead, OfficialSignatureSlot } from "./contract";
import {
  BODY_FONT_SIZE,
  SMALL_FONT_SIZE,
  TABLE_FONT_SIZE,
  TITLE_FONT_SIZE,
  ensureSpace,
  type PdfDoc,
} from "./pdf-fonts";

export function writeOfficialLetterhead(pdf: PdfDoc, letterhead: OfficialLetterhead) {
  const contentWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

  pdf
    .moveTo(pdf.page.margins.left, pdf.y)
    .lineTo(pdf.page.width - pdf.page.margins.right, pdf.y)
    .lineWidth(1.5)
    .strokeColor("#1a1a1a")
    .stroke();
  pdf.moveDown(0.5);

  if (letterhead.organizationLine) {
    pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(letterhead.organizationLine, { align: "center" });
  }
  if (letterhead.propertyLine) {
    pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(letterhead.propertyLine, { align: "center" });
  }
  if (letterhead.addressLine) {
    pdf.font("Body").fontSize(SMALL_FONT_SIZE).fillColor("#444444").text(letterhead.addressLine, { align: "center" });
    pdf.fillColor("#000000");
  }
  if (letterhead.periodLine) {
    pdf.font("Body").fontSize(SMALL_FONT_SIZE).text(letterhead.periodLine, { align: "center" });
  }
  if (letterhead.documentDateLine) {
    pdf.font("Body").fontSize(SMALL_FONT_SIZE).text(letterhead.documentDateLine, { align: "center" });
  }

  pdf.moveDown(0.5);
  pdf
    .moveTo(pdf.page.margins.left, pdf.y)
    .lineTo(pdf.page.width - pdf.page.margins.right, pdf.y)
    .lineWidth(0.5)
    .strokeColor("#cccccc")
    .stroke();
  pdf.moveDown(0.75);

  void contentWidth;
}

export function writeDocumentTitle(pdf: PdfDoc, title: string) {
  pdf.font("BodyBold").fontSize(TITLE_FONT_SIZE).text(title, { align: "center", underline: true });
  pdf.moveDown(0.75);
}

export function writeNumberedArticle(
  pdf: PdfDoc,
  heading: string,
  lines: string[],
  minSpace = 60,
) {
  ensureSpace(pdf, minSpace);
  pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(heading);
  pdf.font("Body").fontSize(BODY_FONT_SIZE);
  for (const line of lines) {
    ensureSpace(pdf, 16);
    pdf.text(line, { lineGap: 2, paragraphGap: 2 });
  }
  pdf.moveDown(0.5);
}

export function writeOfficialSignatureBlock(
  pdf: PdfDoc,
  heading: string,
  slots: OfficialSignatureSlot[],
) {
  ensureSpace(pdf, 100);
  pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(heading);
  pdf.moveDown(0.75);

  const slotCount = Math.max(1, slots.length);
  const contentWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
  const gap = 12;
  const slotWidth = (contentWidth - gap * (slotCount - 1)) / slotCount;
  const startY = pdf.y;
  const lineY = startY + 36;

  slots.forEach((slot, index) => {
    const x = pdf.page.margins.left + index * (slotWidth + gap);
    pdf
      .moveTo(x, lineY)
      .lineTo(x + slotWidth - 8, lineY)
      .strokeColor("#333333")
      .lineWidth(0.75)
      .stroke();
    pdf.font("Body").fontSize(SMALL_FONT_SIZE);
    pdf.text(slot.roleLabel, x, lineY + 6, { width: slotWidth - 8, align: "center" });
    pdf.text(slot.namePlaceholder, x, lineY + 18, { width: slotWidth - 8, align: "center" });
    pdf.text(slot.datePlaceholder, x, lineY + 30, { width: slotWidth - 8, align: "center" });
  });

  pdf.y = lineY + 52;
  pdf.moveDown(0.5);
}

export function writeDataTable(
  pdf: PdfDoc,
  headers: string[],
  rows: string[][],
  footer?: string[],
) {
  if (headers.length === 0) return;

  const colCount = headers.length;
  const tableWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
  const colWidth = tableWidth / colCount;
  const left = pdf.page.margins.left;

  ensureSpace(pdf, 40);
  pdf.font("BodyBold").fontSize(TABLE_FONT_SIZE);
  const headerY = pdf.y;
  headers.forEach((header, index) => {
    pdf.text(header, left + index * colWidth, headerY, {
      width: colWidth - 4,
      lineBreak: false,
    });
  });
  pdf.y = headerY + TABLE_FONT_SIZE + 6;
  pdf
    .moveTo(left, pdf.y)
    .lineTo(left + tableWidth, pdf.y)
    .strokeColor("#bbbbbb")
    .stroke();
  pdf.moveDown(0.25);

  pdf.font("Body").fontSize(TABLE_FONT_SIZE);
  for (const row of rows) {
    ensureSpace(pdf, 18);
    const rowY = pdf.y;
    row.forEach((cell, index) => {
      pdf.text(cell, left + index * colWidth, rowY, {
        width: colWidth - 4,
        lineBreak: false,
      });
    });
    pdf.y = rowY + TABLE_FONT_SIZE + 4;
    pdf
      .moveTo(left, pdf.y)
      .lineTo(left + tableWidth, pdf.y)
      .strokeColor("#eeeeee")
      .stroke();
    pdf.moveDown(0.15);
  }

  if (footer?.length) {
    ensureSpace(pdf, 18);
    pdf.font("BodyBold").fontSize(TABLE_FONT_SIZE);
    const footerY = pdf.y;
    footer.forEach((cell, index) => {
      pdf.text(cell, left + index * colWidth, footerY, {
        width: colWidth - 4,
        lineBreak: false,
      });
    });
    pdf.moveDown(0.75);
  }
}

export function writePlainLines(pdf: PdfDoc, lines: string[]) {
  pdf.font("Body").fontSize(BODY_FONT_SIZE);
  for (const line of lines) {
    ensureSpace(pdf, 16);
    pdf.text(line, { lineGap: 4 });
  }
}
