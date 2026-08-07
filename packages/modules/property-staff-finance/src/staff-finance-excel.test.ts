import { StaffEmploymentStatus, StaffMovementType } from "@siteyonetim/db";
import { describe, expect, it } from "vitest";

import { employmentStatusLabel, movementTypeLabel } from "./staff-finance-excel";

describe("staff finance excel labels", () => {
  it("maps movement types to Turkish labels", () => {
    expect(movementTypeLabel(StaffMovementType.SALARY_ACCRUAL, "tr")).toBe("Maaş tahakkuku");
    expect(movementTypeLabel(StaffMovementType.PAYMENT, "tr")).toBe("Ödeme");
    expect(movementTypeLabel(StaffMovementType.MANUAL_ADJUSTMENT, "tr")).toBe("Manuel düzeltme");
  });

  it("maps movement types to English labels", () => {
    expect(movementTypeLabel(StaffMovementType.ADVANCE, "en")).toBe("Advance");
    expect(movementTypeLabel(StaffMovementType.DEDUCTION, "en")).toBe("Deduction");
  });

  it("maps employment status to localized labels", () => {
    expect(employmentStatusLabel(StaffEmploymentStatus.ACTIVE, "tr")).toBe("Aktif");
    expect(employmentStatusLabel(StaffEmploymentStatus.PASSIVE, "tr")).toBe("Pasif");
    expect(employmentStatusLabel(StaffEmploymentStatus.ACTIVE, "en")).toBe("Active");
  });
});
