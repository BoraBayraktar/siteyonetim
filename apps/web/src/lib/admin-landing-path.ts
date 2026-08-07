import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { isPilotSinglePropertyMode } from "@/lib/admin-property-nav";
import { isStaffRole } from "@/lib/organization-roles";
import { resolveStaffLandingPath } from "@/lib/staff-landing-path";

export { isPilotSinglePropertyMode } from "@/lib/admin-property-nav";

export function resolveAdminLandingPath(
  locale: string,
  propertiesNav: AdminPropertyNavItem[],
  role?: string | null,
): string {
  const base = `/${locale}/admin/properties`;
  if (isStaffRole(role) && propertiesNav.length >= 1) {
    return resolveStaffLandingPath(locale, propertiesNav);
  }
  if (isPilotSinglePropertyMode(propertiesNav)) {
    return `${base}/${propertiesNav[0]!.id}/dashboard`;
  }
  return base;
}
