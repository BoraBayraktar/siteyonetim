import {
  CashboxMovementDirection,
  FinanceCategoryType,
  FinanceAccountKind,
  FinancePeriodStatus,
  LedgerEntryType,
  Prisma,
  StaffEmploymentStatus,
  StaffMovementType,
  prisma,
} from "@siteyonetim/db";

import type {
  CreateStaffProfileInput,
  ListStaffProfilesInput,
  ListStaffStatementInput,
  RecordStaffMovementInput,
  StaffFinanceContext,
  UpdateStaffProfileInput,
} from "./contract";

const notDeleted = { deleted: false };

export class StaffFinanceRepository {
  async assertProperty(ctx: StaffFinanceContext) {
    return prisma.property.findFirst({
      where: {
        id: ctx.propertyId,
        organizationId: ctx.organizationId,
        ...notDeleted,
      },
      select: { id: true },
    });
  }

  async listStaffProfiles(input: ListStaffProfilesInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
      ...notDeleted,
    };
    const [rows, total] = await Promise.all([
      prisma.propertyStaffProfile.findMany({
        where,
        orderBy: [{ status: "asc" }, { party: { displayName: "asc" } }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          party: { select: { displayName: true } },
          financeAccount: { select: { code: true, balance: true } },
        },
      }),
      prisma.propertyStaffProfile.count({ where }),
    ]);
    return { rows, total };
  }

  async getStaffSummary(ctx: StaffFinanceContext) {
    const rows = await prisma.propertyStaffProfile.findMany({
      where: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        status: StaffEmploymentStatus.ACTIVE,
        ...notDeleted,
      },
      select: {
        financeAccount: { select: { balance: true } },
      },
    });

    const totalPayable = rows.reduce(
      (sum, row) => sum.add(row.financeAccount.balance),
      new Prisma.Decimal(0),
    );

    return {
      activeCount: rows.length,
      totalPayable,
    };
  }

  async listAllStaffProfiles(ctx: StaffFinanceContext) {
    return prisma.propertyStaffProfile.findMany({
      where: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      orderBy: [{ status: "asc" }, { party: { displayName: "asc" } }],
      include: {
        party: { select: { displayName: true } },
        financeAccount: { select: { code: true, balance: true } },
      },
    });
  }

  async findStaffProfile(ctx: StaffFinanceContext, staffProfileId: string) {
    return prisma.propertyStaffProfile.findFirst({
      where: {
        id: staffProfileId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      include: {
        party: { select: { displayName: true } },
        financeAccount: { select: { code: true, balance: true } },
      },
    });
  }

  async getOrCreatePeriod(ctx: StaffFinanceContext, year: number, month: number) {
    return prisma.financePeriod.upsert({
      where: { propertyId_year_month: { propertyId: ctx.propertyId, year, month } },
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

  async createStaffProfile(input: CreateStaffProfileInput, accountCode: string) {
    return prisma.$transaction(async (tx) => {
      const party = await tx.party.findFirst({
        where: {
          id: input.partyId,
          organizationId: input.organizationId,
          type: "PERSON",
          deleted: false,
        },
      });
      if (!party) throw new Error("PARTY_NOT_FOUND");

      const duplicate = await tx.propertyStaffProfile.findFirst({
        where: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          partyId: input.partyId,
          deleted: false,
        },
      });
      if (duplicate) throw new Error("STAFF_PROFILE_EXISTS");

      const account = await tx.financeAccount.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          partyId: input.partyId,
          code: accountCode,
          name: party.displayName,
          kind: FinanceAccountKind.STAFF,
        },
      });

      return tx.propertyStaffProfile.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          partyId: input.partyId,
          financeAccountId: account.id,
          staffNo: input.staffNo ?? null,
          title: input.title ?? null,
          department: input.department ?? null,
          employmentStartDate: input.employmentStartDate ?? null,
        },
        include: {
          party: { select: { displayName: true } },
          financeAccount: { select: { code: true, balance: true } },
        },
      });
    });
  }

  async updateStaffProfile(input: UpdateStaffProfileInput) {
    const result = await prisma.propertyStaffProfile.updateMany({
      where: {
        id: input.staffProfileId,
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        ...notDeleted,
      },
      data: {
        staffNo: input.staffNo ?? null,
        title: input.title ?? null,
        department: input.department ?? null,
        employmentStartDate: input.employmentStartDate ?? null,
        employmentEndDate: input.employmentEndDate ?? null,
        status: input.status,
      },
    });
    if (result.count === 0) throw new Error("STAFF_PROFILE_NOT_FOUND");

    return prisma.propertyStaffProfile.findFirstOrThrow({
      where: {
        id: input.staffProfileId,
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        ...notDeleted,
      },
      include: {
        party: { select: { displayName: true } },
        financeAccount: { select: { code: true, balance: true } },
      },
    });
  }

  async listStatement(input: ListStaffStatementInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      staffProfileId: input.staffProfileId,
      ...notDeleted,
    };
    const [rows, total] = await Promise.all([
      prisma.staffAccountMovement.findMany({
        where,
        orderBy: { movementDate: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.staffAccountMovement.count({ where }),
    ]);
    return { rows, total };
  }

  async listAllStatement(ctx: StaffFinanceContext, staffProfileId: string) {
    return prisma.staffAccountMovement.findMany({
      where: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        staffProfileId,
        deleted: false,
      },
      orderBy: { movementDate: "asc" },
    });
  }

  async recordMovementTx(
    input: RecordStaffMovementInput,
    profile: { id: string; financeAccountId: string },
    periodId: string,
    amount: Prisma.Decimal,
    entryType: LedgerEntryType,
    expectedCategoryType: FinanceCategoryType,
    accountDelta: Prisma.Decimal,
    cashboxDirection: CashboxMovementDirection | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.financeCategory.findFirst({
        where: {
          id: input.categoryId,
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          deleted: false,
        },
      });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
      if (category.type !== expectedCategoryType) throw new Error("CATEGORY_TYPE_MISMATCH");

      const period = await tx.financePeriod.findFirst({
        where: { id: periodId, status: FinancePeriodStatus.OPEN, deleted: false },
      });
      if (!period) throw new Error("PERIOD_CLOSED");

      if (input.cashboxId) {
        const cashbox = await tx.cashbox.findFirst({
          where: { id: input.cashboxId, propertyId: input.propertyId, deleted: false },
        });
        if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");
        if (cashboxDirection === CashboxMovementDirection.OUT && cashbox.balance.lessThan(amount)) {
          throw new Error("CASHBOX_INSUFFICIENT");
        }
      }

      const entryDate = input.movementDate ?? new Date();
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          financePeriodId: periodId,
          entryType,
          categoryId: input.categoryId,
          financeAccountId: profile.financeAccountId,
          cashboxId: input.cashboxId ?? null,
          amount,
          documentNo: input.documentNo ?? null,
          description: input.description ?? null,
          entryDate,
        },
      });

      if (input.cashboxId) {
        if (!cashboxDirection) throw new Error("CASHBOX_NOT_ALLOWED");
        const cashboxDelta =
          cashboxDirection === CashboxMovementDirection.IN ? amount : amount.mul(new Prisma.Decimal(-1));
        await tx.cashbox.update({
          where: { id: input.cashboxId },
          data: { balance: { increment: cashboxDelta } },
        });
        await tx.cashboxMovement.create({
          data: {
            cashboxId: input.cashboxId,
            direction: cashboxDirection,
            amount,
            ledgerEntryId: ledgerEntry.id,
            description: input.description ?? null,
            movementDate: entryDate,
          },
        });
      }

      await tx.financeAccount.update({
        where: { id: profile.financeAccountId },
        data: { balance: { increment: accountDelta } },
      });

      return tx.staffAccountMovement.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          staffProfileId: profile.id,
          financeAccountId: profile.financeAccountId,
          ledgerEntryId: ledgerEntry.id,
          movementType: input.movementType,
          amount,
          movementDate: entryDate,
          periodYear: period.year,
          periodMonth: period.month,
          documentNo: input.documentNo ?? null,
          description: input.description ?? null,
        },
      });
    });
  }
}
