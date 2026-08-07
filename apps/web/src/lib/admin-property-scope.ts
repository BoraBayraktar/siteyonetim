import { notFound, redirect } from "next/navigation";

import type { Session } from "next-auth";

import type { PropertyDto } from "@siteyonetim/property-core";

import { getAdminSession } from "@/lib/cached-admin";
import {
  assertAdminPropertyAccess,
  isAdminSession,
  isStaffRole,
  resolveAdminOrganizationId,
} from "@/lib/auth-context";
import type { StaffPropertyAccess } from "@/lib/staff-admin-access";
import { staffMetersPath } from "@/lib/staff-admin-access";
import { getPropertyService } from "@/lib/services";

export type AdminPropertyScope = {
  session: Session & { user: { sessionKind: "ADMIN"; organizationId: string; id: string } };
  organizationId: string;
  propertyId: string;
  property: PropertyDto;
  actorUserId: string;
};

export async function requireAdminPropertyScope(
  locale: string,
  propertyId: string,
  staffAccess?: StaffPropertyAccess,
): Promise<AdminPropertyScope> {
  const session = await getAdminSession();
  if (!isAdminSession(session)) {
    redirect(`/${locale}/login`);
  }

  if (isStaffRole(session.user.role) && !staffAccess) {
    redirect(staffMetersPath(locale, propertyId));
  }

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    notFound();
  }

  const organizationId = await resolveAdminOrganizationId(session, propertyId);
  if (!organizationId) {
    notFound();
  }

  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  return {
    session,
    organizationId,
    propertyId,
    property,
    actorUserId: session.user.id,
  };
}
