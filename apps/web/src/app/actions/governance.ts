"use server";

import { redirect } from "next/navigation";
import {
  AssemblyAttendanceKind,
  AssemblyNoticeMethod,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getAuditorReportService, getGovernanceService } from "@/lib/services";

export type GovernanceActionState = { error?: string; success?: boolean; meetingId?: string };

function revalidateGovernance(locale: string, propertyId: string, meetingId?: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/governance`, "page");
  if (meetingId) {
    revalidatePath(`/${locale}/admin/properties/${propertyId}/governance/${meetingId}`, "page");
  }
  revalidatePath(`/${locale}/auditor/properties/${propertyId}/governance`, "page");
  if (meetingId) {
    revalidatePath(`/${locale}/auditor/properties/${propertyId}/governance/${meetingId}`, "page");
  }
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

function parseMeetingType(raw: string): GeneralAssemblyMeetingType {
  if (raw === GeneralAssemblyMeetingType.EXTRAORDINARY) {
    return GeneralAssemblyMeetingType.EXTRAORDINARY;
  }
  return GeneralAssemblyMeetingType.ORDINARY;
}

function parseNoticeMethod(raw: string): AssemblyNoticeMethod | null {
  const value = raw.trim();
  if (!value) return null;
  if ((Object.values(AssemblyNoticeMethod) as string[]).includes(value)) {
    return value as AssemblyNoticeMethod;
  }
  return null;
}

function parseAttendanceKind(raw: string): AssemblyAttendanceKind {
  if ((Object.values(AssemblyAttendanceKind) as string[]).includes(raw)) {
    return raw as AssemblyAttendanceKind;
  }
  return AssemblyAttendanceKind.ABSENT;
}

function mapError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "GOVERNANCE_ACTION_FAILED";
}

export async function createMeetingAction(
  locale: string,
  propertyId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const saved = await getGovernanceService().createMeeting({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingDate: String(formData.get("meetingDate") ?? ""),
      meetingType: parseMeetingType(String(formData.get("meetingType") ?? "")),
      title: String(formData.get("title") ?? "") || null,
      linkedReportId: String(formData.get("linkedReportId") ?? "") || null,
      noticeSentAt: String(formData.get("noticeSentAt") ?? "") || null,
      noticeMethod: parseNoticeMethod(String(formData.get("noticeMethod") ?? "")),
      notes: String(formData.get("notes") ?? "") || null,
    });
    revalidateGovernance(locale, propertyId, saved.id);
    return { success: true, meetingId: saved.id };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function updateMeetingAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().updateMeeting({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      meetingDate: String(formData.get("meetingDate") ?? ""),
      meetingType: parseMeetingType(String(formData.get("meetingType") ?? "")),
      title: String(formData.get("title") ?? "") || null,
      linkedReportId: String(formData.get("linkedReportId") ?? "") || null,
      noticeSentAt: String(formData.get("noticeSentAt") ?? "") || null,
      noticeMethod: parseNoticeMethod(String(formData.get("noticeMethod") ?? "")),
      notes: String(formData.get("notes") ?? "") || null,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true, meetingId };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function deleteMeetingAction(
  locale: string,
  propertyId: string,
  meetingId: string,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().deleteMeeting({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
    });
    revalidateGovernance(locale, propertyId);
    return { success: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function addDecisionAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().addDecision({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      topic: String(formData.get("topic") ?? ""),
      outcome: String(formData.get("outcome") ?? ""),
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function deleteDecisionAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  decisionId: string,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().deleteDecision({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      decisionId,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function upsertAttendanceAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().upsertAttendance({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      unitId: String(formData.get("unitId") ?? ""),
      attendanceKind: parseAttendanceKind(String(formData.get("attendanceKind") ?? "")),
      proxyHolderName: String(formData.get("proxyHolderName") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function deleteMeetingFormAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  backHref: string,
): Promise<void> {
  const result = await deleteMeetingAction(locale, propertyId, meetingId);
  if (result.success) {
    redirect(backHref);
  }
}

export async function deleteDecisionFormAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  decisionId: string,
): Promise<void> {
  const result = await deleteDecisionAction(locale, propertyId, meetingId, decisionId);
  if (!result.error) {
    revalidatePath(`/${locale}/admin/properties/${propertyId}/governance/${meetingId}`, "page");
    revalidatePath(`/${locale}/auditor/properties/${propertyId}/governance/${meetingId}`, "page");
  }
}

export async function listApprovedReportsForMeeting(
  organizationId: string,
  propertyId: string,
  year?: number,
) {
  return getAuditorReportService().listApprovedReports({ organizationId, propertyId, year });
}
