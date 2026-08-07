import {
  CashboxMovementDirection,
  FinanceCategoryType,
  LedgerEntryType,
  Prisma,
  StaffMovementType,
} from "@siteyonetim/db";

export type StaffMovementPolicy = {
  entryType: LedgerEntryType;
  categoryType: FinanceCategoryType;
  accountDelta: Prisma.Decimal;
  cashboxDirection: CashboxMovementDirection | null;
};

export function resolveStaffMovementPolicy(
  type: StaffMovementType,
  amount: Prisma.Decimal,
): StaffMovementPolicy {
  switch (type) {
    case StaffMovementType.SALARY_ACCRUAL:
    case StaffMovementType.BONUS:
    case StaffMovementType.MANUAL_ADJUSTMENT:
      return {
        entryType: LedgerEntryType.EXPENSE,
        categoryType: FinanceCategoryType.EXPENSE,
        accountDelta: amount,
        cashboxDirection: null,
      };
    case StaffMovementType.ADVANCE:
    case StaffMovementType.PAYMENT:
      return {
        entryType: LedgerEntryType.EXPENSE,
        categoryType: FinanceCategoryType.EXPENSE,
        accountDelta: amount.mul(new Prisma.Decimal(-1)),
        cashboxDirection: CashboxMovementDirection.OUT,
      };
    case StaffMovementType.ADVANCE_OFFSET:
    case StaffMovementType.DEDUCTION:
      return {
        entryType: LedgerEntryType.INCOME,
        categoryType: FinanceCategoryType.INCOME,
        accountDelta: amount.mul(new Prisma.Decimal(-1)),
        cashboxDirection: null,
      };
    default:
      return {
        entryType: LedgerEntryType.EXPENSE,
        categoryType: FinanceCategoryType.EXPENSE,
        accountDelta: amount,
        cashboxDirection: null,
      };
  }
}
