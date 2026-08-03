"use server";

import { HeatingSystemType, HotWaterSystemType } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getPropertySettingsService } from "@/lib/services";

export type UtilityActionState = { error?: string; success?: boolean };
export type WhatsAppActionState = { error?: string; success?: boolean };
export type ReportLetterheadActionState = { error?: string; success?: boolean };

export async function upsertUtilityProfileAction(
  locale: string,
  propertyId: string,
  _prev: UtilityActionState,
  formData: FormData,
): Promise<UtilityActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getPropertySettingsService().upsertUtilityProfile({
      organizationId: session.user.organizationId,
      propertyId,
      heatingSystem: String(formData.get("heatingSystem") ?? HeatingSystemType.NONE) as HeatingSystemType,
      hotWaterSystem: String(formData.get("hotWaterSystem") ?? HotWaterSystemType.NONE) as HotWaterSystemType,
      notes: String(formData.get("notes") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function upsertWhatsAppProfileAction(
  locale: string,
  propertyId: string,
  _prev: WhatsAppActionState,
  formData: FormData,
): Promise<WhatsAppActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getPropertySettingsService().upsertWhatsAppProfile({
      organizationId: session.user.organizationId,
      propertyId,
      enabled: formData.get("enabled") === "on",
      phoneNumberId: String(formData.get("phoneNumberId") ?? "") || null,
      templateName: String(formData.get("templateName") ?? "siteyonetim_duyuru"),
      templateLanguage: String(formData.get("templateLanguage") ?? "tr"),
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/notifications`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PROPERTY_NOT_FOUND" || error.message === "WHATSAPP_TEMPLATE_REQUIRED") {
        return { error: error.message };
      }
    }
    throw error;
  }
}

export async function upsertReportLetterheadProfileAction(
  locale: string,
  propertyId: string,
  _prev: ReportLetterheadActionState,
  formData: FormData,
): Promise<ReportLetterheadActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getPropertySettingsService().upsertReportLetterheadProfile({
      organizationId: session.user.organizationId,
      propertyId,
      subtitleLine: String(formData.get("subtitleLine") ?? "") || null,
      legalNoticeTr: String(formData.get("legalNoticeTr") ?? "") || null,
      legalNoticeEn: String(formData.get("legalNoticeEn") ?? "") || null,
      documentRefPrefixTr: String(formData.get("documentRefPrefixTr") ?? "") || null,
      documentRefPrefixEn: String(formData.get("documentRefPrefixEn") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}
