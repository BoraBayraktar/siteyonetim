import {
  CashboxMovementDirection,
  FinancePeriodStatus,
  LedgerEntryType,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type {
  CreateAccountInput,
  CreateCashboxInput,
  CreateCategoryInput,
  CreateLedgerEntryInput,
  FinanceContext,
  ListLedgerInput,
} from "./contract";
import { FinanceScopeRepository, notDeleted } from "./scope.repository";

export class FinanceRepository {
  constructor(private readonly scope = new FinanceScopeRepository()) {}

  async getOrCreatePeriod(ctx: FinanceContext, year: number, month: number) {
    const allowed = await this.scope.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!allowed) return null;

    return prisma.financePeriod.upsert({
      where: {
        propertyId_year_month: { propertyId: ctx.propertyId, year, month },
      },
      create: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        year,
        month,
        status: FinancePeriodStatus.OPEN,
      },
      update: {},
    });
  }

  async findPeriodById(ctx: FinanceContext, periodId: string) {
    return prisma.financePeriod.findFirst({
      where: {
        id: periodId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
    });
  }

  async closePeriod(periodId: string) {
    return prisma.financePeriod.update({
      where: { id: periodId },
      data: { status: FinancePeriodStatus.CLOSED },
    });
  }

  async listCategories(ctx: FinanceContext) {
    return prisma.financeCategory.findMany({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async createCategory(input: CreateCategoryInput) {
    return prisma.financeCategory.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name: input.name,
        type: input.type,
      },
    });
  }

  async listAccounts(ctx: FinanceContext, skip: number, take: number) {
    const where = {
      propertyId: ctx.propertyId,
      organizationId: ctx.organizationId,
      ...notDeleted,
    };
    const [items, total] = await Promise.all([
      prisma.financeAccount.findMany({
        where,
        orderBy: { code: "asc" },
        skip,
        take,
      }),
      prisma.financeAccount.count({ where }),
    ]);
    return { items, total };
  }

  async createAccount(input: CreateAccountInput) {
    return prisma.financeAccount.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        code: input.code,
        name: input.name,
        kind: input.kind,
        partyId: input.partyId ?? null,
      },
    });
  }

  async listCashboxes(ctx: FinanceContext) {
    return prisma.cashbox.findMany({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
      orderBy: { name: "asc" },
    });
  }

  async createCashbox(input: CreateCashboxInput) {
    return prisma.cashbox.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name: input.name,
      },
    });
  }

  async listLedger(input: ListLedgerInput) {
    const where = {
      propertyId: input.propertyId,
      organizationId: input.organizationId,
      ...notDeleted,
    };
    const [rows, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { entryDate: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          category: { select: { name: true } },
          cashbox: { select: { name: true } },
          financeAccount: { select: { name: true } },
        },
      }),
      prisma.ledgerEntry.count({ where }),
    ]);
    return { rows, total };
  }

  async createLedgerEntryTx(input: CreateLedgerEntryInput, periodId: string, amount: Prisma.Decimal) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.financeCategory.findFirst({
        where: {
          id: input.categoryId,
          propertyId: input.propertyId,
          organizationId: input.organizationId,
          deleted: false,
        },
      });
      if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
      }

      const period = await tx.financePeriod.findFirst({
        where: { id: periodId, status: FinancePeriodStatus.OPEN, deleted: false },
      });
      if (!period) {
        throw new Error("PERIOD_CLOSED");
      }

      if (input.cashboxId) {
        const cashbox = await tx.cashbox.findFirst({
          where: {
            id: input.cashboxId,
            propertyId: input.propertyId,
            deleted: false,
          },
        });
        if (!cashbox) {
          throw new Error("CASHBOX_NOT_FOUND");
        }
      }

      let account: { id: string; kind: string; balance: Prisma.Decimal } | null = null;
      if (input.financeAccountId) {
        account = await tx.financeAccount.findFirst({
          where: {
            id: input.financeAccountId,
            propertyId: input.propertyId,
            deleted: false,
          },
        });
        if (!account) {
          throw new Error("ACCOUNT_NOT_FOUND");
        }
      }

      const entry = await tx.ledgerEntry.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          financePeriodId: periodId,
          entryType: input.entryType,
          categoryId: input.categoryId,
          financeAccountId: input.financeAccountId ?? null,
          cashboxId: input.cashboxId ?? null,
          amount,
          documentNo: input.documentNo ?? null,
          description: input.description ?? null,
          entryDate: input.entryDate ?? new Date(),
        },
        include: {
          category: { select: { name: true } },
          cashbox: { select: { name: true } },
          financeAccount: { select: { name: true } },
        },
      });

      if (input.cashboxId) {
        const direction =
          input.entryType === LedgerEntryType.INCOME
            ? CashboxMovementDirection.IN
            : CashboxMovementDirection.OUT;

        if (direction === CashboxMovementDirection.OUT) {
          const cashbox = await tx.cashbox.findUniqueOrThrow({ where: { id: input.cashboxId } });
          if (cashbox.balance.lessThan(amount)) {
            throw new Error("CASHBOX_INSUFFICIENT");
          }
        }

        const delta =
          direction === CashboxMovementDirection.IN ? amount : amount.mul(new Prisma.Decimal(-1));

        await tx.cashbox.update({
          where: { id: input.cashboxId },
          data: { balance: { increment: delta } },
        });

        await tx.cashboxMovement.create({
          data: {
            cashboxId: input.cashboxId,
            direction,
            amount,
            ledgerEntryId: entry.id,
            description: input.description ?? null,
            movementDate: input.entryDate ?? new Date(),
          },
        });
      }

      if (account) {
        let accountDelta = new Prisma.Decimal(0);
        if (account.kind === "PARTY") {
          accountDelta =
            input.entryType === LedgerEntryType.INCOME ? amount.mul(-1) : amount;
        } else if (account.kind === "SUPPLIER") {
          accountDelta =
            input.entryType === LedgerEntryType.EXPENSE ? amount : amount.mul(-1);
        }

        if (!accountDelta.isZero()) {
          await tx.financeAccount.update({
            where: { id: account.id },
            data: { balance: { increment: accountDelta } },
          });
        }
      }

      return entry;
    });
  }
}
