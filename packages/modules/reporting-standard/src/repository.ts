import {
  DueAccrualStatus,
  DueLineStatus,
  LedgerEntryType,
  Prisma,
  PropertyKind,
  prisma,
} from "@siteyonetim/db";

import type { ReportFilter } from "./contract";

const notDeleted = { deleted: false };

function monthRange(year: number, month: number) {
  if (month === 0) {
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function unitWhere(blockId?: string | null): Prisma.UnitWhereInput | undefined {
  if (!blockId) return undefined;
  return { blockId };
}

export class StandardReportRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    return prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
  }

  async dueAccrualLines(filter: ReportFilter) {
    const unitFilter = unitWhere(filter.blockId);
    return prisma.dueAccrualLine.findMany({
      where: {
        ...notDeleted,
        accrualRun: {
          organizationId: filter.organizationId,
          propertyId: filter.propertyId,
          year: filter.year,
          month: filter.month,
          status: DueAccrualStatus.POSTED,
          ...notDeleted,
        },
        ...(unitFilter ? { unit: { ...unitFilter, ...notDeleted } } : { unit: notDeleted }),
      },
      include: {
        unit: { select: { code: true, block: { select: { name: true } } } },
        accrualRun: { include: { dueDefinition: { select: { name: true } } } },
      },
      orderBy: [{ unit: { code: "asc" } }],
    });
  }

  async duePayments(filter: ReportFilter) {
    const { start, end } = monthRange(filter.year, filter.month);
    const payments = await prisma.payment.findMany({
      where: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        paymentDate: { gte: start, lt: end },
        ...notDeleted,
      },
      include: {
        party: { select: { displayName: true } },
        allocations: {
          where: notDeleted,
          include: {
            dueAccrualLine: {
              include: { unit: { select: { blockId: true } } },
            },
          },
        },
      },
      orderBy: { paymentDate: "asc" },
    });

    if (!filter.blockId) return payments;

    return payments.filter((p) =>
      p.allocations.some((a) => a.dueAccrualLine.unit.blockId === filter.blockId),
    );
  }

  async expenseByCategory(filter: ReportFilter) {
    const { start, end } = monthRange(filter.year, filter.month);
    const entries = await prisma.ledgerEntry.groupBy({
      by: ["categoryId"],
      where: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        entryType: LedgerEntryType.EXPENSE,
        entryDate: { gte: start, lt: end },
        ...notDeleted,
      },
      _sum: { amount: true },
    });
    const categories = await prisma.financeCategory.findMany({
      where: {
        propertyId: filter.propertyId,
        organizationId: filter.organizationId,
        id: { in: entries.map((e) => e.categoryId) },
        ...notDeleted,
      },
    });
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    return entries.map((e) => ({
      categoryName: nameById.get(e.categoryId) ?? "—",
      amount: e._sum.amount ?? new Prisma.Decimal(0),
    }));
  }

  async cashboxes(filter: ReportFilter) {
    return prisma.cashbox.findMany({
      where: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        ...notDeleted,
      },
      orderBy: { name: "asc" },
    });
  }

  async openDebtLines(filter: ReportFilter) {
    const unitFilter = unitWhere(filter.blockId);
    return prisma.dueAccrualLine.findMany({
      where: {
        ...notDeleted,
        status: { in: [DueLineStatus.OPEN, DueLineStatus.PARTIAL] },
        accrualRun: {
          organizationId: filter.organizationId,
          propertyId: filter.propertyId,
          status: DueAccrualStatus.POSTED,
          ...notDeleted,
        },
        ...(unitFilter ? { unit: { ...unitFilter, ...notDeleted } } : { unit: notDeleted }),
      },
      include: {
        unit: { select: { id: true, code: true, block: { select: { name: true } } } },
        party: { select: { displayName: true } },
        accrualRun: { select: { year: true, month: true } },
      },
    });
  }

  async getLateFeeDueDay(filter: ReportFilter) {
    const policy = await prisma.dueLateFeePolicy.findFirst({
      where: {
        propertyId: filter.propertyId,
        organizationId: filter.organizationId,
        active: true,
        ...notDeleted,
      },
    });
    return policy?.dueDayOfMonth ?? 1;
  }

  async propertySetupCounts(organizationId: string, propertyId: string) {
    const unitWhere = { propertyId, ...notDeleted };
    const [
      property,
      blockCount,
      unitCount,
      unitsWithOccupancy,
      definitionCount,
      cashboxCount,
      postedAccrualCount,
    ] = await Promise.all([
      prisma.property.findFirst({
        where: { id: propertyId, organizationId, ...notDeleted },
        select: { kind: true },
      }),
      prisma.block.count({ where: { propertyId, ...notDeleted } }),
      prisma.unit.count({ where: unitWhere }),
      prisma.unit.count({
        where: {
          ...unitWhere,
          occupancies: { some: { deleted: false, endDate: null } },
        },
      }),
      prisma.dueDefinition.count({
        where: { propertyId, organizationId, active: true, ...notDeleted },
      }),
      prisma.cashbox.count({ where: { propertyId, organizationId, ...notDeleted } }),
      prisma.dueAccrualRun.count({
        where: {
          propertyId,
          organizationId,
          status: DueAccrualStatus.POSTED,
          ...notDeleted,
        },
      }),
    ]);

    return {
      propertyKind: property?.kind ?? PropertyKind.APARTMAN,
      blockCount,
      unitCount,
      unitsWithOccupancy,
      definitionCount,
      cashboxCount,
      postedAccrualCount,
    };
  }

  yearRange(year: number) {
    return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }

  async getPropertyInfo(organizationId: string, propertyId: string) {
    return prisma.property.findFirst({
      where: { id: propertyId, organizationId, ...notDeleted },
      select: {
        id: true,
        name: true,
        address: true,
        organization: { select: { name: true } },
      },
    });
  }

  async duePaymentsYear(filter: ReportFilter) {
    const { start, end } = this.yearRange(filter.year);
    const payments = await prisma.payment.findMany({
      where: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        paymentDate: { gte: start, lt: end },
        ...notDeleted,
      },
      select: { amount: true },
    });
    return payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
  }

  async ledgerByCategoryYear(filter: ReportFilter, entryType: LedgerEntryType) {
    const { start, end } = this.yearRange(filter.year);
    const entries = await prisma.ledgerEntry.groupBy({
      by: ["categoryId"],
      where: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        entryType,
        entryDate: { gte: start, lt: end },
        ...notDeleted,
      },
      _sum: { amount: true },
    });
    const categories = await prisma.financeCategory.findMany({
      where: {
        propertyId: filter.propertyId,
        organizationId: filter.organizationId,
        id: { in: entries.map((e) => e.categoryId) },
        ...notDeleted,
      },
    });
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    return entries
      .map((e) => ({
        categoryId: e.categoryId,
        categoryName: nameById.get(e.categoryId) ?? "—",
        amount: e._sum.amount ?? new Prisma.Decimal(0),
      }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "tr"));
  }

  async getOperatingBudgetLines(filter: ReportFilter) {
    const budget = await prisma.operatingBudget.findFirst({
      where: {
        propertyId: filter.propertyId,
        organizationId: filter.organizationId,
        year: filter.year,
        ...notDeleted,
      },
      include: {
        lines: {
          where: notDeleted,
          include: { category: { select: { name: true, type: true } } },
        },
      },
    });
    return budget;
  }
}
