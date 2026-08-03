import { Prisma } from "@siteyonetim/db";

import type { ParsedBankLine } from "./contract";

const DATE_HEADERS = ["date", "tarih", "islem tarihi", "işlem tarihi", "valor tarihi"];
const AMOUNT_HEADERS = ["amount", "tutar", "islem tutari", "işlem tutarı", "miktar"];
const DESC_HEADERS = ["description", "aciklama", "açıklama", "detay", "islem aciklamasi", "işlem açıklaması"];
const REF_HEADERS = ["reference", "referans", "dekont no", "islem no", "işlem no"];

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i += 1) {
    const h = normalizeHeader(headers[i] ?? "");
    if (candidates.some((c) => h === c || h.includes(c))) {
      return i;
    }
  }
  return -1;
}

function parseAmount(raw: string): Prisma.Decimal {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/TRY|TL|₺/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = new Prisma.Decimal(cleaned || "0");
  if (value.isZero()) {
    throw new Error("BANK_CSV_AMOUNT_INVALID");
  }
  return value.abs();
}

function parseDate(raw: string): Date {
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dotted = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dotted) {
    return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("BANK_CSV_DATE_INVALID");
  }
  return parsed;
}

export function parseBankStatementCsv(csvContent: string): ParsedBankLine[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("BANK_CSV_EMPTY");
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = splitCsvLine(lines[0] ?? "", delimiter);
  const dateIdx = findColumnIndex(headers, DATE_HEADERS);
  const amountIdx = findColumnIndex(headers, AMOUNT_HEADERS);
  const descIdx = findColumnIndex(headers, DESC_HEADERS);
  const refIdx = findColumnIndex(headers, REF_HEADERS);

  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error("BANK_CSV_HEADERS_INVALID");
  }

  const parsed: ParsedBankLine[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i] ?? "", delimiter);
    const dateRaw = cells[dateIdx] ?? "";
    const amountRaw = cells[amountIdx] ?? "";
    if (!dateRaw || !amountRaw) continue;

    const amount = parseAmount(amountRaw);
    parsed.push({
      lineDate: parseDate(dateRaw),
      amount: amount.toString(),
      description: descIdx >= 0 ? (cells[descIdx]?.trim() || null) : null,
      reference: refIdx >= 0 ? (cells[refIdx]?.trim() || null) : null,
    });
  }

  if (parsed.length === 0) {
    throw new Error("BANK_CSV_NO_ROWS");
  }

  return parsed;
}
