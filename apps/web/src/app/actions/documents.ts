"use server";

import { DocumentCategory, DocumentVisibility } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canMutateAdminData, isStaffRole } from "@/lib/auth-context";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { getDocumentService } from "@/lib/services";

export type DocumentActionState = { error?: string; success?: boolean };

function revalidateDocumentPaths(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/documents`, "page");
  revalidatePath(`/${locale}/staff/properties/${propertyId}/documents`, "page");
  revalidatePath(`/${locale}/portal`, "page");
}

export async function createDocumentAction(
  locale: string,
  propertyId: string,
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  const caps = await resolveStaffPropertyCapabilities(
    session,
    session.user.organizationId,
    propertyId,
  );
  if (!canMutateAdminData(session) && !caps.canUploadDocuments) {
    return { error: "UNAUTHORIZED" };
  }

  const isStaffUpload = isStaffRole(session.user.role);
  let visibility = String(formData.get("visibility") ?? DocumentVisibility.ADMIN_ONLY) as DocumentVisibility;
  let category = String(formData.get("category") ?? DocumentCategory.OTHER) as DocumentCategory;

  if (isStaffUpload) {
    visibility = DocumentVisibility.PORTAL_SHARED;
    if (!Object.values(DocumentCategory).includes(category)) {
      category = DocumentCategory.OTHER;
    }
  }

  const unitIdsRaw = String(formData.get("unitIds") ?? "");
  const unitIds = unitIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "DOCUMENT_FILE_REQUIRED" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await getDocumentService().create({
      organizationId: session.user.organizationId,
      propertyId,
      title: String(formData.get("title") ?? ""),
      category,
      visibility,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBuffer: buffer,
      unitIds,
      actorUserId: session.user.id,
    });
    revalidateDocumentPaths(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
