import { redirect } from "next/navigation";

import { isStaffRole } from "@/lib/auth-context";

export type StaffPropertyAccess = "meters" | "communication";

export function staffMetersPath(locale: string, propertyId: string): string {
  return `/${locale}/admin/properties/${propertyId}/dues?tab=meters`;
}

export function staffPropertyHomePath(locale: string, propertyId: string): string {
  return staffMetersPath(locale, propertyId);
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
  redirect(staffMetersPath(locale, propertyId));
}
