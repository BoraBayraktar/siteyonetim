"use server";

import { AuditorReportPeriod, OrganizationRole } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { assertAdminPropertyAccess, canManageAuditorAssignments } from "@/lib/auth-context";
import { getAuditorReportService } from "@/lib/services";

export type AuditorAssignmentActionState = {
  error?: string;
  success?: boolean;
};

async function requireAssignmentManager(propertyId: string) {
  const session = await auth();
  if (!canManageAuditorAssignments(session) || !session?.user?.organizationId) {
    throw new Error("UNAUTHORIZED");
  }
  await assertAdminPropertyAccess(session, propertyId);
  return session;
}

function parsePeriod(value: FormDataEntryValue | null): AuditorReportPeriod {
  const raw = String(value ?? AuditorReportPeriod.ANNUAL);
  if (Object.values(AuditorReportPeriod).includes(raw as AuditorReportPeriod)) {
    return raw as AuditorReportPeriod;
  }
  return AuditorReportPeriod.ANNUAL;
}

export async function assignAuditorAction(
  _prev: AuditorAssignmentActionState,
  formData: FormData,
): Promise<AuditorAssignmentActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const session = await requireAssignmentManager(propertyId);

    await getAuditorReportService().assignAuditor({
      organizationId: session.user.organizationId,
      propertyId,
      year: Number(formData.get("year") ?? new Date().getFullYear()),
      period: parsePeriod(formData.get("period")),
      auditorUserId: String(formData.get("auditorUserId") ?? ""),
      assignedByUserId: session.user.id,
      actorOrganizationRole: session.user.role as OrganizationRole,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function revokeAuditorAssignmentAction(
  _prev: AuditorAssignmentActionState,
  formData: FormData,
): Promise<AuditorAssignmentActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const assignmentId = String(formData.get("assignmentId") ?? "");
    const session = await requireAssignmentManager(propertyId);

    await getAuditorReportService().revokeAssignment({
      organizationId: session.user.organizationId,
      propertyId,
      assignmentId,
      actorUserId: session.user.id,
      actorOrganizationRole: session.user.role as OrganizationRole,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
