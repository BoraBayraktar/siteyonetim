import { describe, expect, it } from "vitest";

import { parseBankStatementCsv } from "./csv-parser";

describe("parseBankStatementCsv", () => {
  it("parses semicolon-separated Turkish amount format", () => {
    const csv = [
      "date;amount;description;reference",
      "01.03.2026;1.250,50;Aidat tahsilat;D001",
    ].join("\n");

    const rows = parseBankStatementCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe("1250.5");
    expect(rows[0]?.description).toBe("Aidat tahsilat");
    expect(rows[0]?.reference).toBe("D001");
    expect(rows[0]?.lineDate.getFullYear()).toBe(2026);
    expect(rows[0]?.lineDate.getMonth()).toBe(2);
  });

  it("parses semicolon-separated English headers", () => {
    const csv = ["date;amount;description", "2026-03-15;99,50;Transfer"].join("\n");
    const rows = parseBankStatementCsv(csv);
    expect(rows[0]?.amount).toBe("99.5");
    expect(rows[0]?.description).toBe("Transfer");
  });

  it("rejects CSV without required headers", () => {
    expect(() => parseBankStatementCsv("foo,bar\n1,2")).toThrow("BANK_CSV_HEADERS_INVALID");
  });

  it("rejects empty files", () => {
    expect(() => parseBankStatementCsv("date,amount")).toThrow("BANK_CSV_EMPTY");
  });

  it("rejects invalid dates", () => {
    const csv = ["Tarih,Tutar", "invalid-date,100"].join("\n");
    expect(() => parseBankStatementCsv(csv)).toThrow("BANK_CSV_DATE_INVALID");
  });
});
