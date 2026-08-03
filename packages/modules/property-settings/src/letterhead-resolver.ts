import type { PropertyReportLetterheadProfileDto } from "./contract";

export type ResolveLetterheadInput = {
  profile: PropertyReportLetterheadProfileDto | null;
  locale?: string;
  defaultSubtitle?: string;
  defaultLegalNotice: string;
  defaultDocumentRefPrefix: string;
  documentRefSuffix: string;
};

export type ResolvedLetterheadFields = {
  subtitle?: string;
  legalNotice: string;
  documentRef: string;
};

function pickLocaleText(
  locale: string | undefined,
  tr: string | null | undefined,
  en: string | null | undefined,
): string | null {
  const value = locale === "en" ? en : tr;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveOfficialLetterheadFields(input: ResolveLetterheadInput): ResolvedLetterheadFields {
  const subtitle =
    input.profile?.subtitleLine?.trim() || input.defaultSubtitle?.trim() || undefined;

  const legalNotice =
    pickLocaleText(input.locale, input.profile?.legalNoticeTr, input.profile?.legalNoticeEn) ??
    input.defaultLegalNotice;

  const refPrefix =
    pickLocaleText(
      input.locale,
      input.profile?.documentRefPrefixTr,
      input.profile?.documentRefPrefixEn,
    ) ?? input.defaultDocumentRefPrefix;

  return {
    subtitle,
    legalNotice,
    documentRef: `${refPrefix} ${input.documentRefSuffix}`.trim(),
  };
}
