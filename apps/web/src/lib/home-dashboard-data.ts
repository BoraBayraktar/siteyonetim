import { LedgerEntryType } from "@siteyonetim/db";
import type { LedgerEntryDto } from "@siteyonetim/finance-core";
import type { PropertyDashboardDto } from "@siteyonetim/reporting-standard";

import {
  getFinanceService,
  getPartyService,
  getPropertyService,
  getReportingService,
} from "@/lib/services";

export type HomeDashboardActivity = {
  id: string;
  label: string;
  amount: string;
  tone: "success" | "muted" | "primary";
};

export type HomeDashboardSnapshot = {
  propertyId: string;
  propertyName: string;
  unitCount: number;
  occupiedUnitCount: number;
  memberCount: number;
  dashboard: PropertyDashboardDto;
  collectionRate: number | null;
  monthlyCollectionTrend: Array<{ year: number; month: number; amount: string }>;
  recentActivities: HomeDashboardActivity[];
};

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function collectionRate(accrued: string, collected: string): number | null {
  const accruedValue = Number(accrued);
  const collectedValue = Number(collected);
  if (!Number.isFinite(accruedValue) || accruedValue <= 0) {
    return null;
  }
  return Math.round((collectedValue / accruedValue) * 1000) / 10;
}

function mapLedgerActivities(entries: LedgerEntryDto[], locale: string): HomeDashboardActivity[] {
  const incomeLabel = locale === "tr" ? "Gelir" : "Income";
  const expenseLabel = locale === "tr" ? "Gider" : "Expense";

  return entries.map((entry) => ({
    id: entry.id,
    label:
      entry.description?.trim() ||
      `${entry.entryType === LedgerEntryType.INCOME ? incomeLabel : expenseLabel} · ${entry.categoryName}`,
    amount: entry.amount,
    tone: entry.entryType === LedgerEntryType.INCOME ? "success" : "muted",
  }));
}

export async function getHomeDashboardSnapshot(locale: string): Promise<HomeDashboardSnapshot | null> {
  try {
    const property = await getPropertyService().getShowcaseProperty();
    if (!property) {
      return null;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const { organizationId, id: propertyId } = property;

    const reporting = getReportingService();
    const finance = getFinanceService();
    const filter = { organizationId, propertyId, year, month, locale };

    const monthOffsets = Array.from({ length: 12 }, (_, index) => index - 11);
    const trendFilters = monthOffsets.map((offset) => ({
      ...filter,
      ...shiftMonth(year, month, offset),
    }));

    const [dashboard, setup, membersPage, recentLedgerPage, ...monthlyCollections] = await Promise.all([
      reporting.propertyDashboard(filter),
      reporting.propertySetupStatus(organizationId, propertyId),
      getPartyService().list({ organizationId, propertyId, page: 1, pageSize: 1 }),
      finance.listLedger({ organizationId, propertyId, page: 1, pageSize: 3 }),
      ...trendFilters.map((monthFilter) => reporting.dueCollection(monthFilter)),
    ]);

    return {
      propertyId,
      propertyName: property.name,
      unitCount: setup.steps.find((step) => step.id === "UNITS")?.current ?? property.unitCount,
      occupiedUnitCount: setup.steps.find((step) => step.id === "PARTIES_OCCUPANCY")?.current ?? 0,
      memberCount: membersPage.total,
      dashboard,
      collectionRate: collectionRate(dashboard.monthlyAccrued, dashboard.monthlyCollected),
      monthlyCollectionTrend: trendFilters.map((monthFilter, index) => ({
        year: monthFilter.year,
        month: monthFilter.month,
        amount: monthlyCollections[index]?.totalCollected ?? "0",
      })),
      recentActivities: mapLedgerActivities(recentLedgerPage.items, locale),
    };
  } catch {
    return null;
  }
}
