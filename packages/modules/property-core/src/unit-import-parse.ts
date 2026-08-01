export type ParsedUnitImportRow = {
  lineNo: number;
  code: string;
  blockName: string | null;
  floor: number | null;
  areaM2: string | null;
  shareRatio: string | null;
  ownerName: string | null;
  tenantName: string | null;
};

export type UnitImportField =
  | "code"
  | "blockName"
  | "floor"
  | "areaM2"
  | "shareRatio"
  | "ownerName"
  | "tenantName";

export function normalizeUnitImportHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

const HEADER_TO_FIELD: Record<string, UnitImportField> = {
  code: "code",
  unit: "code",
  "unit code": "code",
  "daire no": "code",
  daire: "code",
  daireno: "code",
  block: "blockName",
  blok: "blockName",
  "blok adi": "blockName",
  "blok adı": "blockName",
  floor: "floor",
  kat: "floor",
  aream2: "areaM2",
  "area m2": "areaM2",
  "area (m2)": "areaM2",
  alan: "areaM2",
  "alan m2": "areaM2",
  "alan (m2)": "areaM2",
  shareratio: "shareRatio",
  "share ratio": "shareRatio",
  "distribution share (ratio)": "shareRatio",
  "dagitim payi (oran)": "shareRatio",
  "dagitim payı (oran)": "shareRatio",
  "dağıtım payi (oran)": "shareRatio",
  "dağıtım payı (oran)": "shareRatio",
  "arsa / dagitim payi (oran)": "shareRatio",
  "arsa / dağıtım payı (oran)": "shareRatio",
  "aidat payi": "shareRatio",
  "aidat payı": "shareRatio",
  "aidat payi (oran)": "shareRatio",
  "aidat payı (oran)": "shareRatio",
  owner: "ownerName",
  "owner name": "ownerName",
  malik: "ownerName",
  "malik adi": "ownerName",
  "malik adı": "ownerName",
  "kat maliki": "ownerName",
  tenant: "tenantName",
  "tenant name": "tenantName",
  kiraci: "tenantName",
  kiracı: "tenantName",
  "kiraci adi": "tenantName",
  "kiracı adı": "tenantName",
};

export function mapUnitImportHeaders(cells: string[]): (UnitImportField | null)[] | null {
  const mapped = cells.map((c) => HEADER_TO_FIELD[normalizeUnitImportHeader(c)] ?? null);
  const known = mapped.filter(Boolean);
  if (known.length === 0) {
    return null;
  }
  if (!mapped.includes("code")) {
    return null;
  }
  return mapped;
}

export function columnIndexForField(
  columnMap: (UnitImportField | null)[],
  field: UnitImportField,
): number {
  return columnMap.findIndex((f) => f === field);
}

export function isUnitImportHeaderRow(cells: string[]) {
  return mapUnitImportHeaders(cells) !== null;
}

/** CSV satırının tek hücreye yapıştırıldığı Excel satırları (0;Blok;-1;70). */
export function expandImportRowCells(cells: string[]): string[] {
  const trimmed = cells.map((c) => c.trim());
  const nonEmpty = trimmed.filter((c) => c.length > 0);
  if (nonEmpty.length === 1 && nonEmpty[0].includes(";")) {
    return nonEmpty[0].split(";").map((part) => part.trim());
  }
  return trimmed;
}

const SINGLE_CELL_ROW =
  /^(\d+)\s+(.+?\bBlok\b)\s+(-?\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)?\s*$/i;

/** Tek hücrede boşlukla ayrılmış satır (0 E6 Blok -1 70). */
export function tryParseSingleCellImportRow(raw: string, lineNo: number): ParsedUnitImportRow | null {
  const text = raw.trim();
  if (!text || text.includes(";")) {
    return null;
  }
  const match = SINGLE_CELL_ROW.exec(text);
  if (!match) {
    return null;
  }
  const floor = Number(String(match[3]).replace(",", "."));
  if (Number.isNaN(floor)) {
    return null;
  }
  const areaRaw = match[4]?.trim();
  return {
    lineNo,
    code: match[1],
    blockName: match[2].trim().replace(/\s+/g, " "),
    floor,
    areaM2: areaRaw ? areaRaw.replace(",", ".") : null,
    shareRatio: null,
    ownerName: null,
    tenantName: null,
  };
}

/** Eski hatalı importlarda daire no yerine tüm satırın kaydedildiği kayıtlar. */
export function isMalformedImportUnitCode(code: string): boolean {
  const c = code.trim();
  if (!c) {
    return false;
  }
  if (c.includes(";")) {
    return true;
  }
  if (tryParseSingleCellImportRow(c, 0)) {
    return true;
  }
  if (/\s/.test(c) && /\bblok\b/i.test(c)) {
    return true;
  }
  const expanded = expandImportRowCells([c]);
  if (expanded.length > 1 && isUnitImportHeaderRow(expanded)) {
    return true;
  }
  if (isUnitImportHeaderRow(c.split(/\s+/))) {
    return true;
  }
  if (/daire\s*no/i.test(c) && /\bkat\b/i.test(c)) {
    return true;
  }
  return false;
}

export function parseUnitImportRow(
  cells: string[],
  lineNo: number,
  columnMap: (UnitImportField | null)[] | null,
): ParsedUnitImportRow | "error" | "skip" {
  const expanded = expandImportRowCells(cells);
  if (!expanded.some((c) => c.trim())) {
    return "skip";
  }
  if (isUnitImportHeaderRow(expanded)) {
    return "skip";
  }

  const nonEmptyCount = expanded.filter((c) => c.trim()).length;
  if (nonEmptyCount === 1) {
    const single = expanded.find((c) => c.trim()) ?? "";
    const fromSpaces = tryParseSingleCellImportRow(single, lineNo);
    if (fromSpaces) {
      return fromSpaces;
    }
  }

  const parsed = parseUnitImportCells(expanded, lineNo, columnMap);
  if (parsed === "error") {
    return "error";
  }
  if (isMalformedImportUnitCode(parsed.code)) {
    return "skip";
  }
  return parsed;
}

export function parseUnitImportCells(
  cells: string[],
  lineNo: number,
  columnMap: (UnitImportField | null)[] | null,
): ParsedUnitImportRow | "error" {
  const get = (field: UnitImportField): string | undefined => {
    if (columnMap) {
      const idx = columnIndexForField(columnMap, field);
      if (idx < 0) return undefined;
      return cells[idx]?.trim();
    }
    const index: Record<UnitImportField, number> = {
      code: 0,
      blockName: 1,
      floor: 2,
      areaM2: 3,
      shareRatio: 4,
      ownerName: 5,
      tenantName: 6,
    };
    return cells[index[field]]?.trim();
  };

  const code = String(get("code") ?? "").trim();
  if (code === "" || isMalformedImportUnitCode(code)) {
    return "error";
  }

  const blockRaw = get("blockName");
  const blockName = blockRaw ? blockRaw.trim().replace(/\s+/g, " ") : null;

  const floorRaw = get("floor");
  let floor: number | null = null;
  if (floorRaw !== undefined && floorRaw !== "") {
    const parsedFloor = Number(String(floorRaw).replace(",", "."));
    if (Number.isNaN(parsedFloor)) {
      return "error";
    }
    floor = parsedFloor;
  }

  const areaRaw = get("areaM2");
  const shareRaw = get("shareRatio");
  const ownerRaw = get("ownerName");
  const tenantRaw = get("tenantName");

  const normalizeDecimalCell = (raw?: string) => {
    if (raw === undefined || raw === "") return null;
    const normalized = String(raw).trim().replace(/\s/g, "").replace(",", ".");
    return normalized || null;
  };

  return {
    lineNo,
    code,
    blockName,
    floor,
    areaM2: normalizeDecimalCell(areaRaw),
    shareRatio: normalizeDecimalCell(shareRaw),
    ownerName: ownerRaw?.trim() ? ownerRaw.trim() : null,
    tenantName: tenantRaw?.trim() ? tenantRaw.trim() : null,
  };
}

export function unitImportHeadersForLocale(locale: string): string[] {
  if (locale.startsWith("en")) {
    return [
      "Unit code",
      "Block",
      "Floor",
      "Area (m²)",
      "Distribution share (ratio)",
      "Owner name",
      "Tenant name",
    ];
  }
  return [
    "Daire no",
    "Blok",
    "Kat",
    "Alan (m²)",
    "Dağıtım payı (oran)",
    "Malik adı",
    "Kiracı adı",
  ];
}
