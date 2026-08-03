import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import PDFDocument from "pdfkit";

import type { OfficialLetterheadMeta, OfficialSignatureBlock } from "./contract";

export const PAGE_MARGIN = 48;
export const TABLE_FONT_SIZE = 9;
export const BODY_FONT_SIZE = 10;
export const TITLE_FONT_SIZE = 14;
export const LEGAL_FONT_SIZE = 7.5;

function resolveFontPath(fileName: string): string {
  const candidates = [
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets/fonts", fileName),
    path.join(process.cwd(), "packages/modules/reporting-core/assets/fonts", fileName),
    path.join(process.cwd(), "../../packages/modules/reporting-core/assets/fonts", fileName),
    path.join(process.cwd(), "apps/web/public/fonts", fileName),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Font not found: ${fileName}`);
}

let fontsRegistered = false;
let FONT_REGULAR = "";
let FONT_BOLD = "";

function ensureFonts() {
  if (!fontsRegistered) {
    FONT_REGULAR = resolveFontPath("NotoSans-Regular.ttf");
    FONT_BOLD = resolveFontPath("NotoSans-Bold.ttf");
    fontsRegistered = true;
  }
}

export function createOfficialPdfDocument(): InstanceType<typeof PDFDocument> {
  ensureFonts();
  return new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });
}

export function registerOfficialFonts(pdf: InstanceType<typeof PDFDocument>) {
  ensureFonts();
  pdf.registerFont("Body", FONT_REGULAR);
  pdf.registerFont("BodyBold", FONT_BOLD);
}

function articleLabel(index: number, locale?: string): string {
  return locale === "en" ? `Article ${index}` : `Madde ${index}`;
}

export function drawOfficialLetterhead(
  pdf: InstanceType<typeof PDFDocument>,
  title: string,
  meta: OfficialLetterheadMeta,
) {
  pdf.font("BodyBold").fontSize(TITLE_FONT_SIZE);

  if (meta.organizationName) {
    pdf.text(meta.organizationName, { align: "center" });
  }
  if (meta.propertyName) {
    pdf.font("Body").fontSize(BODY_FONT_SIZE).text(meta.propertyName, { align: "center" });
  }
  if (meta.subtitle) {
    pdf.fontSize(9).text(meta.subtitle, { align: "center" });
  }

  pdf.moveDown(0.35);
  pdf
    .moveTo(PAGE_MARGIN, pdf.y)
    .lineTo(pdf.page.width - PAGE_MARGIN, pdf.y)
    .strokeColor("#333333")
    .lineWidth(0.75)
    .stroke();
  pdf.moveDown(0.5);

  pdf.font("BodyBold").fontSize(TITLE_FONT_SIZE).text(title, { align: "center", underline: true });
  pdf.moveDown(0.35);

  pdf.font("Body").fontSize(9);
  const detailParts: string[] = [];
  if (meta.periodLabel) {
    detailParts.push(meta.periodLabel);
  }
  if (meta.documentRef) {
    detailParts.push(meta.documentRef);
  }
  if (detailParts.length > 0) {
    pdf.text(detailParts.join("  ·  "), { align: "center" });
  }
  if (meta.generatedAt) {
    pdf.text(meta.generatedAt, { align: "center" });
  }

  if (meta.legalNotice) {
    pdf.moveDown(0.35);
    pdf.fontSize(LEGAL_FONT_SIZE).fillColor("#555555").text(meta.legalNotice, {
      align: "center",
      lineGap: 1,
    });
    pdf.fillColor("#000000");
  }

  pdf.moveDown(0.75);
}

export function drawNumberedArticle(
  pdf: InstanceType<typeof PDFDocument>,
  articleIndex: number,
  heading: string,
  lines: string[],
  locale?: string,
) {
  if (pdf.y > pdf.page.height - PAGE_MARGIN - 60) {
    pdf.addPage();
  }

  pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(`${articleLabel(articleIndex, locale)} — ${heading}`);
  pdf.moveDown(0.25);
  pdf.font("Body").fontSize(BODY_FONT_SIZE);
  for (const line of lines) {
    if (pdf.y > pdf.page.height - PAGE_MARGIN - 20) {
      pdf.addPage();
    }
    pdf.text(line, { lineGap: 2, indent: 12 });
  }
  pdf.moveDown(0.5);
}

function computeColumnWidths(
  pdf: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  tableWidth: number,
): number[] {
  pdf.font("Body").fontSize(TABLE_FONT_SIZE);
  const colCount = headers.length;
  const minWidths = headers.map((header, index) => {
    let max = pdf.widthOfString(header);
    for (const row of rows) {
      const cell = row[index] ?? "";
      max = Math.max(max, pdf.widthOfString(cell));
    }
    return max + 12;
  });
  const totalMin = minWidths.reduce((sum, width) => sum + width, 0);
  if (totalMin <= tableWidth) {
    const extra = tableWidth - totalMin;
    return minWidths.map((width) => width + extra / colCount);
  }
  const scale = tableWidth / totalMin;
  return minWidths.map((width) => width * scale);
}

function drawTableRow(
  pdf: InstanceType<typeof PDFDocument>,
  cells: string[],
  columnWidths: number[],
  startX: number,
  bold: boolean,
) {
  pdf.font(bold ? "BodyBold" : "Body").fontSize(TABLE_FONT_SIZE);
  const lineHeight = TABLE_FONT_SIZE + 4;
  const cellLines = cells.map((cell, index) =>
    pdf.heightOfString(cell, { width: columnWidths[index] - 8 }),
  );
  const rowHeight = Math.max(lineHeight, ...cellLines) + 6;

  if (pdf.y + rowHeight > pdf.page.height - PAGE_MARGIN) {
    pdf.addPage();
  }

  const rowTop = pdf.y;
  let x = startX;
  for (let i = 0; i < cells.length; i += 1) {
    pdf.text(cells[i] ?? "", x + 4, rowTop + 3, {
      width: columnWidths[i] - 8,
      lineBreak: true,
    });
    x += columnWidths[i];
  }
  pdf
    .moveTo(startX, rowTop + rowHeight)
    .lineTo(startX + columnWidths.reduce((sum, width) => sum + width, 0), rowTop + rowHeight)
    .strokeColor("#dddddd")
    .stroke();
  pdf.y = rowTop + rowHeight;
}

export function drawOfficialTable(
  pdf: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  footer?: string[],
) {
  const tableWidth = pdf.page.width - PAGE_MARGIN * 2;
  const columnWidths = computeColumnWidths(pdf, headers, [...rows, ...(footer ? [footer] : [])], tableWidth);
  const startX = PAGE_MARGIN;

  drawTableRow(pdf, headers, columnWidths, startX, true);
  for (const row of rows) {
    drawTableRow(pdf, row, columnWidths, startX, false);
  }
  if (footer?.length) {
    drawTableRow(pdf, footer, columnWidths, startX, true);
  }
  pdf.moveDown(0.5);
}

export function drawSignatureBlocks(
  pdf: InstanceType<typeof PDFDocument>,
  heading: string | undefined,
  blocks: OfficialSignatureBlock[],
  fallbackLines?: string[],
) {
  if (pdf.y > pdf.page.height - PAGE_MARGIN - blocks.length * 48 - 40) {
    pdf.addPage();
  }

  if (heading) {
    pdf.font("BodyBold").fontSize(BODY_FONT_SIZE).text(heading);
    pdf.moveDown(0.35);
  }

  if (blocks.length > 0) {
    pdf.font("Body").fontSize(BODY_FONT_SIZE);
    for (const block of blocks) {
      if (pdf.y > pdf.page.height - PAGE_MARGIN - 40) {
        pdf.addPage();
      }
      pdf.font("BodyBold").text(block.role);
      pdf.font("Body");
      if (block.nameLine) {
        pdf.text(block.nameLine, { lineGap: 4 });
      }
      if (block.dateLine) {
        pdf.text(block.dateLine, { lineGap: 4 });
      }
      pdf.moveDown(0.75);
    }
    return;
  }

  if (fallbackLines?.length) {
    pdf.font("Body");
    for (const line of fallbackLines) {
      pdf.text(line, { lineGap: 6 });
    }
  }
}

export function stampPageNumbers(pdf: InstanceType<typeof PDFDocument>, locale?: string) {
  const range = pdf.bufferedPageRange();
  const total = range.count;
  const label = locale === "en" ? "Page" : "Sayfa";

  for (let i = 0; i < total; i += 1) {
    pdf.switchToPage(i);
    pdf.font("Body").fontSize(8).fillColor("#666666");
    pdf.text(`${label} ${i + 1} / ${total}`, PAGE_MARGIN, pdf.page.height - PAGE_MARGIN + 12, {
      align: "center",
      width: pdf.page.width - PAGE_MARGIN * 2,
    });
    pdf.fillColor("#000000");
  }
}

export function defaultLegalNotice(locale?: string): string {
  if (locale === "en") {
    return "System-generated draft for print review. Legal counsel approval is recommended before binding use.";
  }
  return "Basılı çıktı incelemesi için sistem taslağıdır. Hukuki bağlayıcılık için hukuk danışmanlığı onayı önerilir.";
}

export function defaultDocumentRef(locale?: string): string {
  if (locale === "en") {
    return "Ref: Official output";
  }
  return "Ref: Resmi çıktı";
}
