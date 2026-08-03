"use server";

import {
  AssemblyAttendanceMode,
  AssemblyDecisionOutcome,
  GeneralAssemblyMeetingType,
} from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getGovernanceService } from "@/lib/services";

export type GovernanceActionState = { error?: string; success?: boolean; meetingId?: string };

function revalidateGovernance(locale: string, propertyId: string, meetingId?: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/governance`, "page");
  if (meetingId) {
    revalidatePath(`/${locale}/admin/properties/${propertyId}/governance/${meetingId}`, "page");
    revalidatePath(`/${locale}/auditor/properties/${propertyId}/governance/${meetingId}`, "page");
  }
  revalidatePath(`/${locale}/auditor/properties/${propertyId}/governance`, "page");
}

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

function parseMeetingDate(raw: string) {
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) throw new Error("MEETING_DATE_INVALID");
  return value;
}

function parseOptionalNoticeDate(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = new Date(text);
  if (Number.isNaN(value.getTime())) throw new Error("NOTICE_DATE_INVALID");
  return value;
}

export async function createMeetingAction(
  locale: string,
  propertyId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const linkedRaw = String(formData.get("linkedReportId") ?? "").trim();
    const meeting = await getGovernanceService().createMeeting({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingType: String(formData.get("meetingType") ?? GeneralAssemblyMeetingType.ORDINARY) as GeneralAssemblyMeetingType,
      meetingDate: parseMeetingDate(String(formData.get("meetingDate") ?? "")),
      location: String(formData.get("location") ?? "") || null,
      agendaSummary: String(formData.get("agendaSummary") ?? "") || null,
      noticeSentAt: parseOptionalNoticeDate(formData.get("noticeSentAt")),
      noticeMethod: String(formData.get("noticeMethod") ?? "") || null,
      linkedReportId: linkedRaw || null,
    });
    revalidateGovernance(locale, propertyId, meeting.id);
    return { success: true, meetingId: meeting.id };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function updateMeetingAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const linkedRaw = String(formData.get("linkedReportId") ?? "").trim();
    await getGovernanceService().updateMeeting({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      meetingType: String(formData.get("meetingType") ?? GeneralAssemblyMeetingType.ORDINARY) as GeneralAssemblyMeetingType,
      meetingDate: parseMeetingDate(String(formData.get("meetingDate") ?? "")),
      location: String(formData.get("location") ?? "") || null,
      agendaSummary: String(formData.get("agendaSummary") ?? "") || null,
      noticeSentAt: parseOptionalNoticeDate(formData.get("noticeSentAt")),
      noticeMethod: String(formData.get("noticeMethod") ?? "") || null,
      linkedReportId: linkedRaw || null,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true, meetingId };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function deleteMeetingAction(
  locale: string,
  propertyId: string,
  meetingId: string,
): Promise<GovernanceActionState> {
  const session = await adminContext();
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
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function upsertDecisionAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().upsertDecision({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      decisionId: String(formData.get("decisionId") ?? "") || null,
      subject: String(formData.get("subject") ?? ""),
      outcome: String(formData.get("outcome") ?? AssemblyDecisionOutcome.NOT_VOTED) as AssemblyDecisionOutcome,
      voteFor: formData.get("voteFor") ? Number(formData.get("voteFor")) : null,
      voteAgainst: formData.get("voteAgainst") ? Number(formData.get("voteAgainst")) : null,
      voteAbstain: formData.get("voteAbstain") ? Number(formData.get("voteAbstain")) : null,
      sortOrder: formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true, meetingId };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function deleteDecisionAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  decisionId: string,
): Promise<GovernanceActionState> {
  const session = await adminContext();
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
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function upsertAttendanceAction(
  locale: string,
  propertyId: string,
  meetingId: string,
  _prev: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getGovernanceService().upsertAttendance({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      meetingId,
      unitId: String(formData.get("unitId") ?? ""),
      mode: String(formData.get("mode") ?? AssemblyAttendanceMode.ABSENT) as AssemblyAttendanceMode,
      proxyHolder: String(formData.get("proxyHolder") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    });
    revalidateGovernance(locale, propertyId, meetingId);
    return { success: true, meetingId };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}
