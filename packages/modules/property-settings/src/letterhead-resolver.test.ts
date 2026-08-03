import { describe, expect, it } from "vitest";

import { resolveOfficialLetterheadFields } from "./letterhead-resolver";

describe("resolveOfficialLetterheadFields", () => {
  it("uses defaults when profile is null", () => {
    const resolved = resolveOfficialLetterheadFields({
      profile: null,
      locale: "tr",
      defaultSubtitle: "Adres satırı",
      defaultLegalNotice: "Varsayılan uyarı",
      defaultDocumentRefPrefix: "Ref: Denetçi raporu",
      documentRefSuffix: "2026",
    });

    expect(resolved).toEqual({
      subtitle: "Adres satırı",
      legalNotice: "Varsayılan uyarı",
      documentRef: "Ref: Denetçi raporu 2026",
    });
  });

  it("overrides with profile values for matching locale", () => {
    const resolved = resolveOfficialLetterheadFields({
      profile: {
        propertyId: "p1",
        subtitleLine: "VKN: 123",
        legalNoticeTr: "Özel TR uyarı",
        legalNoticeEn: "Custom EN notice",
        documentRefPrefixTr: "Ref: Özel",
        documentRefPrefixEn: "Ref: Custom",
      },
      locale: "en",
      defaultSubtitle: "Address",
      defaultLegalNotice: "Default",
      defaultDocumentRefPrefix: "Ref:",
      documentRefSuffix: "2026",
    });

    expect(resolved.subtitle).toBe("VKN: 123");
    expect(resolved.legalNotice).toBe("Custom EN notice");
    expect(resolved.documentRef).toBe("Ref: Custom 2026");
  });
});
