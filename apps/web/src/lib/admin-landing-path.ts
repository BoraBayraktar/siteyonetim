import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";

export function isPilotSinglePropertyMode(propertiesNav: AdminPropertyNavItem[]): boolean {
  return propertiesNav.length === 1;
}

export function resolveAdminLandingPath(locale: string, propertiesNav: AdminPropertyNavItem[]): string {
  const base = `/${locale}/admin/properties`;
  if (isPilotSinglePropertyMode(propertiesNav)) {
    return `${base}/${propertiesNav[0]!.id}/dashboard`;
  }
  return base;
}
