import {
  CashboxMovementDirection,
  DueAccrualStatus,
  DueLineStatus,
  FinanceAccountKind,
  FinancePeriodStatus,
  OccupancyRole,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type {
  CreateDueDefinitionInput,
  DuesContext,
  GenerateAccrualInput,
  PaymentAllocationInput,
  RecordPaymentInput,
} from "./contract";

export const notDeleted = { deleted: false };

export class DuesRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    return prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
  }

  async listDefinitions(ctx: DuesContext) {
    return prisma.dueDefinition.findMany({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
      orderBy: { name: "asc" },
    });
  }

  async createDefinition(input: CreateDueDefinitionInput) {
    return prisma.dueDefinition.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name: input.name,
        calculationMode: input.calculationMode,
        fixedAmount: input.fixedAmount ? new Prisma.Decimal(input.fixedAmount) : null,
        ratePerM2: input.ratePerM2 ? new Prisma.Decimal(input.ratePerM2) : null,
      },
    });
  }

  async getDefinition(ctx: DuesContext, id: string) {
    return prisma.dueDefinition.findFirst({
      where: { id, propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted, active: true },
    });
  }

  async ensurePeriod(ctx: DuesContext, year: number, month: number) {
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

  async listRuns(ctx: DuesContext) {
    return prisma.dueAccrualRun.findMany({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        dueDefinition: { select: { name: true } },
        _count: { select: { lines: { where: notDeleted } } },
      },
    });
  }

  async replaceDraftRun(
    input: GenerateAccrualInput,
    periodId: string,
    lineData: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
    }[],
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.dueAccrualRun.findFirst({
        where: {
          propertyId: input.propertyId,
          dueDefinitionId: input.dueDefinitionId,
          year: input.year,
          month: input.month,
          ...notDeleted,
        },
      });

      if (existing?.status === DueAccrualStatus.POSTED) {
        throw new Error("ACCRUAL_ALREADY_POSTED");
      }

      let run = existing;
      if (run) {
        await tx.dueAccrualLine.updateMany({
          where: { accrualRunId: run.id },
          data: { deleted: true, deletedDate: new Date() },
        });
        run = await tx.dueAccrualRun.update({
          where: { id: run.id },
          data: { financePeriodId: periodId, totalAmount: 0, status: DueAccrualStatus.DRAFT, postedAt: null },
        });
      } else {
        run = await tx.dueAccrualRun.create({
          data: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            dueDefinitionId: input.dueDefinitionId,
            financePeriodId: periodId,
            year: input.year,
            month: input.month,
          },
        });
      }

      let total = new Prisma.Decimal(0);
      for (const line of lineData) {
        total = total.add(line.amount);
        await tx.dueAccrualLine.create({
          data: {
            accrualRunId: run.id,
            unitId: line.unitId,
            partyId: line.partyId,
            financeAccountId: line.financeAccountId,
            amount: line.amount,
          },
        });
      }

      return tx.dueAccrualRun.update({
        where: { id: run.id },
        data: { totalAmount: total },
        include: {
          dueDefinition: { select: { name: true } },
          _count: { select: { lines: { where: notDeleted } } },
        },
      });
    });
  }

  async postRun(ctx: DuesContext, runId: string) {
    return prisma.$transaction(async (tx) => {
      const run = await tx.dueAccrualRun.findFirst({
        where: {
          id: runId,
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          ...notDeleted,
        },
        include: {
          lines: { where: notDeleted },
          financePeriod: true,
        },
      });
      if (!run) throw new Error("RUN_NOT_FOUND");
      if (run.status === DueAccrualStatus.POSTED) throw new Error("ACCRUAL_ALREADY_POSTED");
      if (run.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

      for (const line of run.lines) {
        if (line.financeAccountId) {
          await tx.financeAccount.update({
            where: { id: line.financeAccountId },
            data: { balance: { increment: line.amount } },
          });
        }
      }

      return tx.dueAccrualRun.update({
        where: { id: run.id },
        data: { status: DueAccrualStatus.POSTED, postedAt: new Date() },
        include: {
          dueDefinition: { select: { name: true } },
          _count: { select: { lines: { where: notDeleted } } },
        },
      });
    });
  }

  async listOpenLines(ctx: DuesContext, skip: number, take: number) {
    const where = {
      deleted: false,
      status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
      accrualRun: {
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        status: DueAccrualStatus.POSTED,
        deleted: false,
      },
    };
    const [rows, total] = await Promise.all([
      prisma.dueAccrualLine.findMany({
        where,
        skip,
        take,
        orderBy: [{ accrualRun: { year: "desc" } }, { accrualRun: { month: "desc" } }],
        include: {
          unit: { select: { code: true } },
          party: { select: { displayName: true } },
          accrualRun: { select: { year: true, month: true } },
        },
      }),
      prisma.dueAccrualLine.count({ where }),
    ]);
    return { rows, total };
  }

  async listDebtLines(ctx: DuesContext) {
    return prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      include: {
        unit: { select: { id: true, code: true } },
        party: { select: { displayName: true } },
        accrualRun: { select: { year: true, month: true } },
      },
    });
  }

  async getUnitsWithArea(ctx: DuesContext) {
    return prisma.unit.findMany({
      where: { propertyId: ctx.propertyId, ...notDeleted },
      include: {
        occupancies: {
          where: { deleted: false, endDate: null },
          orderBy: { role: "asc" },
          take: 1,
        },
      },
    });
  }

  async getOrCreatePartyAccount(
    tx: Prisma.TransactionClient,
    ctx: DuesContext,
    partyId: string,
    partyName: string,
  ) {
    const existing = await tx.financeAccount.findFirst({
      where: {
        propertyId: ctx.propertyId,
        partyId,
        kind: FinanceAccountKind.PARTY,
        deleted: false,
      },
    });
    if (existing) return existing;

    const suffix = partyId.slice(-6).toUpperCase();
    return tx.financeAccount.create({
      data: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        partyId,
        code: `CARI-${suffix}`,
        name: partyName,
        kind: FinanceAccountKind.PARTY,
      },
    });
  }

  async resolvePartyAccountsForUnits(ctx: DuesContext, units: Awaited<ReturnType<DuesRepository["getUnitsWithArea"]>>) {
    return prisma.$transaction(async (tx) => {
      const map = new Map<string, { partyId: string; accountId: string }>();
      for (const unit of units) {
        const occ = unit.occupancies.find((o) => o.role === OccupancyRole.OWNER) ?? unit.occupancies[0];
        if (!occ) continue;
        const party = await tx.party.findFirst({ where: { id: occ.partyId, deleted: false } });
        if (!party) continue;
        const account = await this.getOrCreatePartyAccount(tx, ctx, party.id, party.displayName);
        map.set(unit.id, { partyId: party.id, accountId: account.id });
      }
      return map;
    });
  }

  async recordPaymentTx(input: RecordPaymentInput, allocations: PaymentAllocationInput[], amount: Prisma.Decimal) {
    return prisma.$transaction(async (tx) => {
      const cashbox = await tx.cashbox.findFirst({
        where: { id: input.cashboxId, propertyId: input.propertyId, deleted: false },
      });
      if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");

      const party = await tx.party.findFirst({
        where: { id: input.partyId, organizationId: input.organizationId, deleted: false },
      });
      if (!party) throw new Error("PARTY_NOT_FOUND");

      const account = await this.getOrCreatePartyAccount(tx, input, party.id, party.displayName);

      const payment = await tx.payment.create({
        data: {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          amount,
          cashboxId: input.cashboxId,
          financeAccountId: account.id,
          partyId: party.id,
          paymentDate: input.paymentDate ?? new Date(),
          documentNo: input.documentNo ?? null,
          description: input.description ?? null,
        },
      });

      let allocatedTotal = new Prisma.Decimal(0);
      for (const alloc of allocations) {
        const allocAmount = new Prisma.Decimal(alloc.amount);
        const line = await tx.dueAccrualLine.findFirst({
          where: {
            id: alloc.dueAccrualLineId,
            deleted: false,
            accrualRun: { propertyId: input.propertyId, status: DueAccrualStatus.POSTED, deleted: false },
          },
        });
        if (!line) throw new Error("LINE_NOT_FOUND");

        const remaining = line.amount.sub(line.paidAmount);
        if (allocAmount.gt(remaining)) throw new Error("ALLOCATION_EXCEEDS_REMAINING");

        allocatedTotal = allocatedTotal.add(allocAmount);
        const newPaid = line.paidAmount.add(allocAmount);
        const newStatus = newPaid.gte(line.amount)
          ? DueLineStatus.PAID
          : DueLineStatus.PARTIAL;

        await tx.dueAccrualLine.update({
          where: { id: line.id },
          data: { paidAmount: newPaid, status: newStatus },
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            dueAccrualLineId: line.id,
            amount: allocAmount,
          },
        });
      }

      if (!allocatedTotal.eq(amount)) {
        throw new Error("ALLOCATION_SUM_MISMATCH");
      }

      await tx.cashbox.update({
        where: { id: cashbox.id },
        data: { balance: { increment: amount } },
      });

      await tx.cashboxMovement.create({
        data: {
          cashboxId: cashbox.id,
          direction: CashboxMovementDirection.IN,
          amount,
          description: input.description ?? `Aidat tahsilat ${payment.id}`,
          movementDate: input.paymentDate ?? new Date(),
        },
      });

      await tx.financeAccount.update({
        where: { id: account.id },
        data: { balance: { decrement: amount } },
      });

      return payment;
    });
  }

  async fetchOpenLinesForParty(ctx: DuesContext, partyId: string) {
    return prisma.dueAccrualLine.findMany({
      where: {
        partyId,
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          propertyId: ctx.propertyId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      orderBy: [{ accrualRun: { year: "asc" } }, { accrualRun: { month: "asc" } }],
    });
  }

  async getPartyStatementData(ctx: DuesContext, partyId: string, since: Date) {
    const [lines, payments] = await Promise.all([
      prisma.dueAccrualLine.findMany({
        where: {
          partyId,
          deleted: false,
          accrualRun: {
            propertyId: ctx.propertyId,
            status: DueAccrualStatus.POSTED,
            deleted: false,
          },
          createdAt: { gte: since },
        },
        include: { accrualRun: true, unit: { select: { code: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        where: {
          partyId,
          propertyId: ctx.propertyId,
          deleted: false,
          paymentDate: { gte: since },
        },
        orderBy: { paymentDate: "asc" },
      }),
    ]);
    return { lines, payments };
  }

  async findPartyByPortalUser(userId: string) {
    return prisma.party.findFirst({ where: { portalUserId: userId, deleted: false } });
  }

  async findPartyById(partyId: string, organizationId: string) {
    return prisma.party.findFirst({
      where: { id: partyId, organizationId, deleted: false },
    });
  }

  async resolvePropertyForParty(partyId: string) {
    const line = await prisma.dueAccrualLine.findFirst({
      where: { partyId, deleted: false },
      include: { accrualRun: { select: { propertyId: true } } },
    });
    if (line) return line.accrualRun.propertyId;

    const occ = await prisma.occupancy.findFirst({
      where: { partyId, deleted: false, endDate: null },
      include: { unit: { select: { propertyId: true } } },
    });
    return occ?.unit.propertyId ?? null;
  }

  async sumOpenDebtForParty(partyId: string) {
    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        partyId,
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: { status: DueAccrualStatus.POSTED, deleted: false },
      },
    });
    return lines.reduce(
      (acc, line) => acc.add(line.amount.sub(line.paidAmount)),
      new Prisma.Decimal(0),
    );
  }
}
