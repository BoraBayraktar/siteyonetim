import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";

export function staffPortalRootPath(locale: string): string {
  return `/${locale}/staff`;
}

export function staffPropertyPath(locale: string, propertyId: string): string {
  return `/${locale}/staff/properties/${propertyId}`;
}

export function staffMetersPath(locale: string, propertyId: string): string {
  return `${staffPropertyPath(locale, propertyId)}/meters`;
}

export function staffAnnouncementsPath(locale: string, propertyId: string): string {
  return `${staffPropertyPath(locale, propertyId)}/announcements`;
}

export function staffDocumentsPath(locale: string, propertyId: string): string {
  return `${staffPropertyPath(locale, propertyId)}/documents`;
}

export function staffResidentsPath(locale: string, propertyId: string): string {
  return `${staffPropertyPath(locale, propertyId)}/residents`;
}

export function staffIncidentsPath(locale: string, propertyId: string): string {
  return `${staffPropertyPath(locale, propertyId)}/incidents`;
}

export function resolveStaffLandingPath(locale: string, propertiesNav: AdminPropertyNavItem[]): string {
  if (propertiesNav.length >= 1) {
    return staffPropertyPath(locale, propertiesNav[0]!.id);
  }
  return staffPortalRootPath(locale);
}
