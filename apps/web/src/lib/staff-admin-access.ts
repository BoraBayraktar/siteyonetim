import { redirect } from "next/navigation";

import { isStaffRole } from "@/lib/organization-roles";
import {
  resolveStaffLandingPath,
  staffAnnouncementsPath,
  staffDocumentsPath,
  staffIncidentsPath,
  staffMetersPath,
  staffPropertyPath,
} from "@/lib/staff-landing-path";

export type StaffPropertyAccess = "meters" | "communication";

export { staffAnnouncementsPath, staffDocumentsPath, staffIncidentsPath, staffMetersPath, staffPropertyPath };

export function staffPropertyHomePath(locale: string, propertyId: string): string {
  return staffPropertyPath(locale, propertyId);
}

export function redirectStaffFromOrgAdmin(locale: string, role: string | null | undefined, fallbackPath: string) {
  if (isStaffRole(role)) {
    redirect(fallbackPath);
  }
}

export function resolveStaffPropertyAccess(
  locale: string,
  propertyId: string,
  role: string | null | undefined,
  allowed?: StaffPropertyAccess,
) {
  if (!isStaffRole(role)) {
    return;
  }
  if (allowed) {
    return;
  }
  redirect(staffPropertyHomePath(locale, propertyId));
}

export function resolveStaffOrgLandingPath(
  locale: string,
  propertiesNav: { id: string; name: string }[],
): string {
  return resolveStaffLandingPath(locale, propertiesNav);
}
