"use server";

import { AnnouncementAudience } from "@siteyonetim/db";
import { resolveAnnouncementBodyFormat } from "@siteyonetim/comm-announcements";
import { ANNOUNCEMENT_BODY_FORMAT } from "@siteyonetim/comm-announcements/body-format";
import { resolvePublishWindow } from "@siteyonetim/comm-announcements/publish-window";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canMutateAdminData } from "@/lib/auth-context";
import { getAnnouncementImageService, getAnnouncementService } from "@/lib/services";

export type AnnouncementActionState = { error?: string; success?: boolean };

const KNOWN_ANNOUNCEMENT_ERRORS = new Set([
  "UNAUTHORIZED",
  "ANNOUNCEMENT_TITLE_REQUIRED",
  "ANNOUNCEMENT_BODY_REQUIRED",
  "ANNOUNCEMENT_BLOCK_REQUIRED",
  "ANNOUNCEMENT_BLOCK_INVALID",
  "ANNOUNCEMENT_UNITS_REQUIRED",
  "ANNOUNCEMENT_UNITS_INVALID",
  "PROPERTY_NOT_FOUND",
  "ANNOUNCEMENT_PUBLISH_DATES_REQUIRED",
  "ANNOUNCEMENT_PUBLISH_END_BEFORE_START",
]);

function mapAnnouncementActionError(error: Error): string {
  if (KNOWN_ANNOUNCEMENT_ERRORS.has(error.message)) {
    return error.message;
  }
  if (error.message.includes("Unknown argument `bodyFormat`") || error.message.includes("bodyFormat")) {
    return "ANNOUNCEMENT_SCHEMA_OUTDATED";
  }
  return "ANNOUNCEMENT_SAVE_FAILED";
}

async function requireAdminMutate() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  if (!canMutateAdminData(session)) {
    return null;
  }
  return session;
}

export async function createAnnouncementAction(
  locale: string,
  propertyId: string,
  _prev: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const session = await requireAdminMutate();
  if (!session) {
    return { error: "UNAUTHORIZED" };
  }

  const audience = String(formData.get("audience") ?? AnnouncementAudience.PROPERTY_ALL) as AnnouncementAudience;
  const blockId = String(formData.get("blockId") ?? "") || null;
  const unitIdsRaw = String(formData.get("unitIds") ?? "");
  const unitIds = unitIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const { publishStartAt, publishEndAt } = resolvePublishWindow(
      String(formData.get("publishStartAt") ?? ""),
      String(formData.get("publishEndAt") ?? ""),
    );

    await getAnnouncementService().create({
      organizationId: session.user.organizationId,
      propertyId,
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      bodyFormat: resolveAnnouncementBodyFormat(String(formData.get("bodyFormat") ?? ANNOUNCEMENT_BODY_FORMAT.PLAIN)),
      audience,
      blockId,
      unitIds,
      isPinned: formData.get("isPinned") === "on",
      publishStartAt,
      publishEndAt,
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/announcements`, "page");
    revalidatePath(`/${locale}/portal`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      console.error("createAnnouncementAction failed:", error.message);
      return { error: mapAnnouncementActionError(error) };
    }
    throw error;
  }
}

export async function markAnnouncementReadAction(locale: string, announcementId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "PORTAL") {
    return;
  }
  await getAnnouncementService().markRead(session.user.organizationId, announcementId, session.user.id);
  revalidatePath(`/${locale}/portal`, "page");
}

export async function uploadAnnouncementImageAction(
  propertyId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const session = await requireAdminMutate();
  if (!session) {
    return { error: "UNAUTHORIZED" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "ANNOUNCEMENT_IMAGE_REQUIRED" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await getAnnouncementImageService().upload({
      organizationId: session.user.organizationId,
      propertyId,
      fileBuffer: buffer,
      mimeType: file.type || "application/octet-stream",
    });
    return { url: result.url };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
