import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  assertAdminPropertyAccess,
  canMutateAdminData,
  canRecordMeterReadings,
  isAdminSession,
  isSuperAdminSession,
  resolveAdminOrganizationId,
} from "@/lib/auth-context";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";

export type AdminActionContext = {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
};

async function buildPropertyContext(
  session: Session & { user: { sessionKind: "ADMIN"; organizationId: string; id: string } },
  propertyId: string,
): Promise<AdminActionContext | null> {
  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    return null;
  }

  const organizationId = await resolveAdminOrganizationId(session, propertyId);
  if (!organizationId) {
    return null;
  }

  return {
    organizationId,
    propertyId,
    actorUserId: session.user.id,
  };
}

export async function adminPropertyActionContext(propertyId: string): Promise<AdminActionContext | null> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return null;
  }

  return buildPropertyContext(session, propertyId);
}

export async function adminPropertyMutateContext(propertyId: string): Promise<AdminActionContext | null> {
  const session = await auth();
  if (!isAdminSession(session) || !canMutateAdminData(session)) {
    return null;
  }

  return buildPropertyContext(session, propertyId);
}

export async function adminPropertyMeterReadingContext(propertyId: string): Promise<AdminActionContext | null> {
  const session = await auth();
  if (!isAdminSession(session) || !canRecordMeterReadings(session)) {
    return null;
  }

  return buildPropertyContext(session, propertyId);
}

export async function adminPropertyIncidentContext(propertyId: string): Promise<AdminActionContext | null> {
  const session = await auth();
  if (!isAdminSession(session)) {
    return null;
  }

  const ctx = await buildPropertyContext(session, propertyId);
  if (!ctx) {
    return null;
  }

  if (isSuperAdminSession(session) || canMutateAdminData(session)) {
    return ctx;
  }

  const caps = await resolveStaffPropertyCapabilities(session, ctx.organizationId, propertyId);
  if (!caps.canManageIncidents) {
    return null;
  }

  return ctx;
}
