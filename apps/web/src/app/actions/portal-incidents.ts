"use server";

import { IncidentCategory } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isPortalSession, isUnitPortalSession } from "@/lib/auth-context";
import { getIncidentService } from "@/lib/services";

export type PortalIncidentActionState = { error?: string; success?: boolean };

const KNOWN_ERRORS = new Set([
  "UNAUTHORIZED",
  "INCIDENT_TITLE_REQUIRED",
  "INCIDENT_DESCRIPTION_REQUIRED",
  "INCIDENT_UNIT_INVALID",
  "PROPERTY_NOT_FOUND",
  "INCIDENT_PORTAL_DISABLED",
  "INCIDENT_SAVE_FAILED",
]);

export async function createPortalIncidentAction(
  locale: string,
  propertyId: string,
  _prev: PortalIncidentActionState,
  formData: FormData,
): Promise<PortalIncidentActionState> {
  const session = await auth();
  if (!isPortalSession(session)) {
    return { error: "UNAUTHORIZED" };
  }

  if (isUnitPortalSession(session) && session.user.propertyId !== propertyId) {
    return { error: "UNAUTHORIZED" };
  }

  const unitIdRaw = String(formData.get("unitId") ?? "").trim();
  const unitId =
    isUnitPortalSession(session) && session.user.unitId
      ? session.user.unitId
      : unitIdRaw || null;

  try {
    await getIncidentService().createForPortal({
      organizationId: session.user.organizationId,
      propertyId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? IncidentCategory.OTHER) as IncidentCategory,
      unitId,
      reporterUserId: isUnitPortalSession(session) ? null : session.user.id,
      reporterCredentialId: session.user.credentialId ?? null,
      reporterDisplayName: session.user.name ?? "",
    });
    revalidatePath(`/${locale}/portal`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && KNOWN_ERRORS.has(error.message)) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      console.error("createPortalIncidentAction failed:", error.message);
    }
    return { error: "INCIDENT_SAVE_FAILED" };
  }
}
