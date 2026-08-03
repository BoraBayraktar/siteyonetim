import {
  createPropertySettingsService,
  resolveOfficialLetterheadFields,
  type PropertyReportLetterheadProfileDto,
  type ResolvedLetterheadFields,
} from "@siteyonetim/property-settings";

const DEFAULT_LEGAL_NOTICE = {
  tr: "Basılı çıktı incelemesi için sistem taslağıdır. Hukuki bağlayıcılık için hukuk danışmanlığı onayı önerilir.",
  en: "System-generated draft for print review. Legal counsel approval is recommended before binding use.",
} as const;

const DEFAULT_REF_PREFIX = {
  tr: "Ref: Denetçi raporu",
  en: "Ref: Auditor report",
} as const;

export async function loadPropertyLetterheadFields(input: {
  organizationId: string;
  propertyId: string;
  locale?: string;
  defaultSubtitle?: string;
  documentRefSuffix: string;
  defaultDocumentRefPrefix?: string;
  defaultLegalNotice?: string;
}): Promise<ResolvedLetterheadFields> {
  const profile = await createPropertySettingsService().getReportLetterheadProfile(
    input.organizationId,
    input.propertyId,
  );
  return resolveLetterheadForProfile(profile, input);
}

export function resolveLetterheadForProfile(
  profile: PropertyReportLetterheadProfileDto | null,
  input: {
    locale?: string;
    defaultSubtitle?: string;
    documentRefSuffix: string;
    defaultDocumentRefPrefix?: string;
    defaultLegalNotice?: string;
  },
): ResolvedLetterheadFields {
  const locale = input.locale === "en" ? "en" : "tr";
  return resolveOfficialLetterheadFields({
    profile,
    locale,
    defaultSubtitle: input.defaultSubtitle,
    defaultLegalNotice: input.defaultLegalNotice ?? DEFAULT_LEGAL_NOTICE[locale],
    defaultDocumentRefPrefix: input.defaultDocumentRefPrefix ?? DEFAULT_REF_PREFIX[locale],
    documentRefSuffix: input.documentRefSuffix,
  });
}

export function defaultTableLegalNotice(locale?: string): string {
  return locale === "en" ? DEFAULT_LEGAL_NOTICE.en : DEFAULT_LEGAL_NOTICE.tr;
}

export function defaultTableRefPrefix(locale?: string, kindLabel?: string): string {
  const localeKey = locale === "en" ? "en" : "tr";
  if (kindLabel) {
    return localeKey === "en" ? `Ref: ${kindLabel}` : `Ref: ${kindLabel}`;
  }
  return localeKey === "en" ? "Ref:" : "Ref:";
}
