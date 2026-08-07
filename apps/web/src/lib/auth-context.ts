import { OrganizationRole } from "@siteyonetim/db";

import type { Session } from "next-auth";

import { getPropertyService, getPropertyRbacService } from "@/lib/services";

export type PropertyAccessClaim = {
  propertyId: string;
  role: string;
};

export function isSuperAdminSession(session: Session | null | undefined): boolean {
  return Boolean(isAdminSession(session) && session.user.isSuperAdmin === true);
}

export function isAdminSession(session: Session | null | undefined): session is Session & {
  user: { sessionKind: "ADMIN"; organizationId: string; id: string };
} {
  return Boolean(session?.user?.organizationId && session.user.sessionKind === "ADMIN");
}

export function isPortalSession(session: Session | null | undefined): session is Session & {
  user: { sessionKind: "PORTAL"; organizationId: string; id: string };
} {
  return Boolean(session?.user?.organizationId && session.user.sessionKind === "PORTAL");
}

export function isUnitPortalSession(session: Session | null | undefined): boolean {
  return isPortalSession(session) && session.user.portalAuthKind === "UNIT";
}

export function isAuditorRole(role: string | null | undefined): boolean {
  return role === OrganizationRole.AUDITOR;
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === OrganizationRole.STAFF;
}

export function isReadOnlyAdminRole(role: string | null | undefined): boolean {
  return role === OrganizationRole.AUDITOR || role === OrganizationRole.BOARD_MEMBER;
}

export function canAccessReports(session: Session | null | undefined): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  const role = session.user.role;
  if (!role) return true;
  return (
    role === OrganizationRole.ORG_ADMIN ||
    role === OrganizationRole.PROPERTY_MANAGER ||
    role === OrganizationRole.ACCOUNTANT ||
    role === OrganizationRole.AUDITOR ||
    role === OrganizationRole.BOARD_MEMBER ||
    role === OrganizationRole.STAFF
  );
}

export function canMutateAdminData(session: Session | null | undefined): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  if (isStaffRole(session.user.role)) return false;
  return !isReadOnlyAdminRole(session.user.role);
}

export function canRecordMeterReadings(session: Session | null | undefined): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  if (canMutateAdminData(session)) return true;
  return isStaffRole(session.user.role);
}

export function canManageOrgUsers(session: Session | null | undefined): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  return session.user.role === OrganizationRole.ORG_ADMIN;
}

export function canManageAuditorAssignments(session: Session | null | undefined): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  const role = session.user.role;
  return role === OrganizationRole.ORG_ADMIN || role === OrganizationRole.PROPERTY_MANAGER;
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

export function sessionHasPropertyAccess(
  session: Session | null | undefined,
  propertyId: string,
): boolean {
  if (!isAdminSession(session)) return false;
  if (isSuperAdminSession(session)) return true;
  if (session.user.orgWideAccess) return true;
  return (session.user.propertyAccess ?? []).some((entry) => entry.propertyId === propertyId);
}

export async function resolveAdminOrganizationId(
  session: Session | null | undefined,
  propertyId?: string,
): Promise<string | null> {
  if (!isAdminSession(session)) return null;
  if (propertyId && isSuperAdminSession(session)) {
    const property = await getPropertyService().findByIdAny(propertyId);
    return property?.organizationId ?? session.user.organizationId;
  }
  return session.user.organizationId;
}

export async function assertAdminPropertyAccess(
  session: Session | null | undefined,
  propertyId: string,
): Promise<void> {
  if (!isAdminSession(session)) {
    throw new Error("UNAUTHORIZED");
  }

  if (isSuperAdminSession(session)) {
    const property = await getPropertyService().findByIdAny(propertyId);
    if (!property) {
      throw new Error("PROPERTY_ACCESS_DENIED");
    }
    return;
  }

  if (session.user.orgWideAccess || sessionHasPropertyAccess(session, propertyId)) {
    return;
  }

  const allowed = await getPropertyRbacService().hasPropertyAccess({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    organizationRole: session.user.role as OrganizationRole | null,
    propertyId,
  });
  if (!allowed) {
    throw new Error("PROPERTY_ACCESS_DENIED");
  }
}

export async function resolveAccessiblePropertyIds(
  session: Session | null | undefined,
): Promise<string[] | "ALL" | null> {
  if (!isAdminSession(session)) return null;

  if (isSuperAdminSession(session) || session.user.orgWideAccess) {
    return "ALL";
  }

  const cached = session.user.propertyAccess?.map((entry) => entry.propertyId) ?? [];
  if (cached.length > 0) {
    return cached;
  }

  return getPropertyRbacService().resolveAccessiblePropertyIds({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    organizationRole: session.user.role as OrganizationRole | null,
  });
}
