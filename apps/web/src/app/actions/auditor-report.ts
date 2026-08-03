"use server";

import { AuditorDischargeRecommendation, OrganizationRole } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  assertAdminPropertyAccess,
  canManageAuditorAssignments,
  isAuditorRole,
} from "@/lib/auth-context";
import { getAuditorReportService } from "@/lib/services";

export type AuditorReportActionState = {
  error?: string;
  success?: boolean;
};

async function requireAuditor(propertyId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || !isAuditorRole(session.user.role)) {
    throw new Error("UNAUTHORIZED");
  }
  await assertAdminPropertyAccess(session, propertyId);
  return session;
}

async function requireAssignmentManager(propertyId: string) {
  const session = await auth();
  if (!canManageAuditorAssignments(session) || !session?.user?.organizationId) {
    throw new Error("UNAUTHORIZED");
  }
  await assertAdminPropertyAccess(session, propertyId);
  return session;
}

function parseDischarge(value: FormDataEntryValue | null): AuditorDischargeRecommendation | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (Object.values(AuditorDischargeRecommendation).includes(raw as AuditorDischargeRecommendation)) {
    return raw as AuditorDischargeRecommendation;
  }
  return null;
}

export async function saveAuditorReportDraftAction(
  _prev: AuditorReportActionState,
  formData: FormData,
): Promise<AuditorReportActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const session = await requireAuditor(propertyId);

    await getAuditorReportService().saveDraft({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      auditorUserId: session.user.id,
      findingsHtml: String(formData.get("findingsHtml") ?? ""),
      opinionHtml: String(formData.get("opinionHtml") ?? ""),
      dischargeRecommendation: parseDischarge(formData.get("dischargeRecommendation")),
    });

    revalidatePath(`/${locale}/auditor/properties/${propertyId}/reports/audit`, "layout");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function submitAuditorReportAction(
  _prev: AuditorReportActionState,
  formData: FormData,
): Promise<AuditorReportActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const session = await requireAuditor(propertyId);
    const service = getAuditorReportService();

    await service.saveDraft({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      auditorUserId: session.user.id,
      findingsHtml: String(formData.get("findingsHtml") ?? ""),
      opinionHtml: String(formData.get("opinionHtml") ?? ""),
      dischargeRecommendation: parseDischarge(formData.get("dischargeRecommendation")),
    });

    await service.submitForReview({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      auditorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/auditor/properties/${propertyId}/reports/audit`, "layout");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function approveAuditorReportAction(
  _prev: AuditorReportActionState,
  formData: FormData,
): Promise<AuditorReportActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const session = await requireAssignmentManager(propertyId);

    await getAuditorReportService().approve({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      actorUserId: session.user.id,
      actorOrganizationRole: session.user.role as OrganizationRole,
      locale,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/documents`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function reopenAuditorReportAction(
  _prev: AuditorReportActionState,
  formData: FormData,
): Promise<AuditorReportActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const reason = String(formData.get("reason") ?? "");
    const session = await requireAssignmentManager(propertyId);

    await getAuditorReportService().reopen({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      actorUserId: session.user.id,
      actorOrganizationRole: session.user.role as OrganizationRole,
      reason,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports/audit/${reportId}`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function archiveAuditorReportAction(
  _prev: AuditorReportActionState,
  formData: FormData,
): Promise<AuditorReportActionState> {
  try {
    const locale = String(formData.get("locale") ?? "tr");
    const propertyId = String(formData.get("propertyId") ?? "");
    const reportId = String(formData.get("reportId") ?? "");
    const session = await requireAssignmentManager(propertyId);

    await getAuditorReportService().archive({
      organizationId: session.user.organizationId,
      propertyId,
      reportId,
      actorUserId: session.user.id,
      actorOrganizationRole: session.user.role as OrganizationRole,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports/audit/${reportId}`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
