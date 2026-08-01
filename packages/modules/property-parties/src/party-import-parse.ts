import { PartyType } from "@siteyonetim/db";

export type ParsedPartyImportRow = {
  lineNo: number;
  type: PartyType;
  displayName: string;
  email: string | null;
  phone: string | null;
  communicationConsent: boolean;
};

export type PartyImportField = "type" | "displayName" | "email" | "phone" | "communicationConsent";

export function normalizePartyImportHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

const HEADER_TO_FIELD: Record<string, PartyImportField> = {
  type: "type",
  tur: "type",
  partytype: "type",
  "party type": "type",
  displayname: "displayName",
  name: "displayName",
  "ad / unvan": "displayName",
  "ad unvan": "displayName",
  ad: "displayName",
  unvan: "displayName",
  email: "email",
  eposta: "email",
  "e-posta": "email",
  phone: "phone",
  telefon: "phone",
  communicationconsent: "communicationConsent",
  "communication consent": "communicationConsent",
  "iletisim izni": "communicationConsent",
  "iletisim izni (kvkk)": "communicationConsent",
  kvkk: "communicationConsent",
};

export function mapPartyImportHeaders(cells: string[]): (PartyImportField | null)[] | null {
  const mapped = cells.map((c) => HEADER_TO_FIELD[normalizePartyImportHeader(c)] ?? null);
  if (!mapped.includes("displayName")) {
    return null;
  }
  if (mapped.filter(Boolean).length === 0) {
    return null;
  }
  return mapped;
}

export function columnIndexForPartyField(
  columnMap: (PartyImportField | null)[],
  field: PartyImportField,
): number {
  return columnMap.findIndex((f) => f === field);
}

export function isPartyImportHeaderRow(cells: string[]) {
  return mapPartyImportHeaders(cells) !== null;
}

export function expandPartyImportRowCells(cells: string[]): string[] {
  const trimmed = cells.map((c) => c.trim());
  const nonEmpty = trimmed.filter((c) => c.length > 0);
  if (nonEmpty.length === 1 && nonEmpty[0].includes(";")) {
    return nonEmpty[0].split(";").map((part) => part.trim());
  }
  return trimmed;
}

export function parsePartyType(raw?: string): PartyType | "error" {
  if (!raw?.trim()) {
    return PartyType.PERSON;
  }
  const n = normalizePartyImportHeader(raw);
  if (n === "kurum" || n === "company" || n === "sirket" || n === "şirket") {
    return PartyType.COMPANY;
  }
  if (n === "kisi" || n === "kişi" || n === "person" || n === "person") {
    return PartyType.PERSON;
  }
  if (raw === PartyType.COMPANY || raw === PartyType.PERSON) {
    return raw;
  }
  return "error";
}

export function parseCommunicationConsent(raw?: string): boolean {
  if (raw === undefined || raw.trim() === "") {
    return false;
  }
  const n = normalizePartyImportHeader(raw);
  if (["evet", "yes", "true", "1", "x", "on"].includes(n)) {
    return true;
  }
  return false;
}

export function parsePartyImportRow(
  cells: string[],
  lineNo: number,
  columnMap: (PartyImportField | null)[] | null,
): ParsedPartyImportRow | "error" | "skip" {
  const expanded = expandPartyImportRowCells(cells);
  if (!expanded.some((c) => c.trim())) {
    return "skip";
  }
  if (isPartyImportHeaderRow(expanded)) {
    return "skip";
  }

  const parsed = parsePartyImportCells(expanded, lineNo, columnMap);
  if (parsed === "error") {
    return "error";
  }
  return parsed;
}

export function parsePartyImportCells(
  cells: string[],
  lineNo: number,
  columnMap: (PartyImportField | null)[] | null,
): ParsedPartyImportRow | "error" {
  const get = (field: PartyImportField): string | undefined => {
    if (columnMap) {
      const idx = columnIndexForPartyField(columnMap, field);
      if (idx < 0) return undefined;
      return cells[idx]?.trim();
    }
    const index: Record<PartyImportField, number> = {
      type: 0,
      displayName: 1,
      email: 2,
      phone: 3,
      communicationConsent: 4,
    };
    return cells[index[field]]?.trim();
  };

  const displayName = String(get("displayName") ?? "").trim();
  if (!displayName) {
    return "error";
  }

  const typeParsed = parsePartyType(get("type"));
  if (typeParsed === "error") {
    return "error";
  }

  const emailRaw = get("email");
  const email = emailRaw ? emailRaw.trim().toLowerCase() : null;

  const phoneRaw = get("phone");
  const phone = phoneRaw?.trim() || null;

  return {
    lineNo,
    type: typeParsed,
    displayName,
    email,
    phone,
    communicationConsent: parseCommunicationConsent(get("communicationConsent")),
  };
}

export function partyImportHeadersForLocale(locale: string): string[] {
  if (locale.startsWith("en")) {
    return ["Type", "Name", "Email", "Phone", "Communication consent (GDPR)"];
  }
  return ["Tür", "Ad / ünvan", "E-posta", "Telefon", "İletişim izni (KVKK)"];
}
