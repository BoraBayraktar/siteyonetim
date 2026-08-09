import { invalidatePropertyMonthlyInsights } from "@siteyonetim/platform-cache";

export async function invalidatePropertyMonthlyInsightsForProperty(
  propertyId: string,
  year?: number,
  month?: number,
): Promise<void> {
  await invalidatePropertyMonthlyInsights(propertyId, year, month);
}
