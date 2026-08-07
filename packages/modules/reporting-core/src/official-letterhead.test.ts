import { describe, expect, it } from "vitest";

import {
  defaultAuditorSignatureSlots,
  formatNumberedArticleHeading,
  periodRegisterPdfTitle,
  resolveOfficialLetterhead,
} from "./official-letterhead";

describe("resolveOfficialLetterhead", () => {
  it("maps organization, property and period lines for Turkish output", () => {
    const letterhead = resolveOfficialLetterhead({
      locale: "tr",
      organizationName: " Örnek Yönetim A.Ş. ",
      propertyName: " Ada Sitesi ",
      subtitle: "Ankara",
      periodLabel: "2025",
      generatedAt: "2025-12-31",
    });

    expect(letterhead.organizationLine).toBe("Örnek Yönetim A.Ş.");
    expect(letterhead.propertyLine).toBe("Ada Sitesi");
    expect(letterhead.addressLine).toBe("Ankara");
    expect(letterhead.periodLine).toBe("2025");
    expect(letterhead.documentDateLine).toBe("Düzenleme tarihi: 2025-12-31");
  });

  it("uses English date label when locale is en", () => {
    const letterhead = resolveOfficialLetterhead({
      locale: "en",
      generatedAt: "2025-12-31",
    });
    expect(letterhead.documentDateLine).toBe("Generated: 2025-12-31");
  });
});

describe("formatNumberedArticleHeading", () => {
  it("prefixes Turkish madde labels", () => {
    expect(formatNumberedArticleHeading(0, "Mali durum", "tr")).toBe("Madde 1 — Mali durum");
  });

  it("prefixes English article labels", () => {
    expect(formatNumberedArticleHeading(2, "Opinion", "en")).toBe("Article 3 — Opinion");
  });
});

describe("defaultAuditorSignatureSlots", () => {
  it("returns three auditor slots", () => {
    expect(defaultAuditorSignatureSlots("tr")).toHaveLength(3);
  });
});

describe("periodRegisterPdfTitle", () => {
  it("marks period register as print-ready in Turkish", () => {
    expect(periodRegisterPdfTitle("tr", "12/2025")).toContain("Dönem defteri");
    expect(periodRegisterPdfTitle("tr", "12/2025")).toContain("12/2025");
  });
});
