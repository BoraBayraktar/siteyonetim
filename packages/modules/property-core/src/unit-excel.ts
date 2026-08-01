import ExcelJS from "exceljs";

import type { UnitDto } from "./contract";
import {
  expandImportRowCells,
  isUnitImportHeaderRow,
  mapUnitImportHeaders,
  parseUnitImportRow,
  columnIndexForField,
  type ParsedUnitImportRow,
  unitImportHeadersForLocale,
} from "./unit-import-parse";

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

export async function parseUnitsXlsx(
  buffer: Buffer,
  maxRows = MAX_IMPORT_ROWS,
): Promise<{ rows: ParsedUnitImportRow[]; errors: string[] }> {
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

  const rows: ParsedUnitImportRow[] = [];
  const errors: string[] = [];
  let columnMap = null as ReturnType<typeof mapUnitImportHeaders>;
  let headerRowNumber = 0;

  sheet.eachRow((row, rowNumber) => {
    const cells = expandImportRowCells(rowToStrings(row));
    if (rowIsEmpty(cells)) {
      return;
    }
    if (!columnMap && isUnitImportHeaderRow(cells)) {
      columnMap = mapUnitImportHeaders(cells);
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

    const cells = expandImportRowCells(rowToStrings(row));
    if (rowIsEmpty(cells)) {
      return;
    }

    const parsed = parseUnitImportRow(cells, rowNumber, columns);
    if (parsed === "skip") {
      return;
    }
    if (parsed === "error") {
      const codeIdx = columnIndexForField(columns, "code");
      const codeCell = codeIdx >= 0 ? (cells[codeIdx] ?? "") : (cells[0] ?? "");
      const codeMissing = !codeCell.trim();
      if (codeMissing) {
        errors.push(`LINE_${rowNumber}_CODE_REQUIRED`);
      } else {
        errors.push(`LINE_${rowNumber}_FLOOR_INVALID`);
      }
      return;
    }
    rows.push(parsed);
  });

  return { rows, errors };
}

export async function buildUnitsXlsxBuffer(input: {
  locale: string;
  propertyName: string;
  units: UnitDto[];
  templateOnly?: boolean;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(input.locale.startsWith("en") ? "Units" : "Daireler");
  const headers = unitImportHeadersForLocale(input.locale);

  sheet.addRow([input.propertyName]);
  sheet.addRow([]);
  sheet.addRow(headers);

  if (!input.templateOnly) {
    for (const unit of input.units) {
      sheet.addRow([
        unit.code,
        unit.blockName ?? "",
        unit.floor ?? "",
        unit.areaM2 ?? "",
        unit.shareRatio ?? "",
        "",
        "",
      ]);
    }
  }

  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(3).font = { bold: true };
  sheet.columns = [
    { width: 14 },
    { width: 16 },
    { width: 8 },
    { width: 14 },
    { width: 24 },
    { width: 22 },
    { width: 22 },
  ];

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

export function unitsExportFileName(propertyName: string, templateOnly: boolean, locale: string): string {
  const safe = propertyName
    .trim()
    .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const base = safe || "property";
  if (templateOnly) {
    return locale.startsWith("en") ? `${base}-units-template.xlsx` : `${base}-daire-sablonu.xlsx`;
  }
  return locale.startsWith("en") ? `${base}-units.xlsx` : `${base}-daireler.xlsx`;
}

export const UNITS_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
