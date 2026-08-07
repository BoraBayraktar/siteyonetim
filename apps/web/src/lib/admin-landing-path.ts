import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { isStaffRole } from "@/lib/auth-context";

export function isPilotSinglePropertyMode(propertiesNav: AdminPropertyNavItem[]): boolean {
  return propertiesNav.length === 1;
}

export function resolveAdminLandingPath(
  locale: string,
  propertiesNav: AdminPropertyNavItem[],
  role?: string | null,
): string {
  const base = `/${locale}/admin/properties`;
  if (isStaffRole(role) && propertiesNav.length >= 1) {
    return `${base}/${propertiesNav[0]!.id}/dues?tab=meters`;
  }
  if (isPilotSinglePropertyMode(propertiesNav)) {
    return `${base}/${propertiesNav[0]!.id}/dashboard`;
  }
  return base;
}
