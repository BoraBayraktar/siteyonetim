import { getServerDOMPurify } from "@siteyonetim/platform-sanitize";

import {
  ANNOUNCEMENT_BODY_FORMAT,
  type AnnouncementBodyFormatValue,
  resolveAnnouncementBodyFormat,
} from "./body-format";

export { ANNOUNCEMENT_BODY_FORMAT, resolveAnnouncementBodyFormat, isHtmlAnnouncementBody } from "./body-format";
export type { AnnouncementBodyFormatValue } from "./body-format";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "blockquote",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel"];

const IMAGE_SRC_PATTERN = /^\/api\/properties\/[a-z0-9]+\/announcement-images\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i;

let hooksConfigured = false;

function configureSanitizerHooks() {
  if (hooksConfigured) {
    return;
  }
  getServerDOMPurify().addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "src" && node.tagName === "IMG") {
      if (!IMAGE_SRC_PATTERN.test(data.attrValue)) {
        data.attrValue = "";
      }
    }
    if (data.attrName === "href" && node.tagName === "A") {
      const value = data.attrValue.trim();
      if (value && !/^https?:\/\//i.test(value) && !/^mailto:/i.test(value)) {
        data.attrValue = "";
      }
    }
  });
  hooksConfigured = true;
}

export function sanitizeAnnouncementHtml(html: string): string {
  configureSanitizerHooks();
  return getServerDOMPurify().sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }).trim();
}

export function stripAnnouncementHtml(html: string): string {
  configureSanitizerHooks();
  return getServerDOMPurify().sanitize(html, { ALLOWED_TAGS: [] })
    .replace(/\s+/g, " ")
    .trim();
}

export function isEmptyAnnouncementBody(body: string, bodyFormat: AnnouncementBodyFormatValue): boolean {
  if (bodyFormat === ANNOUNCEMENT_BODY_FORMAT.PLAIN) {
    return !body.trim();
  }
  return !stripAnnouncementHtml(body);
}
