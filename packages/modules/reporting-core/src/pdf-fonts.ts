import path from "node:path";
import { fileURLToPath } from "node:url";

import PDFDocument from "pdfkit";

export const PAGE_MARGIN = 48;
export const BODY_FONT_SIZE = 10;
export const TITLE_FONT_SIZE = 14;
export const TABLE_FONT_SIZE = 9;
export const SMALL_FONT_SIZE = 8;

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const FONT_REGULAR = path.join(moduleDir, "../assets/fonts/NotoSans-Regular.ttf");
const FONT_BOLD = path.join(moduleDir, "../assets/fonts/NotoSans-Bold.ttf");

export type PdfDoc = InstanceType<typeof PDFDocument>;

export function createPdfDocument(layout: "portrait" | "landscape" = "portrait"): PdfDoc {
  return new PDFDocument({
    margin: PAGE_MARGIN,
    size: "A4",
    layout,
  });
}

export function registerPdfFonts(pdf: PdfDoc) {
  pdf.registerFont("Body", FONT_REGULAR);
  pdf.registerFont("BodyBold", FONT_BOLD);
}

export function pdfToBuffer(pdf: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.end();
  });
}

export function ensureSpace(pdf: PdfDoc, minHeight: number) {
  if (pdf.y + minHeight > pdf.page.height - PAGE_MARGIN) {
    pdf.addPage();
  }
}
