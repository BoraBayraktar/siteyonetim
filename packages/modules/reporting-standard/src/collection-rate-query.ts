import { DueAccrualStatus, Prisma, prisma } from "@siteyonetim/db";
import {
  REPORT_ANNUAL_TTL_SECONDS,
  collectionRateCacheKey,
  getCacheClient,
} from "@siteyonetim/platform-cache";

import type { ReportFilter } from "./contract";

export type YearAccrualCollectionTotals = {
  totalAccrued: Prisma.Decimal;
  totalCollected: Prisma.Decimal;
};

type CachedCollectionTotals = {
  totalAccrued: string;
  totalCollected: string;
};

export async function queryYearAccrualCollectionTotals(
  filter: ReportFilter,
): Promise<YearAccrualCollectionTotals> {
  const cache = getCacheClient();
  const cacheKey = collectionRateCacheKey({
    organizationId: filter.organizationId,
    propertyId: filter.propertyId,
    year: filter.year,
    blockId: filter.blockId,
    fromMonth: filter.fromMonth,
    toMonth: filter.toMonth,
  });
  const cached = await cache.get<CachedCollectionTotals>(cacheKey);
  if (cached) {
    return {
      totalAccrued: new Prisma.Decimal(cached.totalAccrued),
      totalCollected: new Prisma.Decimal(cached.totalCollected),
    };
  }

  const totals = await queryYearAccrualCollectionTotalsFromDb(filter);
  await cache.set(
    cacheKey,
    {
      totalAccrued: totals.totalAccrued.toString(),
      totalCollected: totals.totalCollected.toString(),
    },
    REPORT_ANNUAL_TTL_SECONDS,
  );
  return totals;
}

async function queryYearAccrualCollectionTotalsFromDb(
  filter: ReportFilter,
): Promise<YearAccrualCollectionTotals> {
  const unitBlockFilter = filter.blockId
    ? { unit: { blockId: filter.blockId, deleted: false } }
    : { unit: { deleted: false } };

  const monthFilter =
    filter.fromMonth != null && filter.toMonth != null
      ? { gte: filter.fromMonth, lte: filter.toMonth }
      : undefined;

  const result = await prisma.dueAccrualLine.aggregate({
    where: {
      deleted: false,
      accrualRun: {
        organizationId: filter.organizationId,
        propertyId: filter.propertyId,
        year: filter.year,
        ...(monthFilter ? { month: monthFilter } : {}),
        status: DueAccrualStatus.POSTED,
        deleted: false,
      },
      ...unitBlockFilter,
    },
    _sum: {
      amount: true,
      paidAmount: true,
    },
  });

  return {
    totalAccrued: result._sum.amount ?? new Prisma.Decimal(0),
    totalCollected: result._sum.paidAmount ?? new Prisma.Decimal(0),
  };
}

export function computeCollectionRatePercent(
  totalAccrued: Prisma.Decimal,
  totalCollected: Prisma.Decimal,
): string | null {
  if (totalAccrued.lte(0)) {
    return null;
  }
  const rate = totalCollected.div(totalAccrued).mul(100);
  return rate.toFixed(2);
}
