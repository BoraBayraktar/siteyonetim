import ExcelJS from "exceljs";

import type { ReportTableDocument } from "./contract";

export async function renderXlsxBuffer(document: ReportTableDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  sheet.addRow([document.title]);
  sheet.addRow([]);
  sheet.addRow(document.headers);
  for (const row of document.rows) {
    sheet.addRow(row);
  }
  if (document.footer?.length) {
    sheet.addRow(document.footer);
  }
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(3).font = { bold: true };
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
