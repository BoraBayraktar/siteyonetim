/** Client-safe role helpers (no server/service imports). */

export function isAuditorRole(role: string | null | undefined): boolean {
  return role === "AUDITOR";
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "STAFF";
}

export function isReadOnlyAdminRole(role: string | null | undefined): boolean {
  return role === "AUDITOR" || role === "BOARD_MEMBER";
}

export function auditorPortalPath(locale: string): string {
  return `/${locale}/auditor`;
}

export function adminLoginRedirectPath(
  locale: string,
  role: string | null | undefined,
  isSuperAdmin?: boolean,
): "auditor" | "admin" {
  if (isSuperAdmin) return "admin";
  return isAuditorRole(role) ? "auditor" : "admin";
}
