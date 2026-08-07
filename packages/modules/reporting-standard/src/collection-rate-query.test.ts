import { Prisma } from "@siteyonetim/db";
import { describe, expect, it } from "vitest";

import { computeCollectionRatePercent } from "./collection-rate-query";

describe("computeCollectionRatePercent", () => {
  it("returns null when accrued total is zero", () => {
    expect(
      computeCollectionRatePercent(new Prisma.Decimal(0), new Prisma.Decimal(100)),
    ).toBeNull();
  });

  it("returns null when accrued total is negative", () => {
    expect(
      computeCollectionRatePercent(new Prisma.Decimal(-1), new Prisma.Decimal(50)),
    ).toBeNull();
  });

  it("computes percentage with two decimal places", () => {
    expect(
      computeCollectionRatePercent(new Prisma.Decimal(1000), new Prisma.Decimal(750)),
    ).toBe("75.00");
  });

  it("handles partial collection rates", () => {
    expect(
      computeCollectionRatePercent(new Prisma.Decimal(300), new Prisma.Decimal(100)),
    ).toBe("33.33");
  });
});
