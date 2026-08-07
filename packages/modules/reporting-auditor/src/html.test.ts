import { describe, expect, it } from "vitest";

import { sanitizeAuditorHtml, stripAuditorHtml } from "./html";

describe("sanitizeAuditorHtml", () => {
  it("strips script tags", () => {
    const result = sanitizeAuditorHtml('<p>Hello</p><script>alert(1)</script>');
    expect(result).toBe("<p>Hello</p>");
  });

  it("removes onclick attributes", () => {
    const result = sanitizeAuditorHtml('<p onclick="alert(1)">Text</p>');
    expect(result).toBe("<p>Text</p>");
  });

  it("allows basic formatting tags", () => {
    const result = sanitizeAuditorHtml("<p><strong>Bold</strong> text</p>");
    expect(result).toContain("<strong>Bold</strong>");
  });
});

describe("stripAuditorHtml", () => {
  it("returns plain text without tags", () => {
    expect(stripAuditorHtml("<p>Line <em>one</em></p>")).toBe("Line one");
  });
});
