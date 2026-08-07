import { Prisma } from "@siteyonetim/db";

import type { ParsedBankLine } from "./contract";

export type BankWebhookPayloadLine = {
  date: string;
  amount: string | number;
  description?: string | null;
  reference?: string | null;
};

export type BankWebhookPayload = {
  lines: BankWebhookPayloadLine[];
  year?: number;
  month?: number;
};

function parseWebhookDate(raw: string): Date {
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
    throw new Error("BANK_WEBHOOK_DATE_INVALID");
  }
  return parsed;
}

function parseWebhookAmount(raw: string | number): string {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw === 0) {
      throw new Error("BANK_WEBHOOK_AMOUNT_INVALID");
    }
    return new Prisma.Decimal(Math.abs(raw)).toString();
  }

  const trimmed = raw.trim().replace(/\s/g, "").replace(/TRY|TL|₺/gi, "");
  let normalized = trimmed;

  if (/^\d+\.\d+$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  }

  const value = new Prisma.Decimal(normalized || "0");
  if (value.isZero()) {
    throw new Error("BANK_WEBHOOK_AMOUNT_INVALID");
  }
  return value.abs().toString();
}

export function parseBankWebhookPayload(body: unknown): {
  lines: ParsedBankLine[];
  year: number;
  month: number;
} {
  if (body == null || typeof body !== "object") {
    throw new Error("BANK_WEBHOOK_PAYLOAD_INVALID");
  }

  const payload = body as BankWebhookPayload;
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error("BANK_WEBHOOK_LINES_REQUIRED");
  }

  const parsedLines: ParsedBankLine[] = payload.lines.map((line) => {
    if (!line?.date) {
      throw new Error("BANK_WEBHOOK_DATE_INVALID");
    }
    return {
      lineDate: parseWebhookDate(String(line.date)),
      amount: parseWebhookAmount(line.amount),
      description: line.description?.trim() || null,
      reference: line.reference?.trim() || null,
    };
  });

  const firstDate = parsedLines[0]?.lineDate ?? new Date();
  const year = payload.year ?? firstDate.getFullYear();
  const month = payload.month ?? firstDate.getMonth() + 1;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("BANK_WEBHOOK_PERIOD_INVALID");
  }

  return { lines: parsedLines, year, month };
}
