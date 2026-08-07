import type { OfficialLetterhead, OfficialSignatureSlot, ReportDocumentMeta } from "./contract";

export function resolveOfficialLetterhead(meta: ReportDocumentMeta): OfficialLetterhead {
  const tr = meta.locale !== "en";

  return {
    organizationLine: meta.organizationName?.trim() ?? "",
    propertyLine: meta.propertyName?.trim() ?? "",
    addressLine: meta.subtitle?.trim() || undefined,
    periodLine: meta.periodLabel?.trim() || undefined,
    documentDateLine: meta.generatedAt
      ? tr
        ? `Düzenleme tarihi: ${meta.generatedAt}`
        : `Generated: ${meta.generatedAt}`
      : undefined,
  };
}

export function defaultAuditorSignatureSlots(locale?: string): OfficialSignatureSlot[] {
  const tr = locale !== "en";
  const role = tr ? "Denetçi" : "Auditor";
  const name = tr ? "Ad Soyad" : "Name";
  const date = tr ? "Tarih" : "Date";
  return [
    { roleLabel: role, namePlaceholder: name, datePlaceholder: date },
    { roleLabel: role, namePlaceholder: name, datePlaceholder: date },
    { roleLabel: role, namePlaceholder: name, datePlaceholder: date },
  ];
}

export function formatNumberedArticleHeading(
  index: number,
  heading: string,
  locale?: string,
): string {
  const tr = locale !== "en";
  const prefix = tr ? "Madde" : "Article";
  return `${prefix} ${index + 1} — ${heading}`;
}

export function periodRegisterPdfTitle(locale: string | undefined, periodLabel: string): string {
  if (locale === "en") {
    return `Period register (notary-ready print) — ${periodLabel}`;
  }
  return `Dönem defteri (basılı çıktı) — ${periodLabel}`;
}
