import { getCacheClient } from "./index";

export const REPORT_ANNUAL_TTL_SECONDS = 900;

export type ReportCacheScope = {
  organizationId: string;
  propertyId: string;
  year: number;
  blockId?: string | null;
  locale?: string;
  fromMonth?: number;
  toMonth?: number;
};

function quarterSuffix(scope: Pick<ReportCacheScope, "fromMonth" | "toMonth">): string {
  if (scope.fromMonth != null && scope.toMonth != null) {
    return `:m${scope.fromMonth}-${scope.toMonth}`;
  }
  return "";
}

export function annualReportCacheKey(scope: ReportCacheScope): string {
  const block = scope.blockId ?? "_";
  const locale = scope.locale ?? "tr";
  return `report:annual:${scope.organizationId}:${scope.propertyId}:${scope.year}${quarterSuffix(scope)}:${block}:${locale}`;
}

export function collectionRateCacheKey(scope: ReportCacheScope): string {
  const block = scope.blockId ?? "_";
  return `report:collection-rate:${scope.organizationId}:${scope.propertyId}:${scope.year}${quarterSuffix(scope)}:${block}`;
}

export function annualReportCachePrefix(organizationId: string, propertyId: string, year: number): string {
  return `report:annual:${organizationId}:${propertyId}:${year}`;
}

export function collectionRateCachePrefix(organizationId: string, propertyId: string, year: number): string {
  return `report:collection-rate:${organizationId}:${propertyId}:${year}`;
}

export async function invalidatePropertyYearReports(
  organizationId: string,
  propertyId: string,
  year: number,
): Promise<void> {
  const cache = getCacheClient();
  await Promise.all([
    cache.delByPrefix(annualReportCachePrefix(organizationId, propertyId, year)),
    cache.delByPrefix(collectionRateCachePrefix(organizationId, propertyId, year)),
  ]);
}

export const MONTHLY_TASKS_TTL_SECONDS = 300;

export function monthlyTasksCacheKey(propertyId: string, year: number, month: number): string {
  return `reporting:monthly-tasks:${propertyId}:${year}:${month}`;
}

export function monthlyWorkflowCacheKey(propertyId: string, year: number, month: number): string {
  return `reporting:monthly-workflow:${propertyId}:${year}:${month}`;
}

export function monthlyTasksCachePrefix(propertyId: string): string {
  return `reporting:monthly-tasks:${propertyId}:`;
}

export function monthlyWorkflowCachePrefix(propertyId: string): string {
  return `reporting:monthly-workflow:${propertyId}:`;
}

export async function invalidatePropertyMonthlyInsights(
  propertyId: string,
  year?: number,
  month?: number,
): Promise<void> {
  const cache = getCacheClient();
  if (year != null && month != null) {
    await Promise.all([
      cache.del(monthlyTasksCacheKey(propertyId, year, month)),
      cache.del(monthlyWorkflowCacheKey(propertyId, year, month)),
    ]);
    return;
  }
  await Promise.all([
    cache.delByPrefix(monthlyTasksCachePrefix(propertyId)),
    cache.delByPrefix(monthlyWorkflowCachePrefix(propertyId)),
  ]);
}
