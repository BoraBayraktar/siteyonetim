import { describe, expect, it } from "vitest";

import { fetchRestPollPayload } from "./rest-poll-provider";

describe("fetchRestPollPayload", () => {
  it("rejects non-HTTPS poll URLs", async () => {
    await expect(fetchRestPollPayload("http://example.com/statement", "token")).rejects.toThrow(
      "BANK_POLL_URL_INVALID",
    );
  });

  it("rejects empty poll URLs", async () => {
    await expect(fetchRestPollPayload("   ", "token")).rejects.toThrow("BANK_POLL_URL_INVALID");
  });
});
