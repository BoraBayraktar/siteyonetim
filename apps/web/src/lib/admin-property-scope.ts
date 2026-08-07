import { notFound, redirect } from "next/navigation";

import type { Session } from "next-auth";

import type { PropertyDto } from "@siteyonetim/property-core";

import { getAdminSession } from "@/lib/cached-admin";
import { assertAdminPropertyAccess, isAdminSession, resolveAdminOrganizationId } from "@/lib/auth-context";
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
): Promise<AdminPropertyScope> {
  const session = await getAdminSession();
  if (!isAdminSession(session)) {
    redirect(`/${locale}/login`);
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
