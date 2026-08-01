import type { ReportTableDocument } from "./contract";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvLine(cells: string[]) {
  return `${cells.map(csvEscape).join(",")}\n`;
}

export function renderCsvBuffer(document: ReportTableDocument): Buffer {
  let body = csvLine(document.headers);
  for (const row of document.rows) {
    body += csvLine(row);
  }
  if (document.footer?.length) {
    body += csvLine(document.footer);
  }
  return Buffer.from(`\uFEFF${body}`, "utf-8");
}
