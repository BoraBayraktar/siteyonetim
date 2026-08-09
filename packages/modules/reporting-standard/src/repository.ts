import {
  DueAccrualStatus,
  DueLineStatus,
  FinancePeriodStatus,
  LedgerEntryType,
  Prisma,
  PropertyKind,
  ReportExportStatus,
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

function reportDateRange(filter: ReportFilter) {
  if (filter.fromMonth != null && filter.toMonth != null) {
    return {
      start: new Date(filter.year, filter.fromMonth - 1, 1),
      end: new Date(filter.year, filter.toMonth, 1),
    };
  }
  return { start: new Date(filter.year, 0, 1), end: new Date(filter.year + 1, 0, 1) };
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
      staffProfileCount,
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
      prisma.propertyStaffProfile.count({
        where: {
          propertyId,
          organizationId,
          deleted: false,
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
      staffProfileCount,
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
    const { start, end } = reportDateRange(filter);
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
    const { start, end } = reportDateRange(filter);
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

  async countActiveDefinitions(organizationId: string, propertyId: string) {
    return prisma.dueDefinition.count({
      where: { organizationId, propertyId, active: true, ...notDeleted },
    });
  }

  async hasPostedAccrualForPeriod(organizationId: string, propertyId: string, year: number, month: number) {
    const count = await prisma.dueAccrualRun.count({
      where: {
        organizationId,
        propertyId,
        year,
        month,
        status: DueAccrualStatus.POSTED,
        ...notDeleted,
      },
    });
    return count > 0;
  }

  async hasAnyAccrualRunForPeriod(organizationId: string, propertyId: string, year: number, month: number) {
    const count = await prisma.dueAccrualRun.count({
      where: {
        organizationId,
        propertyId,
        year,
        month,
        ...notDeleted,
      },
    });
    return count > 0;
  }

  async isPreviousFinancePeriodOpen(
    organizationId: string,
    propertyId: string,
    year: number,
    month: number,
  ) {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const period = await prisma.financePeriod.findFirst({
      where: {
        organizationId,
        propertyId,
        year: prevYear,
        month: prevMonth,
        ...notDeleted,
      },
      select: { status: true },
    });
    if (!period) {
      return false;
    }
    return period.status === FinancePeriodStatus.OPEN;
  }

  async countReadyReportExportsForPeriod(
    organizationId: string,
    propertyId: string,
    year: number,
    month: number,
  ) {
    return prisma.reportExport.count({
      where: {
        organizationId,
        propertyId,
        year,
        month,
        status: ReportExportStatus.READY,
        ...notDeleted,
      },
    });
  }
}
