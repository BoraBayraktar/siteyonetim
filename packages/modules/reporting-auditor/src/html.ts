import DOMPurify from "isomorphic-dompurify";

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
  "blockquote",
];

let hooksConfigured = false;

function configureSanitizerHooks() {
  if (hooksConfigured) return;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "href" || data.attrName === "src") {
      data.attrValue = "";
    }
  });
  hooksConfigured = true;
}

export function sanitizeAuditorHtml(html: string): string {
  configureSanitizerHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  }).trim();
}

export function stripAuditorHtml(html: string): string {
  configureSanitizerHooks();
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToPlainLines(html: string): string[] {
  const sanitized = sanitizeAuditorHtml(html);
  if (!sanitized) return [];

  const withBreaks = sanitized
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");

  return stripAuditorHtml(withBreaks)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const MIN_OPINION_TEXT_LENGTH = 50;
