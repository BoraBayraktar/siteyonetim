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
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";
import { listAdminPropertiesNav } from "@/lib/cached-admin";
import { getPropertyService } from "@/lib/services";

export type StaffPropertyScope = {
  session: Session & { user: { sessionKind: "ADMIN"; organizationId: string; id: string } };
  organizationId: string;
  propertyId: string;
  property: PropertyDto;
  actorUserId: string;
};

export async function requireStaffPropertyScope(
  locale: string,
  propertyId: string,
): Promise<StaffPropertyScope> {
  const session = await getAdminSession();
  if (!isAdminSession(session)) {
    redirect(`/${locale}/login`);
  }

  if (!isStaffRole(session.user.role)) {
    const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
    redirect(resolveAdminLandingPath(locale, propertiesNav, session.user.role));
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
