import { invalidateCachePrefix } from "@siteyonetim/platform-cache";

export function auditorAssignmentCachePrefix(propertyId: string, year: number): string {
  return `auditor:assignment:${propertyId}:${year}:`;
}

export async function invalidateAuditorAssignmentCache(propertyId: string, year: number): Promise<void> {
  await invalidateCachePrefix(auditorAssignmentCachePrefix(propertyId, year));
}
