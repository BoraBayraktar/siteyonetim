import {
  CashboxMovementDirection,
  FinanceCategoryType,
  LedgerEntryType,
  Prisma,
  StaffMovementType,
} from "@siteyonetim/db";
import { describe, expect, it } from "vitest";

import { resolveStaffMovementPolicy } from "./movement-policy";

const amount = new Prisma.Decimal(100);

describe("resolveStaffMovementPolicy", () => {
  it("increases staff payable for salary accruals without cashbox movement", () => {
    const policy = resolveStaffMovementPolicy(StaffMovementType.SALARY_ACCRUAL, amount);

    expect(policy.entryType).toBe(LedgerEntryType.EXPENSE);
    expect(policy.categoryType).toBe(FinanceCategoryType.EXPENSE);
    expect(policy.accountDelta.toString()).toBe("100");
    expect(policy.cashboxDirection).toBeNull();
  });

  it("decreases staff payable and creates cash out for advances", () => {
    const policy = resolveStaffMovementPolicy(StaffMovementType.ADVANCE, amount);

    expect(policy.entryType).toBe(LedgerEntryType.EXPENSE);
    expect(policy.categoryType).toBe(FinanceCategoryType.EXPENSE);
    expect(policy.accountDelta.toString()).toBe("-100");
    expect(policy.cashboxDirection).toBe(CashboxMovementDirection.OUT);
  });

  it("decreases staff payable and creates cash out for payments", () => {
    const policy = resolveStaffMovementPolicy(StaffMovementType.PAYMENT, amount);

    expect(policy.entryType).toBe(LedgerEntryType.EXPENSE);
    expect(policy.categoryType).toBe(FinanceCategoryType.EXPENSE);
    expect(policy.accountDelta.toString()).toBe("-100");
    expect(policy.cashboxDirection).toBe(CashboxMovementDirection.OUT);
  });

  it("decreases staff payable without cashbox movement for deductions", () => {
    const policy = resolveStaffMovementPolicy(StaffMovementType.DEDUCTION, amount);

    expect(policy.entryType).toBe(LedgerEntryType.INCOME);
    expect(policy.categoryType).toBe(FinanceCategoryType.INCOME);
    expect(policy.accountDelta.toString()).toBe("-100");
    expect(policy.cashboxDirection).toBeNull();
  });
});
