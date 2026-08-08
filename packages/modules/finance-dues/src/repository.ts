import {
  CashboxMovementDirection,
  DueAccrualStatus,
  DueAccrualLineKind,
  DueCalculationMode,
  DueLineStatus,
  FinanceAccountKind,
  FinancePeriodStatus,
  OccupancyRole,
  PaymentChannel,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type {
  CreateDueDefinitionInput,
  DebtRowDto,
  DuesContext,
  GenerateAccrualInput,
  ListDebtRowsInput,
  ListOpenLinesInput,
  ListPeriodRegisterInput,
  PaymentAllocationInput,
  RecordPaymentInput,
  UpdateDueDefinitionInput,
} from "./contract";
import { queryDebtRowsPaginated } from "./debt-rows-query";
import { queryOpenLinesPaginated } from "./open-lines-query";
import {
  queryPeriodRegisterDefinitionIds,
  queryPeriodRegisterLinesForUnits,
  queryPeriodRegisterUnitsPaginated,
} from "./period-register-query";

export const notDeleted = { deleted: false };

const BULK_ACCRUAL_TX_TIMEOUT_MS = 120_000;

function parseOptionalDecimal(value?: string | null): Prisma.Decimal | null {
  const raw = value?.replace(",", ".")?.trim() ?? "";
  if (!raw) return null;
  const decimal = new Prisma.Decimal(raw);
  return decimal.lte(0) ? null : decimal;
}

async function applyAccountBalanceDeltas(
  tx: Prisma.TransactionClient,
  deltas: Map<string, Prisma.Decimal>,
) {
  for (const [accountId, delta] of deltas) {
    if (delta.eq(0)) continue;
    if (delta.gt(0)) {
      await tx.financeAccount.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      });
    } else {
      await tx.financeAccount.update({
        where: { id: accountId },
        data: { balance: { decrement: delta.abs() } },
      });
    }
  }
}

function balanceDeltasFromLines(
  lines: Array<{ financeAccountId: string | null; amount: Prisma.Decimal }>,
  direction: "increment" | "decrement",
) {
  const deltas = new Map<string, Prisma.Decimal>();
  for (const line of lines) {
    if (!line.financeAccountId) continue;
    const signed = direction === "increment" ? line.amount : line.amount.neg();
    const current = deltas.get(line.financeAccountId) ?? new Prisma.Decimal(0);
    deltas.set(line.financeAccountId, current.add(signed));
  }
  return deltas;
}

export class DuesRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    return prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
  }

  async listDefinitions(ctx: DuesContext) {
    return prisma.dueDefinition.findMany({
      where: {
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        isSystem: false,
        ...notDeleted,
      },
      orderBy: { name: "asc" },
    });
  }

  async findDefinitionByName(propertyId: string, name: string) {
    return prisma.dueDefinition.findFirst({
      where: {
        propertyId,
        name,
        isSystem: false,
      },
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
        meterKind: input.meterKind ?? null,
        supplierLateFeeAllocationMode: input.supplierLateFeeAllocationMode ?? null,
        autoAccrualMonthly: input.autoAccrualMonthly ?? false,
      },
    });
  }

  async updateDefinition(input: UpdateDueDefinitionInput) {
    const existing = await prisma.dueDefinition.findFirst({
      where: {
        id: input.definitionId,
        propertyId: input.propertyId,
        organizationId: input.organizationId,
        isSystem: false,
        ...notDeleted,
      },
    });
    if (!existing) {
      return null;
    }

    return prisma.dueDefinition.update({
      where: { id: input.definitionId },
      data: {
        name: input.name,
        calculationMode: input.calculationMode,
        fixedAmount: input.fixedAmount ? new Prisma.Decimal(input.fixedAmount) : null,
        ratePerM2: input.ratePerM2 ? new Prisma.Decimal(input.ratePerM2) : null,
        meterKind: input.meterKind ?? null,
        supplierLateFeeAllocationMode: input.supplierLateFeeAllocationMode ?? null,
        autoAccrualMonthly: input.autoAccrualMonthly ?? false,
      },
    });
  }

  async setDefinitionAutoAccrual(ctx: DuesContext, definitionId: string, autoAccrualMonthly: boolean) {
    const existing = await prisma.dueDefinition.findFirst({
      where: {
        id: definitionId,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        isSystem: false,
        ...notDeleted,
      },
    });
    if (!existing) return null;
    return prisma.dueDefinition.update({
      where: { id: definitionId },
      data: { autoAccrualMonthly },
    });
  }

  async listAutoAccrualDefinitionTargets() {
    return prisma.dueDefinition.findMany({
      where: {
        autoAccrualMonthly: true,
        active: true,
        isSystem: false,
        ...notDeleted,
      },
      select: {
        id: true,
        organizationId: true,
        propertyId: true,
        calculationMode: true,
      },
    });
  }

  async listDraftAccrualReminderTargets(year: number, month: number) {
    const runs = await prisma.dueAccrualRun.findMany({
      where: {
        year,
        month,
        status: DueAccrualStatus.DRAFT,
        ...notDeleted,
      },
      select: {
        organizationId: true,
        propertyId: true,
        property: { select: { name: true, deleted: true } },
      },
    });

    const map = new Map<
      string,
      { organizationId: string; propertyId: string; propertyName: string; count: number }
    >();

    for (const run of runs) {
      if (run.property.deleted) continue;
      const key = `${run.organizationId}:${run.propertyId}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          organizationId: run.organizationId,
          propertyId: run.propertyId,
          propertyName: run.property.name,
          count: 1,
        });
      }
    }

    return [...map.values()].map((row) => ({
      organizationId: row.organizationId,
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      year,
      month,
      draftRunCount: row.count,
    }));
  }

  async listPropertiesWithActiveMeterDefinitions() {
    const rows = await prisma.dueDefinition.findMany({
      where: {
        active: true,
        ...notDeleted,
        calculationMode: {
          in: [DueCalculationMode.METER_CONSUMPTION, DueCalculationMode.METER_ALLOCATED_BILL],
        },
        meterKind: { not: null },
        property: { ...notDeleted },
      },
      select: {
        organizationId: true,
        propertyId: true,
        meterKind: true,
        property: { select: { name: true } },
      },
    });

    const map = new Map<
      string,
      { organizationId: string; propertyId: string; propertyName: string; meterKinds: Set<NonNullable<(typeof rows)[number]["meterKind"]>> }
    >();

    for (const row of rows) {
      if (!row.meterKind) continue;
      const key = `${row.organizationId}:${row.propertyId}`;
      const existing = map.get(key);
      if (existing) {
        existing.meterKinds.add(row.meterKind);
      } else {
        map.set(key, {
          organizationId: row.organizationId,
          propertyId: row.propertyId,
          propertyName: row.property.name,
          meterKinds: new Set([row.meterKind]),
        });
      }
    }

    return [...map.values()].map((row) => ({
      organizationId: row.organizationId,
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      meterKinds: [...row.meterKinds],
    }));
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
        dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
        _count: { select: { lines: { where: notDeleted } } },
      },
    });
  }

  async listRunLinesByProperty(ctx: DuesContext) {
    return prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          deleted: false,
        },
      },
      orderBy: [
        { accrualRun: { year: "desc" } },
        { accrualRun: { month: "desc" } },
        { unit: { code: "asc" } },
      ],
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            occupancies: {
              where: { deleted: false, endDate: null },
              orderBy: { role: "asc" },
              take: 1,
              include: { party: { select: { displayName: true } } },
            },
          },
        },
        party: { select: { displayName: true } },
        accrualRun: {
          select: {
            id: true,
            year: true,
            month: true,
            dueDefinition: { select: { calculationMode: true, meterKind: true } },
          },
        },
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
      lineKind?: import("@siteyonetim/db").DueAccrualLineKind;
      sourceLineId?: string | null;
    }[],
    runMeta?: {
      supplierLateFeeAllocationMode?: import("@siteyonetim/db").SupplierLateFeeAllocationMode | null;
      supplierReference?: string | null;
      totalBillAmount?: string | null;
      totalBillConsumptionM3?: string | null;
    },
  ) {
    const totalBillAmount = parseOptionalDecimal(runMeta?.totalBillAmount ?? input.totalBillAmount);
    const totalBillConsumptionM3 = parseOptionalDecimal(
      runMeta?.totalBillConsumptionM3 ?? input.totalBillConsumptionM3,
    );

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
          data: {
            financePeriodId: periodId,
            totalAmount: 0,
            status: DueAccrualStatus.DRAFT,
            postedAt: null,
            supplierLateFeeAllocationMode: runMeta?.supplierLateFeeAllocationMode ?? null,
            supplierReference: runMeta?.supplierReference?.trim() || null,
            totalBillAmount,
            totalBillConsumptionM3,
          },
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
            supplierLateFeeAllocationMode: runMeta?.supplierLateFeeAllocationMode ?? null,
            supplierReference: runMeta?.supplierReference?.trim() || null,
            totalBillAmount,
            totalBillConsumptionM3,
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
            lineKind: line.lineKind ?? "STANDARD",
            sourceLineId: line.sourceLineId ?? null,
          },
        });
      }

      return tx.dueAccrualRun.update({
        where: { id: run.id },
        data: { totalAmount: total },
        include: {
          dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
          _count: { select: { lines: { where: notDeleted } } },
        },
      });
    });
  }

  async getPostedRun(ctx: DuesContext, runId: string) {
    return prisma.dueAccrualRun.findFirst({
      where: {
        id: runId,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        status: DueAccrualStatus.POSTED,
        ...notDeleted,
      },
      include: {
        dueDefinition: true,
        financePeriod: true,
        lines: { where: notDeleted },
      },
    });
  }

  async getDraftRun(ctx: DuesContext, runId: string) {
    return prisma.dueAccrualRun.findFirst({
      where: {
        id: runId,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        status: DueAccrualStatus.DRAFT,
        ...notDeleted,
      },
      include: {
        dueDefinition: true,
        financePeriod: true,
        lines: { where: notDeleted },
      },
    });
  }

  async assertRecalculateAllowed(ctx: DuesContext, runId: string) {
    const run = await this.getPostedRun(ctx, runId);
    if (!run) throw new Error("RUN_NOT_FOUND");

    if (run.lines.some((line) => line.paidAmount.gt(0))) {
      throw new Error("ACCRUAL_HAS_PAYMENTS");
    }

    const lineIds = run.lines.map((line) => line.id);
    if (lineIds.length === 0) {
      return run;
    }

    const [allocationCount, lateFeeCount] = await Promise.all([
      prisma.paymentAllocation.count({
        where: { dueAccrualLineId: { in: lineIds }, deleted: false },
      }),
      prisma.dueAccrualLine.count({
        where: { sourceLineId: { in: lineIds }, deleted: false },
      }),
    ]);

    if (allocationCount > 0) throw new Error("ACCRUAL_HAS_PAYMENTS");
    if (lateFeeCount > 0) throw new Error("ACCRUAL_HAS_LATE_FEES");

    return run;
  }

  async replacePostedRunLines(
    ctx: DuesContext,
    runId: string,
    lineData: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
    }[],
  ) {
    const accountDeltas = new Map<string, Prisma.Decimal>();

    return prisma.$transaction(
      async (tx) => {
        const run = await tx.dueAccrualRun.findFirst({
          where: {
            id: runId,
            propertyId: ctx.propertyId,
            organizationId: ctx.organizationId,
            status: DueAccrualStatus.POSTED,
            ...notDeleted,
          },
          include: {
            dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
            lines: { where: notDeleted },
          },
        });
        if (!run) throw new Error("RUN_NOT_FOUND");

        if (run.lines.some((line) => line.paidAmount.gt(0))) {
          throw new Error("ACCRUAL_HAS_PAYMENTS");
        }

        for (const line of run.lines) {
          if (!line.financeAccountId) continue;
          const current = accountDeltas.get(line.financeAccountId) ?? new Prisma.Decimal(0);
          accountDeltas.set(line.financeAccountId, current.sub(line.amount));
        }

        await tx.dueAccrualLine.updateMany({
          where: { accrualRunId: run.id },
          data: { deleted: true, deletedDate: new Date(), deletedUserId: ctx.actorUserId ?? null },
        });

        let total = new Prisma.Decimal(0);
        for (const line of lineData) {
          total = total.add(line.amount);
          if (line.financeAccountId) {
            const current = accountDeltas.get(line.financeAccountId) ?? new Prisma.Decimal(0);
            accountDeltas.set(line.financeAccountId, current.add(line.amount));
          }
        }

        if (lineData.length > 0) {
          await tx.dueAccrualLine.createMany({
            data: lineData.map((line) => ({
              accrualRunId: run.id,
              unitId: line.unitId,
              partyId: line.partyId,
              financeAccountId: line.financeAccountId,
              amount: line.amount,
            })),
          });
        }

        await applyAccountBalanceDeltas(tx, accountDeltas);

        return tx.dueAccrualRun.update({
          where: { id: run.id },
          data: { totalAmount: total },
          include: {
            dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
            _count: { select: { lines: { where: notDeleted } } },
          },
        });
      },
      { timeout: BULK_ACCRUAL_TX_TIMEOUT_MS },
    );
  }

  async postRun(ctx: DuesContext, runId: string) {
    return prisma.$transaction(
      async (tx) => {
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

        await applyAccountBalanceDeltas(tx, balanceDeltasFromLines(run.lines, "increment"));

        return tx.dueAccrualRun.update({
          where: { id: run.id },
          data: { status: DueAccrualStatus.POSTED, postedAt: new Date() },
          include: {
            dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
            _count: { select: { lines: { where: notDeleted } } },
          },
        });
      },
      { timeout: BULK_ACCRUAL_TX_TIMEOUT_MS },
    );
  }

  async getRunCorrectionFacts(ctx: DuesContext) {
    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          deleted: false,
        },
      },
      select: {
        id: true,
        unitId: true,
        paidAmount: true,
        accrualRunId: true,
      },
    });

    const runs = await prisma.dueAccrualRun.findMany({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
      select: {
        id: true,
        status: true,
        dueDefinition: { select: { calculationMode: true } },
        financePeriod: { select: { status: true } },
      },
    });

    const lineIds = lines.map((line) => line.id);
    const [allocationGroups, lateFeeGroups] =
      lineIds.length === 0
        ? [[], []]
        : await Promise.all([
            prisma.paymentAllocation.groupBy({
              by: ["dueAccrualLineId"],
              where: { dueAccrualLineId: { in: lineIds }, deleted: false },
              _count: { _all: true },
            }),
            prisma.dueAccrualLine.groupBy({
              by: ["sourceLineId"],
              where: { sourceLineId: { in: lineIds }, deleted: false },
              _count: { _all: true },
            }),
          ]);

    const allocatedLineIds = new Set(allocationGroups.map((row) => row.dueAccrualLineId));
    const lateFeeSourceIds = new Set(
      lateFeeGroups.map((row) => row.sourceLineId).filter((id): id is string => id != null),
    );

    const facts = new Map<
      string,
      {
        accruedUnitIds: Set<string>;
        hasPayments: boolean;
        hasLateFees: boolean;
        periodOpen: boolean;
        status: DueAccrualStatus;
        calculationMode: DueCalculationMode;
      }
    >();

    for (const run of runs) {
      facts.set(run.id, {
        accruedUnitIds: new Set(),
        hasPayments: false,
        hasLateFees: false,
        periodOpen: run.financePeriod.status === FinancePeriodStatus.OPEN,
        status: run.status,
        calculationMode: run.dueDefinition.calculationMode,
      });
    }

    for (const line of lines) {
      const fact = facts.get(line.accrualRunId);
      if (!fact) continue;
      fact.accruedUnitIds.add(line.unitId);
      if (line.paidAmount.gt(0) || allocatedLineIds.has(line.id)) {
        fact.hasPayments = true;
      }
      if (lateFeeSourceIds.has(line.id)) {
        fact.hasLateFees = true;
      }
    }

    return facts;
  }

  async voidPostedRun(ctx: DuesContext, runId: string) {
    return prisma.$transaction(
      async (tx) => {
        const run = await tx.dueAccrualRun.findFirst({
          where: {
            id: runId,
            propertyId: ctx.propertyId,
            organizationId: ctx.organizationId,
            status: DueAccrualStatus.POSTED,
            ...notDeleted,
          },
          include: {
            lines: { where: notDeleted },
            financePeriod: true,
          },
        });
        if (!run) throw new Error("RUN_NOT_FOUND");
        if (run.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

        if (run.lines.some((line) => line.paidAmount.gt(0))) {
          throw new Error("ACCRUAL_HAS_PAYMENTS");
        }

        const lineIds = run.lines.map((line) => line.id);
        if (lineIds.length > 0) {
          const [allocationCount, lateFeeCount] = await Promise.all([
            tx.paymentAllocation.count({
              where: { dueAccrualLineId: { in: lineIds }, deleted: false },
            }),
            tx.dueAccrualLine.count({
              where: { sourceLineId: { in: lineIds }, deleted: false },
            }),
          ]);
          if (allocationCount > 0) throw new Error("ACCRUAL_HAS_PAYMENTS");
          if (lateFeeCount > 0) throw new Error("ACCRUAL_HAS_LATE_FEES");
        }

        await applyAccountBalanceDeltas(tx, balanceDeltasFromLines(run.lines, "decrement"));

        return tx.dueAccrualRun.update({
          where: { id: run.id },
          data: { status: DueAccrualStatus.DRAFT, postedAt: null },
          include: {
            dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
            _count: { select: { lines: { where: notDeleted } } },
          },
        });
      },
      { timeout: BULK_ACCRUAL_TX_TIMEOUT_MS },
    );
  }

  async appendPostedRunLines(
    ctx: DuesContext,
    runId: string,
    lineData: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
    }[],
  ) {
    if (lineData.length === 0) throw new Error("NO_MISSING_UNITS");

    return prisma.$transaction(async (tx) => {
      const run = await tx.dueAccrualRun.findFirst({
        where: {
          id: runId,
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          status: DueAccrualStatus.POSTED,
          ...notDeleted,
        },
        include: {
          dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
          financePeriod: true,
          lines: { where: notDeleted },
        },
      });
      if (!run) throw new Error("RUN_NOT_FOUND");
      if (run.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

      const existingUnitIds = new Set(run.lines.map((line) => line.unitId));
      const newLines = lineData.filter((line) => !existingUnitIds.has(line.unitId));
      if (newLines.length === 0) throw new Error("NO_MISSING_UNITS");

      const addedTotal = newLines.reduce(
        (sum, line) => sum.add(line.amount),
        new Prisma.Decimal(0),
      );
      await applyAccountBalanceDeltas(tx, balanceDeltasFromLines(newLines, "increment"));

      await tx.dueAccrualLine.createMany({
        data: newLines.map((line) => ({
          accrualRunId: run.id,
          unitId: line.unitId,
          partyId: line.partyId,
          financeAccountId: line.financeAccountId,
          amount: line.amount,
        })),
      });

      return tx.dueAccrualRun.update({
        where: { id: run.id },
        data: { totalAmount: run.totalAmount.add(addedTotal) },
        include: {
          dueDefinition: { select: { name: true, calculationMode: true, meterKind: true } },
          _count: { select: { lines: { where: notDeleted } } },
        },
      });
    }, { timeout: BULK_ACCRUAL_TX_TIMEOUT_MS });
  }

  async listOpenLinesPaginated(
    input: ListOpenLinesInput & { dueDay: number },
  ): Promise<{ items: Awaited<ReturnType<typeof queryOpenLinesPaginated>>["items"]; total: number }> {
    return queryOpenLinesPaginated(input);
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
        unit: { select: { id: true, code: true, blockId: true, block: { select: { id: true, name: true } } } },
        party: { select: { id: true, displayName: true } },
        accrualRun: { select: { year: true, month: true } },
      },
    });
  }

  async listDebtRowsPaginated(
    input: ListDebtRowsInput & { dueDay: number },
  ): Promise<{ rows: DebtRowDto[]; total: number }> {
    return queryDebtRowsPaginated(input);
  }

  async listPeriodRegisterPaginated(input: ListPeriodRegisterInput & { dueDay: number }) {
    const { units, total } = await queryPeriodRegisterUnitsPaginated(input);
    const unitIds = units.map((unit) => unit.unitId);
    const lines =
      unitIds.length > 0
        ? await queryPeriodRegisterLinesForUnits({ ...input, unitIds })
        : [];
    return { units, lines, total };
  }

  async listPeriodRegisterDefinitionIdsForPeriod(input: ListPeriodRegisterInput) {
    return queryPeriodRegisterDefinitionIds(input);
  }

  async getExportLetterheadMeta(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: {
        name: true,
        address: true,
        organization: { select: { name: true } },
      },
    });
    if (!row) return null;
    return {
      propertyName: row.name,
      organizationName: row.organization.name,
      address: row.address,
    };
  }

  async getUnitDebtDetailMeta(ctx: DuesContext, unitId: string) {
    return prisma.unit.findFirst({
      where: {
        id: unitId,
        propertyId: ctx.propertyId,
        deleted: false,
        property: { organizationId: ctx.organizationId, deleted: false },
      },
      select: {
        id: true,
        code: true,
        blockId: true,
        block: { select: { name: true } },
        occupancies: {
          where: { deleted: false, endDate: null },
          orderBy: { role: "asc" },
          take: 1,
          select: {
            party: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  async getUnitPeriodAccrualLines(
    ctx: DuesContext,
    unitId: string,
    period: { year: number; month: number },
  ) {
    return prisma.dueAccrualLine.findMany({
      where: {
        unitId,
        deleted: false,
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
          year: period.year,
          month: period.month,
        },
      },
      include: {
        accrualRun: {
          select: {
            year: true,
            month: true,
            dueDefinition: { select: { name: true } },
          },
        },
      },
    });
  }

  async getUnitStatementDataForPeriod(
    ctx: DuesContext,
    unitId: string,
    period: { year: number; month: number },
  ) {
    const accrualRunFilter = {
      propertyId: ctx.propertyId,
      organizationId: ctx.organizationId,
      deleted: false,
      status: DueAccrualStatus.POSTED,
      year: period.year,
      month: period.month,
    };

    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        unitId,
        deleted: false,
        accrualRun: accrualRunFilter,
      },
      include: {
        accrualRun: {
          select: {
            year: true,
            month: true,
            dueDefinition: { select: { name: true } },
          },
        },
        unit: { select: { code: true } },
        sourceLine: {
          select: {
            accrualRun: {
              select: {
                year: true,
                month: true,
                dueDefinition: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const payments = await prisma.payment.findMany({
      where: {
        deleted: false,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        allocations: {
          some: {
            deleted: false,
            dueAccrualLine: {
              unitId,
              deleted: false,
              accrualRun: accrualRunFilter,
            },
          },
        },
      },
      include: {
        cashbox: { select: { name: true } },
        allocations: {
          where: {
            deleted: false,
            dueAccrualLine: {
              unitId,
              deleted: false,
              accrualRun: accrualRunFilter,
            },
          },
          include: {
            dueAccrualLine: {
              include: {
                accrualRun: {
                  select: {
                    year: true,
                    month: true,
                    dueDefinition: { select: { name: true } },
                  },
                },
                sourceLine: {
                  select: {
                    accrualRun: {
                      select: {
                        year: true,
                        month: true,
                        dueDefinition: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: "asc" },
    });

    return { lines, payments };
  }

  async listOpenLinesByUnit(ctx: DuesContext, unitId: string) {
    return prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        unitId,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      orderBy: [{ accrualRun: { year: "asc" } }, { accrualRun: { month: "asc" } }],
      include: {
        unit: { select: { id: true, code: true } },
        party: { select: { id: true, displayName: true } },
        accrualRun: {
          select: {
            year: true,
            month: true,
            supplierLateFeeAllocationMode: true,
            supplierReference: true,
            dueDefinition: { select: { name: true } },
          },
        },
        sourceLine: {
          select: {
            accrualRun: {
              select: {
                year: true,
                month: true,
                dueDefinition: { select: { name: true } },
              },
            },
          },
        },
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

  private partyAccountWhere(ctx: DuesContext, partyId: string) {
    return {
      propertyId: ctx.propertyId,
      partyId,
      kind: FinanceAccountKind.PARTY,
      deleted: false,
    } as const;
  }

  async ensurePartyAccount(ctx: DuesContext, partyId: string, partyName: string) {
    const existing = await prisma.financeAccount.findFirst({
      where: this.partyAccountWhere(ctx, partyId),
    });
    if (existing) return existing;

    const suffix = partyId.slice(-6).toUpperCase();
    try {
      return await prisma.financeAccount.create({
        data: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          partyId,
          code: `CARI-${suffix}`,
          name: partyName,
          kind: FinanceAccountKind.PARTY,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const retry = await prisma.financeAccount.findFirst({
          where: this.partyAccountWhere(ctx, partyId),
        });
        if (retry) return retry;
      }
      throw error;
    }
  }

  async resolvePartyAccountsForUnits(ctx: DuesContext, units: Awaited<ReturnType<DuesRepository["getUnitsWithArea"]>>) {
    const links: Array<{ unitId: string; partyId: string }> = [];
    for (const unit of units) {
      const occ = unit.occupancies.find((o) => o.role === OccupancyRole.OWNER) ?? unit.occupancies[0];
      if (!occ) continue;
      links.push({ unitId: unit.id, partyId: occ.partyId });
    }

    const map = new Map<string, { partyId: string; accountId: string }>();
    if (links.length === 0) {
      return map;
    }

    const partyIds = [...new Set(links.map((link) => link.partyId))];
    const [parties, existingAccounts] = await Promise.all([
      prisma.party.findMany({
        where: { id: { in: partyIds }, deleted: false },
        select: { id: true, displayName: true },
      }),
      prisma.financeAccount.findMany({
        where: {
          propertyId: ctx.propertyId,
          partyId: { in: partyIds },
          kind: FinanceAccountKind.PARTY,
          deleted: false,
        },
      }),
    ]);

    const partyById = new Map(parties.map((party) => [party.id, party]));
    const accountByPartyId = new Map(
      existingAccounts
        .filter((account) => account.partyId)
        .map((account) => [account.partyId!, account]),
    );

    const missingPartyIds = partyIds.filter((partyId) => partyById.has(partyId) && !accountByPartyId.has(partyId));
    for (const partyId of missingPartyIds) {
      const party = partyById.get(partyId);
      if (!party) continue;
      const account = await this.ensurePartyAccount(ctx, party.id, party.displayName);
      accountByPartyId.set(partyId, account);
    }

    for (const link of links) {
      const party = partyById.get(link.partyId);
      const account = accountByPartyId.get(link.partyId);
      if (!party || !account) continue;
      map.set(link.unitId, { partyId: party.id, accountId: account.id });
    }

    return map;
  }

  async recordPaymentTx(
    input: RecordPaymentInput,
    allocations: PaymentAllocationInput[],
    amount: Prisma.Decimal,
    allowPartialAllocation: boolean,
  ) {
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
          channel: input.channel ?? PaymentChannel.MANUAL,
          amount,
          cashboxId: input.cashboxId,
          financeAccountId: account.id,
          partyId: party.id,
          paymentDate: input.paymentDate ?? new Date(),
          documentNo: input.documentNo ?? null,
          description: input.description ?? null,
          externalReference: input.externalReference ?? null,
          paymentIntentId: input.paymentIntentId ?? null,
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

      if (allocatedTotal.gt(amount)) {
        throw new Error("ALLOCATION_SUM_MISMATCH");
      }
      if (!allowPartialAllocation && !allocatedTotal.eq(amount)) {
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

  async fetchOpenLinesForParty(ctx: DuesContext, partyId: string, unitId?: string | null) {
    const accrualRunFilter = {
      propertyId: ctx.propertyId,
      organizationId: ctx.organizationId,
      status: DueAccrualStatus.POSTED,
      deleted: false,
    };
    const openStatusFilter = { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] };

    if (unitId) {
      // Unit-scoped tahsilat: taşınmaza ait tüm açık satırlar (partyId uyumsuzluğu avans kaçaklarını önler).
      return prisma.dueAccrualLine.findMany({
        where: {
          deleted: false,
          status: openStatusFilter,
          accrualRun: accrualRunFilter,
          unitId,
        },
        orderBy: [{ accrualRun: { year: "asc" } }, { accrualRun: { month: "asc" } }],
      });
    }

    return prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        status: openStatusFilter,
        accrualRun: accrualRunFilter,
        OR: [
          { partyId },
          {
            partyId: null,
            unit: {
              occupancies: {
                some: {
                  partyId,
                  deleted: false,
                  OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
                },
              },
            },
          },
        ],
      },
      orderBy: [{ accrualRun: { year: "asc" } }, { accrualRun: { month: "asc" } }],
    });
  }

  async getActivePartyMapByUnit(ctx: DuesContext) {
    const occupancies = await prisma.occupancy.findMany({
      where: {
        deleted: false,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        unit: {
          propertyId: ctx.propertyId,
          deleted: false,
          property: { organizationId: ctx.organizationId },
        },
      },
      orderBy: [{ role: "asc" }],
      include: {
        party: { select: { id: true, displayName: true } },
      },
    });
    const map = new Map<string, { partyId: string; partyName: string }>();
    for (const occ of occupancies) {
      if (!map.has(occ.unitId)) {
        map.set(occ.unitId, { partyId: occ.party.id, partyName: occ.party.displayName });
      }
    }
    return map;
  }

  async getActivePartyByUnit(ctx: DuesContext, unitId: string) {
    const occ = await prisma.occupancy.findFirst({
      where: {
        unitId,
        deleted: false,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        unit: {
          propertyId: ctx.propertyId,
          deleted: false,
          property: { organizationId: ctx.organizationId },
        },
      },
      orderBy: [{ role: "asc" }],
      include: { party: { select: { id: true, displayName: true } } },
    });
    if (!occ?.party) return null;
    return { partyId: occ.party.id, partyName: occ.party.displayName };
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
        include: {
          accrualRun: {
            select: {
              year: true,
              month: true,
              dueDefinition: { select: { name: true } },
            },
          },
          unit: { select: { code: true } },
          sourceLine: {
            select: {
              accrualRun: {
                select: {
                  year: true,
                  month: true,
                  dueDefinition: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        where: {
          partyId,
          propertyId: ctx.propertyId,
          deleted: false,
          paymentDate: { gte: since },
        },
        include: {
          cashbox: { select: { name: true } },
          allocations: {
            where: { deleted: false },
            include: {
              dueAccrualLine: {
                include: {
                  accrualRun: {
                    select: {
                      year: true,
                      month: true,
                      dueDefinition: { select: { name: true } },
                    },
                  },
                  sourceLine: {
                    select: {
                      accrualRun: {
                        select: {
                          year: true,
                          month: true,
                          dueDefinition: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: "asc" },
      }),
    ]);
    return { lines, payments };
  }

  async findPartyByPortalUser(userId: string) {
    return prisma.party.findFirst({ where: { portalUserId: userId, deleted: false } });
  }

  async findPropertyScope(propertyId: string) {
    return prisma.property.findFirst({
      where: { id: propertyId, deleted: false },
      select: { id: true, organizationId: true, name: true },
    });
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

  async sumOpenDebtForUnit(propertyId: string, unitId: string) {
    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        unitId,
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          status: DueAccrualStatus.POSTED,
          deleted: false,
          propertyId,
        },
      },
    });
    return lines.reduce(
      (acc, line) => acc.add(line.amount.sub(line.paidAmount)),
      new Prisma.Decimal(0),
    );
  }

  async sumOpenDebtForPartyProperty(partyId: string, propertyId: string, unitId?: string | null) {
    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        partyId,
        ...(unitId ? { unitId } : {}),
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          status: DueAccrualStatus.POSTED,
          deleted: false,
          propertyId,
        },
      },
    });
    return lines.reduce(
      (acc, line) => acc.add(line.amount.sub(line.paidAmount)),
      new Prisma.Decimal(0),
    );
  }

  async listPortalOpenLinesForParty(partyId: string) {
    return prisma.dueAccrualLine.findMany({
      where: {
        partyId,
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      orderBy: [
        { accrualRun: { year: "desc" } },
        { accrualRun: { month: "desc" } },
        { lineKind: "asc" },
      ],
      include: {
        unit: {
          select: {
            code: true,
            block: { select: { name: true } },
          },
        },
        accrualRun: {
          select: {
            year: true,
            month: true,
            supplierLateFeeAllocationMode: true,
            supplierReference: true,
            dueDefinition: { select: { name: true } },
          },
        },
        sourceLine: {
          select: {
            accrualRun: {
              select: {
                year: true,
                month: true,
                dueDefinition: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async listPortalOpenLinesForUnit(propertyId: string, unitId: string) {
    return prisma.dueAccrualLine.findMany({
      where: {
        unitId,
        deleted: false,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          propertyId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      orderBy: [
        { accrualRun: { year: "desc" } },
        { accrualRun: { month: "desc" } },
        { lineKind: "asc" },
      ],
      include: {
        unit: {
          select: {
            code: true,
            block: { select: { name: true } },
          },
        },
        accrualRun: {
          select: {
            year: true,
            month: true,
            supplierLateFeeAllocationMode: true,
            supplierReference: true,
            dueDefinition: { select: { name: true } },
          },
        },
        sourceLine: {
          select: {
            accrualRun: {
              select: {
                year: true,
                month: true,
                dueDefinition: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getUnitStatementData(ctx: DuesContext, unitId: string, since: Date) {
    const lines = await prisma.dueAccrualLine.findMany({
      where: {
        unitId,
        deleted: false,
        createdAt: { gte: since },
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          deleted: false,
          status: DueAccrualStatus.POSTED,
        },
      },
      include: {
        accrualRun: {
          select: {
            year: true,
            month: true,
            dueDefinition: { select: { name: true } },
          },
        },
        unit: { select: { code: true } },
        sourceLine: {
          select: {
            accrualRun: {
              select: {
                year: true,
                month: true,
                dueDefinition: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const payments = await prisma.payment.findMany({
      where: {
        deleted: false,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        allocations: {
          some: {
            deleted: false,
            dueAccrualLine: { unitId, deleted: false },
          },
        },
        paymentDate: { gte: since },
      },
      include: {
        cashbox: { select: { name: true } },
        allocations: {
          where: { deleted: false, dueAccrualLine: { unitId, deleted: false } },
          include: {
            dueAccrualLine: {
              include: {
                accrualRun: {
                  select: {
                    year: true,
                    month: true,
                    dueDefinition: { select: { name: true } },
                  },
                },
                sourceLine: {
                  select: {
                    accrualRun: {
                      select: {
                        year: true,
                        month: true,
                        dueDefinition: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: "asc" },
    });

    return { lines, payments };
  }

  async getLateFeePolicy(ctx: DuesContext) {
    return prisma.dueLateFeePolicy.findFirst({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, ...notDeleted },
    });
  }

  async upsertLateFeePolicy(
    ctx: DuesContext,
    input: {
      rateKind: import("@siteyonetim/db").LateFeeRateKind;
      monthlyRatePercent: string;
      graceDays: number;
      dueDayOfMonth: number;
      active: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      let def = await tx.dueDefinition.findFirst({
        where: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          isSystem: true,
          ...notDeleted,
        },
      });
      if (!def) {
        def = await tx.dueDefinition.create({
          data: {
            organizationId: ctx.organizationId,
            propertyId: ctx.propertyId,
            name: "Gecikme faizi",
            calculationMode: "FIXED",
            fixedAmount: 0,
            isSystem: true,
            active: true,
          },
        });
      }

      return tx.dueLateFeePolicy.upsert({
        where: { propertyId: ctx.propertyId },
        create: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          rateKind: input.rateKind,
          monthlyRatePercent: new Prisma.Decimal(input.monthlyRatePercent),
          graceDays: input.graceDays,
          dueDayOfMonth: input.dueDayOfMonth,
          lateFeeDefinitionId: def.id,
          active: input.active,
        },
        update: {
          rateKind: input.rateKind,
          monthlyRatePercent: new Prisma.Decimal(input.monthlyRatePercent),
          graceDays: input.graceDays,
          dueDayOfMonth: input.dueDayOfMonth,
          lateFeeDefinitionId: def.id,
          active: input.active,
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
      });
    });
  }

  async appendLateFeeLines(
    ctx: DuesContext,
    definitionId: string,
    periodId: string,
    year: number,
    month: number,
    lines: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
      sourceLineId: string;
    }[],
  ) {
    if (lines.length === 0) return { added: 0, runId: null as string | null };

    return prisma.$transaction(
      async (tx) => {
        let run = await tx.dueAccrualRun.findFirst({
          where: {
            propertyId: ctx.propertyId,
            dueDefinitionId: definitionId,
            year,
            month,
            ...notDeleted,
          },
        });

        if (run?.status === DueAccrualStatus.POSTED) {
          throw new Error("ACCRUAL_ALREADY_POSTED");
        }

        if (!run) {
          run = await tx.dueAccrualRun.create({
            data: {
              organizationId: ctx.organizationId,
              propertyId: ctx.propertyId,
              dueDefinitionId: definitionId,
              financePeriodId: periodId,
              year,
              month,
            },
          });
        }

        const sourceLineIds = lines.map((line) => line.sourceLineId);
        const existing = await tx.dueAccrualLine.findMany({
          where: {
            accrualRunId: run.id,
            lineKind: DueAccrualLineKind.LATE_FEE,
            sourceLineId: { in: sourceLineIds },
            ...notDeleted,
          },
          select: { sourceLineId: true },
        });
        const existingSourceIds = new Set(
          existing.map((row) => row.sourceLineId).filter((id): id is string => id != null),
        );

        const toCreate = lines.filter((line) => !existingSourceIds.has(line.sourceLineId));
        if (toCreate.length === 0) {
          return { added: 0, runId: run.id };
        }

        await tx.dueAccrualLine.createMany({
          data: toCreate.map((line) => ({
            accrualRunId: run.id,
            unitId: line.unitId,
            partyId: line.partyId,
            financeAccountId: line.financeAccountId,
            amount: line.amount,
            lineKind: DueAccrualLineKind.LATE_FEE,
            sourceLineId: line.sourceLineId,
          })),
        });

        const totalAdd = toCreate.reduce(
          (acc, line) => acc.add(line.amount),
          new Prisma.Decimal(0),
        );
        await tx.dueAccrualRun.update({
          where: { id: run.id },
          data: { totalAmount: { increment: totalAdd } },
        });

        return { added: toCreate.length, runId: run.id };
      },
      { timeout: 60_000 },
    );
  }

  async listDelinquentUnitDebts(
    ctx: DuesContext,
    dueDayOfMonth: number,
    graceDays: number,
  ): Promise<Array<{ unitId: string; remaining: Prisma.Decimal }>> {
    const lines = await this.listStandardOpenLines(ctx);
    const byUnit = new Map<string, Prisma.Decimal>();

    for (const line of lines) {
      const remaining = line.amount.sub(line.paidAmount);
      if (remaining.lte(0)) continue;

      const overdue = Math.max(
        0,
        Math.floor(
          (Date.now() -
            new Date(
              line.accrualRun.year,
              line.accrualRun.month - 1,
              Math.min(Math.max(dueDayOfMonth, 1), 28),
            ).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      if (overdue <= graceDays) continue;

      byUnit.set(line.unitId, (byUnit.get(line.unitId) ?? new Prisma.Decimal(0)).add(remaining));
    }

    return [...byUnit.entries()].map(([unitId, remaining]) => ({ unitId, remaining }));
  }

  async listStandardOpenLines(ctx: DuesContext) {
    return prisma.dueAccrualLine.findMany({
      where: {
        deleted: false,
        lineKind: DueAccrualLineKind.STANDARD,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          propertyId: ctx.propertyId,
          organizationId: ctx.organizationId,
          status: DueAccrualStatus.POSTED,
          deleted: false,
        },
      },
      include: {
        unit: { select: { id: true } },
        party: { select: { id: true, displayName: true } },
        accrualRun: { select: { year: true, month: true } },
      },
    });
  }

  async listActiveLateFeePolicyTargets() {
    return prisma.dueLateFeePolicy.findMany({
      where: { active: true, ...notDeleted },
      select: { organizationId: true, propertyId: true, rateKind: true },
    });
  }

  async getLegalInterestRate(year: number, month: number) {
    return prisma.legalInterestRate.findFirst({
      where: { year, month, ...notDeleted },
    });
  }

  async listLegalInterestRates(year: number) {
    return prisma.legalInterestRate.findMany({
      where: { year, ...notDeleted },
      orderBy: [{ month: "asc" }],
    });
  }

  async listLegalInterestYears() {
    const rows = await prisma.legalInterestRate.findMany({
      where: notDeleted,
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    });
    return rows.map((row) => row.year);
  }

  async upsertLegalInterestRate(input: {
    year: number;
    month: number;
    annualRatePercent: Prisma.Decimal;
    notes?: string | null;
  }) {
    const existing = await prisma.legalInterestRate.findFirst({
      where: { year: input.year, month: input.month },
    });
    if (existing) {
      return prisma.legalInterestRate.update({
        where: { id: existing.id },
        data: {
          annualRatePercent: input.annualRatePercent,
          notes: input.notes ?? null,
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
      });
    }
    return prisma.legalInterestRate.create({
      data: {
        year: input.year,
        month: input.month,
        annualRatePercent: input.annualRatePercent,
        notes: input.notes ?? null,
      },
    });
  }
}
