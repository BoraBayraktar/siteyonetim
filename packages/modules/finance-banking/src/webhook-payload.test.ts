import { describe, expect, it } from "vitest";

import { parseBankWebhookPayload } from "./webhook-payload";

describe("parseBankWebhookPayload", () => {
  it("parses JSON lines with year/month from first date", () => {
    const result = parseBankWebhookPayload({
      lines: [
        { date: "2026-03-15", amount: "1500.50", description: "Aidat", reference: "REF-1" },
        { date: "2026-03-16", amount: 200, description: "Gider" },
      ],
    });

    expect(result.year).toBe(2026);
    expect(result.month).toBe(3);
    expect(result.lines).toHaveLength(2);
    expect(Number(result.lines[0]?.amount)).toBe(1500.5);
    expect(Number(result.lines[1]?.amount)).toBe(200);
  });

  it("accepts explicit year and month", () => {
    const result = parseBankWebhookPayload({
      year: 2025,
      month: 12,
      lines: [{ date: "01.12.2025", amount: "99,50" }],
    });
    expect(result.year).toBe(2025);
    expect(result.month).toBe(12);
  });

  it("rejects empty lines array", () => {
    expect(() => parseBankWebhookPayload({ lines: [] })).toThrow("BANK_WEBHOOK_LINES_REQUIRED");
  });

  it("rejects invalid amount", () => {
    expect(() =>
      parseBankWebhookPayload({ lines: [{ date: "2026-01-01", amount: "0" }] }),
    ).toThrow("BANK_WEBHOOK_AMOUNT_INVALID");
  });
});
