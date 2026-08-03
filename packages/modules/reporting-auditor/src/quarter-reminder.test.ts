import { describe, expect, it } from "vitest";

import { isQuarterPeriod, quarterReminderLabel, resolveQuarterReminderDue } from "./quarter-reminder";

describe("resolveQuarterReminderDue", () => {
  it("returns Q1 on April 7", () => {
    expect(resolveQuarterReminderDue(new Date(2026, 3, 7))).toEqual({ year: 2026, period: "Q1" });
  });

  it("returns Q4 previous year on January 7", () => {
    expect(resolveQuarterReminderDue(new Date(2026, 0, 7))).toEqual({ year: 2025, period: "Q4" });
  });

  it("returns null on non-reminder days", () => {
    expect(resolveQuarterReminderDue(new Date(2026, 3, 8))).toBeNull();
  });
});

describe("quarterReminderLabel", () => {
  it("formats Turkish label", () => {
    expect(quarterReminderLabel("Q2", 2026, "tr")).toBe("2026 Q2");
  });

  it("formats English label", () => {
    expect(quarterReminderLabel("Q2", 2026, "en")).toBe("Q2 2026");
  });
});

describe("isQuarterPeriod", () => {
  it("accepts Q1–Q4", () => {
    expect(isQuarterPeriod("Q1")).toBe(true);
    expect(isQuarterPeriod("ANNUAL")).toBe(false);
  });
});
