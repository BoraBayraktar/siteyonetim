export const ANNOUNCEMENT_BODY_FORMAT = {
  PLAIN: "PLAIN",
  HTML: "HTML",
} as const;

export type AnnouncementBodyFormatValue =
  (typeof ANNOUNCEMENT_BODY_FORMAT)[keyof typeof ANNOUNCEMENT_BODY_FORMAT];

export function isHtmlAnnouncementBody(bodyFormat: string): boolean {
  return bodyFormat === ANNOUNCEMENT_BODY_FORMAT.HTML;
}

export function resolveAnnouncementBodyFormat(raw: string | null | undefined): AnnouncementBodyFormatValue {
  if (raw === ANNOUNCEMENT_BODY_FORMAT.HTML) {
    return ANNOUNCEMENT_BODY_FORMAT.HTML;
  }
  return ANNOUNCEMENT_BODY_FORMAT.PLAIN;
}
