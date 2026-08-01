import ExcelJS from "exceljs";

import type { PartyDto } from "./contract";
import {
  columnIndexForPartyField,
  expandPartyImportRowCells,
  isPartyImportHeaderRow,
  mapPartyImportHeaders,
  parsePartyImportRow,
  partyImportHeadersForLocale,
  type ParsedPartyImportRow,
} from "./party-import-parse";

const MAX_IMPORT_ROWS = 500;

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return String(value.getTime());
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  if (typeof value === "object") {
    if ("text" in value && value.text != null) return String(value.text).trim();
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function rowToStrings(row: ExcelJS.Row): string[] {
  const values = row.values;
  if (!Array.isArray(values)) return [];
  return values.slice(1).map((v) => cellToString(v as ExcelJS.CellValue));
}

function rowIsEmpty(cells: string[]) {
  return cells.every((c) => !c.trim());
}

export async function parsePartiesXlsx(
  buffer: Buffer,
  maxRows = MAX_IMPORT_ROWS,
): Promise<{ rows: ParsedPartyImportRow[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  } catch {
    return { rows: [], errors: ["XLSX_INVALID"] };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], errors: ["XLSX_EMPTY"] };
  }

  const rows: ParsedPartyImportRow[] = [];
  const errors: string[] = [];
  let columnMap = null as ReturnType<typeof mapPartyImportHeaders>;
  let headerRowNumber = 0;

  sheet.eachRow((row, rowNumber) => {
    const cells = expandPartyImportRowCells(rowToStrings(row));
    if (rowIsEmpty(cells)) {
      return;
    }
    if (!columnMap && isPartyImportHeaderRow(cells)) {
      columnMap = mapPartyImportHeaders(cells);
      headerRowNumber = rowNumber;
    }
  });

  if (!columnMap) {
    return { rows: [], errors: ["XLSX_EMPTY"] };
  }
  const columns = columnMap;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
      return;
    }
    if (rows.length >= maxRows) {
      if (!errors.includes("XLSX_TOO_MANY_ROWS")) {
        errors.push("XLSX_TOO_MANY_ROWS");
      }
      return;
    }

    const cells = expandPartyImportRowCells(rowToStrings(row));
    if (rowIsEmpty(cells)) {
      return;
    }

    const parsed = parsePartyImportRow(cells, rowNumber, columns);
    if (parsed === "skip") {
      return;
    }
    if (parsed === "error") {
      const nameIdx = columnIndexForPartyField(columns, "displayName");
      const nameMissing = !(nameIdx >= 0 ? (cells[nameIdx] ?? "") : (cells[0] ?? "")).trim();
      if (nameMissing) {
        errors.push(`LINE_${rowNumber}_NAME_REQUIRED`);
      } else {
        errors.push(`LINE_${rowNumber}_TYPE_INVALID`);
      }
      return;
    }
    rows.push(parsed);
  });

  return { rows, errors };
}

function partyTypeLabel(type: PartyDto["type"], locale: string): string {
  if (locale.startsWith("en")) {
    return type === "COMPANY" ? "Company" : "Person";
  }
  return type === "COMPANY" ? "Kurum" : "Kişi";
}

function consentLabel(consent: boolean, locale: string): string {
  if (locale.startsWith("en")) {
    return consent ? "Yes" : "No";
  }
  return consent ? "Evet" : "Hayır";
}

export async function buildPartiesXlsxBuffer(input: {
  locale: string;
  sheetTitle: string;
  parties: PartyDto[];
  templateOnly?: boolean;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.locale.startsWith("en") ? "Parties" : "Kişiler");
  const headers = partyImportHeadersForLocale(input.locale);

  sheet.addRow([input.sheetTitle]);
  sheet.addRow([]);
  sheet.addRow(headers);

  if (!input.templateOnly) {
    for (const party of input.parties) {
      sheet.addRow([
        partyTypeLabel(party.type, input.locale),
        party.displayName,
        party.email ?? "",
        party.phone ?? "",
        consentLabel(party.communicationConsent, input.locale),
      ]);
    }
  }

  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(3).font = { bold: true };
  sheet.columns = [{ width: 12 }, { width: 28 }, { width: 26 }, { width: 16 }, { width: 24 }];

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

export function partiesExportFileName(sheetTitle: string, templateOnly: boolean, locale: string): string {
  const safe = sheetTitle
    .trim()
    .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const base = safe || "parties";
  if (templateOnly) {
    return locale.startsWith("en") ? `${base}-parties-template.xlsx` : `${base}-kisi-sablonu.xlsx`;
  }
  return locale.startsWith("en") ? `${base}-parties.xlsx` : `${base}-kisiler.xlsx`;
}

export const PARTIES_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
